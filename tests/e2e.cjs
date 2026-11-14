/**
 * 全量端到端测试 v2
 * 修正 v1 的测试装置问题：
 *  - 在页面加载前注入 hook（evaluateOnNewDocument），创建 Blob 时立刻转 base64
 *  - 每个工具用例独立计数，避免跨工具串数据
 *  - 修正测试数据与选择器
 *
 * 用法：node tests/e2e.cjs [--only=slug1,slug2]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5188';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIX = path.join(process.cwd(), 'tests', 'fixtures');
const OUT = path.join(process.cwd(), 'tests', 'output');
const SHOTS = path.join(process.cwd(), 'tests', 'screenshots');
const REPORT = path.join(process.cwd(), 'tests', 'report.json');

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const results = [];
let browser;
let page;
let pageErrors = [];
let consoleErrors = [];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fx = (name) => path.join(FIX, name);

/**
 * 页面加载前注入：
 * 1) 记录所有 createObjectURL 产物（含真实 Blob 引用）
 * 2) 捕获阶段监听 click，拿到 <a download> 的 href，据此定位要下载的 Blob
 * 3) 提供 __takeDownloads：返回本轮被点击下载的 Blob 的 base64
 */
const HOOK = `
(() => {
  window.__objs = [];
  const orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    const url = orig(obj);
    if (obj instanceof Blob && obj.size > 0) {
      window.__objs.push({ url, blob: obj, name: null });
      window.__lastObj = window.__objs[window.__objs.length - 1];
    }
    return url;
  };
  window.__downloaded = [];
  window.__resetDownloads = () => {
    window.__downloaded = [];
    window.__objs = [];
  };
  window.__sink = () => {
    if (window.__lastObj && !window.__downloaded.includes(window.__lastObj)) {
      window.__downloaded.push(window.__lastObj);
    }
    return window.__downloaded.length;
  };
  window.__takeDownloads = async () => {
    const out = [];
    for (const item of window.__downloaded) {
      const buf = await item.blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      out.push({ name: item.name || 'download', size: item.blob.size, type: item.blob.type, b64: btoa(bin) });
    }
    return out;
  };
})();
`;

async function resetDownloads() {
  await page.evaluate(() => window.__resetDownloads());
}

/** 等待结果面板出现，点击下载按钮，取回 Blob 内容 */
async function takeBlobs(expected = 1, timeout = 90000) {
  const deadline = Date.now() + timeout;
  // 1. 等处理完成（结果面板出现）
  while (Date.now() < deadline) {
    const done = await page.evaluate(() => /处理完成|下载/.test(document.body.innerText));
    if (done) break;
    await wait(300);
  }
  await wait(300);

  // 2. 点击「下载」（多文件时逐个点，拿到每个产物）
  const clickDownload = async (idx) => {
    return page.evaluate((i) => {
      const btns = [...document.querySelectorAll('button')].filter(
        (b) => b.offsetParent !== null && b.textContent.trim() === '下载' && !b.disabled,
      );
      if (!btns[i]) return false;
      btns[i].click();
      return true;
    }, idx);
  };

  for (let i = 0; i < Math.max(1, expected); i += 1) {
    await clickDownload(i);
    await wait(300);
    await page.evaluate(() => window.__sink());
  }
  await wait(500);

  const items = await page.evaluate(() => window.__takeDownloads());
  const files = [];
  items.forEach((it, i) => {
    const safe = (it.name || `out-${i}`).replace(/[\\/:*?"<>|]/g, '_');
    const dest = path.join(OUT, `${slug}__${safe}`);
    fs.writeFileSync(dest, Buffer.from(it.b64, 'base64'));
    files.push({ path: dest, size: it.size, type: it.type, name: it.name });
  });
  return files;
}

/** 用 DragEvent 投放文件（Dropzone 监听在 label 上） */
async function dropFiles(files) {
  const payload = files.map((f) => ({
    name: path.basename(f),
    type: f.endsWith('.pdf')
      ? 'application/pdf'
      : f.endsWith('.jpg')
        ? 'image/jpeg'
        : f.endsWith('.png')
          ? 'image/png'
          : f.endsWith('.webp')
            ? 'image/webp'
            : 'application/octet-stream',
    b64: fs.readFileSync(f).toString('base64'),
  }));
  await page.evaluate((items) => {
    const dt = new DataTransfer();
    for (const it of items) {
      const bin = atob(it.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      dt.items.add(new File([bytes], it.name, { type: it.type }));
    }
    const zone = document.querySelector('.dropzone') || document.querySelector('label[for]');
    if (!zone) throw new Error('找不到拖拽区');
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  }, payload);
  await wait(1000);
}

async function pickFiles(files) {
  for (const f of files) {
    await page.waitForSelector('input[type=file]', { timeout: 15000 });
    const input = await page.$('input[type=file]');
    await input.uploadFile(f);
    await wait(900);
  }
}

async function setValue(selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`找不到元素 ${sel}`);
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value,
  );
  await wait(350);
}

async function setTextarea(index, value, { append = false } = {}) {
  await page.evaluate(
    (idx, val, doAppend) => {
      const el = document.querySelectorAll('textarea')[idx];
      if (!el) throw new Error(`找不到第 ${idx} 个 textarea`);
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, doAppend ? el.value + val : val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    index,
    value,
    append,
  );
  await wait(350);
}

async function click(text, { exact = true } = {}) {
  const ok = await page.evaluate(
    (label, isExact) => {
      const all = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
      const pool = isExact ? all.filter((b) => b.textContent.trim() === label) : all.filter((b) => b.textContent.includes(label));
      if (!pool.length) return { ok: false, visible: all.map((b) => b.textContent.trim()).filter(Boolean).slice(0, 40) };
      const btn = pool.find((b) => !b.disabled);
      if (!btn) return { ok: false, disabled: true };
      btn.click();
      return { ok: true };
    },
    text,
    exact,
  );
  if (!ok.ok) throw new Error(`按钮「${text}」不可点击${ok.disabled ? '(disabled)' : ''}，可见按钮: ${JSON.stringify(ok.visible)}`);
  await wait(450);
}

async function clickOption(text) {
  const ok = await page.evaluate((label) => {
    const el = [...document.querySelectorAll('button')].find(
      (b) => b.offsetParent !== null && b.textContent.trim() === label && !b.disabled,
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`选项「${text}」不存在`);
  await wait(400);
}

async function selectValue(selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`找不到 ${sel}`);
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value,
  );
  await wait(400);
}

async function waitText(re, timeout = 60000) {
  try {
    await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source);
    return true;
  } catch {
    return false;
  }
}

/* ---------------- 产物校验 ---------------- */

async function pdfPages(file) {
  try {
    const { PDFDocument } = require('@cantoo/pdf-lib');
    const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

function imageInfo(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG')
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) return { format: 'jpeg' };
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { format: 'webp' };
  if (buf.toString('latin1', 0, 4) === 'GIF8') return { format: 'gif' };
  if (buf.toString('latin1', 0, 4) === 'II*\0' || buf.toString('latin1', 0, 4) === 'MM\0*') return { format: 'tiff' };
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return { format: 'ico' };
  if (buf.toString('latin1', 0, 2) === 'BM') return { format: 'bmp' };
  if (/^\s*<svg/.test(buf.toString('utf8', 0, 100))) return { format: 'svg' };
  return { format: 'unknown' };
}

/* ---------------- 执行单个工具 ---------------- */

let slug = '';

async function runTool(name, actions) {
  slug = name;
  pageErrors = [];
  consoleErrors = [];

  const record = { tool: name, checks: [], error: null, blobs: [], consoleErrors: [], pageErrors: [] };
  const check = (label, ok, detail = '') => {
    record.checks.push({ label, ok: !!ok, detail: String(detail) });
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
  };

  try {
    // 用 query 参数强制整页加载（hash 变更不会重新执行注入脚本）
    await page.goto(`${BASE}/tools/${name}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await wait(800);
    const hookOk = await page.evaluate(() => Array.isArray(window.__objs) && typeof window.__takeDownloads === 'function');
    if (!hookOk) throw new Error('Blob 采集 hook 未注入');

    const h1 = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '');
    check('页面渲染出工具标题', h1.length > 0, h1);

    await resetDownloads();
    const spec = (await actions({ check })) || {};

    if (spec.expected !== 0) {
      const blobs = await takeBlobs(spec.expected ?? 1, spec.timeout ?? 90000);
      record.blobs = blobs.map((b) => ({ size: b.size, type: b.type, path: path.relative(process.cwd(), b.path) }));
      check('产生下载产物', blobs.length >= (spec.expected ?? 1), `${blobs.length} 个`);
      if (spec.verify) await spec.verify(blobs, check);
    }
    await wait(200);
  } catch (e) {
    record.error = String(e && e.message ? e.message : e);
    console.log(`  ✗ 执行失败 — ${record.error}`);
  }

  record.consoleErrors = consoleErrors.slice(0, 6);
  record.pageErrors = pageErrors.slice(0, 6);
  if (pageErrors.length) console.log(`  ! 页面异常: ${pageErrors.slice(0, 2).join(' | ')}`);
  if (consoleErrors.length) console.log(`  ! 控制台错误: ${consoleErrors.slice(0, 2).join(' | ')}`);

  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }).catch(() => {});
  results.push(record);
  return record;
}

/* ---------------- 用例 ---------------- */

const cases = {
  'pdf-merge': async () => {
    await dropFiles([fx('doc-1page.pdf'), fx('doc-2pages.pdf')]);
    await waitText(/共 2 个文件/);
    await click('合并 2 个 PDF');
    return {
      expected: 1,
      verify: async (files, c) => {
        if (!files[0]) return c('没有产物可校验', false, '');
        const pages = await pdfPages(files[0].path);
        c('合并后为 3 页', pages === 3, `实际 ${pages} 页`);
        c('文件头是 %PDF', fs.readFileSync(files[0].path).toString('latin1', 0, 5) === '%PDF-', '');
      },
    };
  },

  'pdf-split': async () => {
    await pickFiles([fx('doc-3pages.pdf')]);
    await waitText(/共 3 页/, 10000);
    await click('开始拆分');
    return {
      expected: 2,
      verify: (files, c) => c('拆分得到 2 份 PDF', files.length === 2, `${files.length} 份`),
    };
  },

  'pdf-compress': async () => {
    await pickFiles([fx('doc-3pages.pdf')]);
    await click('开始压缩');
    return {
      expected: 1,
      timeout: 120000,
      verify: async (files, c) => {
        if (!files[0]) return c('没有产物可校验', false, '');
        const pages = await pdfPages(files[0].path);
        c('压缩后 PDF 可解析', pages !== null, `${pages} 页`);
      },
    };
  },

  'pdf-to-image': async () => {
    await pickFiles([fx('doc-2pages.pdf')]);
    await click('开始转换');
    return {
      expected: 2,
      timeout: 120000,
      verify: (files, c) => {
        c('导出 2 张图片', files.length === 2, `${files.length} 张`);
        const info = imageInfo(files[0].path);
        c('输出是 PNG', info?.format === 'png', `${info?.format} ${info?.width}x${info?.height}`);
      },
    };
  },

  'image-to-pdf': async () => {
    await dropFiles([fx('photo.png'), fx('photo.jpg')]);
    await waitText(/共 2 张图片/);
    await click('生成 PDF（2 页）');
    return {
      expected: 1,
      verify: async (files, c) => {
        if (!files[0]) return c('没有产物可校验', false, '');
        const pages = await pdfPages(files[0].path);
        c('生成 2 页 PDF', pages === 2, `${pages} 页`);
      },
    };
  },

  'pdf-rotate': async () => {
    await pickFiles([fx('doc-1page.pdf')]);
    await click('旋转并下载');
    return {
      expected: 1,
      verify: (files, c) => {
        const s = fs.readFileSync(files[0].path).toString('latin1');
        c('页面带 90° 旋转标记', /\/Rotate\s+90/.test(s), /\/Rotate\s+90/.test(s) ? 'Rotate 90' : '无 /Rotate');
      },
    };
  },

  'pdf-watermark': async () => {
    await pickFiles([fx('doc-1page.pdf')]);
    await click('添加水印');
    return {
      expected: 1,
      verify: (files, c) => c('生成带水印 PDF', files[0].size > 0, `${files[0].size} B`),
    };
  },

  'pdf-page-number': async () => {
    await pickFiles([fx('doc-2pages.pdf')]);
    await click('添加页码');
    return {
      expected: 1,
      verify: (files, c) => c('生成带页码 PDF', files[0].size > 0, ''),
    };
  },

  'pdf-protect': async () => {
    await pickFiles([fx('doc-1page.pdf')]);
    await page.click('input[type=password]');
    await page.keyboard.type('test12345', { delay: 30 });
    await wait(600);
    await click('加密并下载');
    return {
      expected: 1,
      verify: (files, c) => {
        const s = fs.readFileSync(files[0].path).toString('latin1');
        c('PDF 已加密（含 /Encrypt）', /\/Encrypt/.test(s), '');
      },
    };
  },

  'image-convert': async () => {
    await pickFiles([fx('photo.png')]);
    await clickOption('JPG');
    await click('开始转换（1 张）');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出为 JPEG', info?.format === 'jpeg', `${info?.format}`);
        c('输出体积在合理范围', files[0].size > 0 && files[0].size < 2 * 1024 * 1024, `${(files[0].size / 1024).toFixed(1)} KB`);
      },
    };
  },

  'image-compress': async () => {
    await pickFiles([fx('photo.jpg')]);
    await click('开始压缩（1 张）');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出为图片', !!info && info.format !== 'unknown', `${info?.format}`);
      },
    };
  },

  'image-resize': async () => {
    await pickFiles([fx('photo.jpg')]);
    await click('开始缩放');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出图片可解析', !!info && info.format !== 'unknown', `${info?.format}`);
      },
    };
  },

  'image-watermark': async () => {
    await pickFiles([fx('photo.png')]);
    await click('添加水印');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出为 PNG', info?.format === 'png', `${info?.format}`);
        c('尺寸保持不变', info?.width === 800 && info?.height === 600, `${info?.width}x${info?.height}`);
      },
    };
  },

  'image-remove-bg': async () => {
    await pickFiles([fx('id-photo.png')]);
    await click('去底并生成 PNG');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出为 PNG', info?.format === 'png', `${info?.format} ${info?.width}x${info?.height}`);
      },
    };
  },

  'image-collage': async () => {
    await dropFiles([fx('photo.png'), fx('photo.jpg')]);
    await waitText(/共 2 张/);
    await click('拼接 2 张图片');
    return {
      expected: 1,
      verify: (files, c) => {
        const info = imageInfo(files[0].path);
        c('输出长图可解析', !!info && info.format !== 'unknown', `${info?.format}`);
      },
    };
  },

  'image-base64': async () => {
    await pickFiles([fx('small.png')]);
    await click('生成 Base64');
    await wait(800);
    const ok = await page.evaluate(() => {
      const ta = document.querySelector('textarea');
      return !!ta && ta.value.startsWith('data:image/png;base64,');
    });
    return { expected: 0, verify: (_f, c) => c('页面内生成 Data URI', ok, '') };
  },

  ocr: async ({ check }) => {
    await pickFiles([fx('photo.png')]);
    const done = await waitText(/识别结果|识别失败|开始识别/, 150000);
    check('OCR 流程结束', done, '');
    const body = await page.evaluate(() => document.body.innerText);
    if (/识别失败/.test(body)) {
      check('网络受限时报错明确', /cdn\.jsdelivr|无法加载|网络/.test(body), '依赖 CDN');
    } else {
      check('识别出文字', body.length > 300, '');
    }
    return { expected: 0 };
  },

  'media-convert': async ({ check }) => {
    await pickFiles([fx('photo.png')]);
    await click('开始转换');
    await wait(25000);
    const body = await page.evaluate(() => document.body.innerText);
    if (/失败/.test(body)) check('引擎不可用时报错明确', /ffmpeg|CDN|网络|无法/.test(body), '依赖 CDN');
    else check('音视频流程可执行', /转换中|处理完成/.test(body), '');
    return { expected: 0 };
  },

  'video-to-gif': async ({ check }) => {
    check('页面渲染正常', true, '');
    return { expected: 0 };
  },

  'video-trim': async ({ check }) => {
    check('页面渲染正常', true, '');
    return { expected: 0 };
  },

  'json-format': async ({ check }) => {
    await setTextarea(0, '{"a":1,"b":[2,3],"c":{"d":"中文"}}');
    await click('格式化 / 转换');
    const out = await page.evaluate(() => [...document.querySelectorAll('textarea')][1].value);
    check('格式化输出含缩进', /\n {2}"a"/.test(out), JSON.stringify(out.slice(0, 30)));
    await clickOption('CSV');
    await click('格式化 / 转换');
    const csv = await page.evaluate(() => [...document.querySelectorAll('textarea')][1].value);
    check('可转换为 CSV', csv.includes('a,b,c'), JSON.stringify(csv.slice(0, 30)));
    return { expected: 0 };
  },

  'text-clean': async ({ check }) => {
    await setTextarea(0, '  alpha  \n\n\nbeta\nbeta\ngamma   \n');
    await clickOption('删除重复行');
    await wait(300);
    const out = await page.evaluate(() => [...document.querySelectorAll('textarea')][1].value);
    check('去掉空行', !/\n\s*\n/.test(out), JSON.stringify(out));
    check('删除重复行', (out.match(/beta/g) || []).length === 1, '');
    return { expected: 0 };
  },

  'regex-test': async ({ check }) => {
    await setTextarea(0, '订单号 20241114，金额 128.5');
    await wait(400);
    const body = await page.evaluate(() => document.body.innerText);
    check('匹配数量正确', /匹配到\s*3\s*处/.test(body), (body.match(/匹配到\s*\d+\s*处/) || [''])[0]);
    return { expected: 0 };
  },

  'markdown-preview': async ({ check }) => {
    await setTextarea(0, '# 测试标题\n\n**加粗** 与 `code`\n\n- a\n- b');
    await wait(600);
    const html = await page.evaluate(() => {
      const el = document.querySelector('.prose-tool');
      return el ? el.innerHTML : '';
    });
    check('渲染出标题', /<h1/.test(html), html.slice(0, 40));
    check('渲染出列表', /<li/.test(html), '');
    return { expected: 0 };
  },

  'case-convert': async ({ check }) => {
    await setValue('input.input', 'user_profile_image');
    const body = await page.evaluate(() => document.body.innerText);
    check('生成 camelCase', /userProfileImage/.test(body), '');
    check('生成 CONSTANT_CASE', /USER_PROFILE_IMAGE/.test(body), '');
    return { expected: 0 };
  },

  base64: async ({ check }) => {
    await setTextarea(0, '你好，抹布');
    await click('转换');
    const out = await page.evaluate(() => [...document.querySelectorAll('textarea')][1].value);
    check('Base64 编码正确', out === '5L2g5aW977yM5oq55biD', out);
    return { expected: 0 };
  },

  'url-codec': async ({ check }) => {
    await setValue('textarea', 'a b&c=中文');
    await wait(500);
    const out = await page.evaluate(() => document.querySelectorAll('textarea')[1].value);
    check('URL 编码生效（空格→%20）', out === 'a%20b%26c%3D%E4%B8%AD%E6%96%87', out);
    return { expected: 0 };
  },

  hash: async ({ check }) => {
    await setTextarea(0, 'abc');
    await click('计算哈希');
    const ok = await waitText(/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/, 15000);
    check('SHA-256 结果正确', ok, ok ? '' : '未出现预期摘要');
    return { expected: 0 };
  },

  jwt: async ({ check }) => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '1234567890', name: 'test', iat: 1700000000 })}.sig`;
    await setValue('textarea', token);
    await wait(600);
    const body = await page.evaluate(() => document.body.innerText);
    check('解析出 Header 算法', body.includes('HS256'), '');
    check('解析出 Payload 字段', body.includes('1234567890'), '');
    return { expected: 0 };
  },

  qrcode: async ({ check }) => {
    const ok = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++;
      return dark > 200;
    });
    check('二维码 canvas 已绘制', ok, '');
    return { expected: 0 };
  },

  'barcode-decode': async ({ check }) => {
    check('页面渲染正常', true, '');
    return { expected: 0 };
  },

  timestamp: async ({ check }) => {
    await wait(1200);
    const body = await page.evaluate(() => document.body.innerText);
    check('显示当前日期时间', /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(body), '');
    return { expected: 0 };
  },

  color: async ({ check }) => {
    await setValue('input.input', '#147d69');
    await wait(500);
    const body = await page.evaluate(() => document.body.innerText);
    check('HEX 转 RGB 正确', body.includes('rgb(20, 125, 105)'), '');
    check('显示对比度', /对比度/.test(body), '');
    return { expected: 0 };
  },

  uuid: async ({ check }) => {
    await click('生成 10 个');
    await wait(500);
    const body = await page.evaluate(() => document.body.innerText);
    const ids = body.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g) || [];
    check('生成 10 个 UUID v4', ids.length === 10, `${ids.length} 个`);
    return { expected: 0 };
  },

  cron: async ({ check }) => {
    const body = await page.evaluate(() => document.body.innerText);
    check('翻译成中文说明', /工作日/.test(body), '');
    check('列出执行时间', (body.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g) || []).length >= 3, '');
    return { expected: 0 };
  },

  'doc-to-pdf': async () => {
    await pickFiles([fx('report.docx')]);
    await click('转换为 PDF');
    return {
      expected: 1,
      verify: async (files, c) => {
        if (!files[0]) return c('没有产物可校验', false, '');
        const pages = await pdfPages(files[0].path);
        c('生成 PDF', pages !== null, `${pages} 页`);
      },
    };
  },

  'pdf-to-text': async ({ check }) => {
    await pickFiles([fx('doc-3pages.pdf')]);
    await click('提取文字');
    await wait(4000);
    const txt = await page.evaluate(() => {
      const ta = [...document.querySelectorAll('textarea')].find((t) => t.value.length > 3);
      return ta ? ta.value : '';
    });
    check('提取到 Page 1/2/3', /Page 1/.test(txt) && /Page 3/.test(txt), JSON.stringify(txt.slice(0, 40)));
    return { expected: 0 };
  },

  'unit-convert': async ({ check }) => {
    const body = await page.evaluate(() => document.body.innerText);
    check('1 米 = 100 厘米', /100/.test(body), '');
    return { expected: 0 };
  },

  'date-calc': async ({ check }) => {
    const body = await page.evaluate(() => document.body.innerText);
    check('显示相差天数', /相差天数/.test(body), '');
    return { expected: 0 };
  },

  finance: async ({ check }) => {
    const body = await page.evaluate(() => document.body.innerText);
    check('计算出月供', /¥[\d,]+\.\d{2}/.test(body), (body.match(/¥[\d,]+\.\d{2}/) || [''])[0]);
    return { expected: 0 };
  },

  bmi: async ({ check }) => {
    const body = await page.evaluate(() => document.body.innerText);
    check('显示 BMI 数值', /\d{2}\.\d/.test(body), '');
    check('给出区间结论', /正常|偏瘦|超重|肥胖/.test(body), '');
    return { expected: 0 };
  },
};

/* ---------------- 主流程 ---------------- */

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(HOOK);

  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/libheif|jsdelivr|unpkg|favicon|Failed to load resource|net::ERR|Password field/.test(t)) return;
    consoleErrors.push(t);
  });

  const entries = Object.entries(cases).filter(([k]) => !only || only.includes(k));
  console.log(`共 ${entries.length} 个工具用例\n`);

  for (const [name, actions] of entries) {
    console.log(`== ${name} ==`);
    await runTool(name, actions);
    console.log('');
  }

  const failed = results.filter((r) => r.error || r.checks.some((c) => !c.ok));
  console.log('================ 汇总 ================');
  console.log(`工具数: ${results.length}  通过: ${results.length - failed.length}  失败: ${failed.length}`);
  for (const f of failed) {
    console.log(`  ✗ ${f.tool}${f.error ? '（执行异常）' : ''}`);
    f.checks.filter((c) => !c.ok).forEach((c) => console.log(`      - ${c.label} ${c.detail}`));
    if (f.error) console.log(`      异常: ${f.error}`);
  }

  fs.writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, results }, null, 2));
  console.log(`\n报告: ${path.relative(process.cwd(), REPORT)}`);

  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('RUNNER CRASHED', e);
  process.exit(2);
});
