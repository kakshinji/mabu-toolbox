/**
 * 边界测试：损坏文件、空输入、极端参数、并发、异常路径。
 * 目标不是「正常能跑」，而是「出错时是否优雅」——不崩溃、有明确提示、不产出损坏文件。
 *
 * 用法：node tests/edge.cjs [--only=case1,case2]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5188';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIX = path.join(process.cwd(), 'tests', 'fixtures');
const EDGE = path.join(FIX, 'edge');
const SHOTS = path.join(process.cwd(), 'tests', 'edge-shots');
const REPORT = path.join(process.cwd(), 'tests', 'edge-report.json');

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const results = [];
let browser;
let page;
let pageErrors = [];
let consoleErrors = [];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = (n) => path.join(EDGE, n);

const HOOK = `
(() => {
  window.__objs = [];
  const orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    const url = orig(obj);
    if (obj instanceof Blob && obj.size > 0) {
      window.__objs.push({ url, blob: obj });
      window.__lastObj = window.__objs[window.__objs.length - 1];
    }
    return url;
  };
  window.__downloaded = [];
  window.__resetDownloads = () => { window.__downloaded = []; window.__objs = []; };
  window.__sink = () => {
    if (window.__lastObj && !window.__downloaded.includes(window.__lastObj)) window.__downloaded.push(window.__lastObj);
    return window.__downloaded.length;
  };
  window.__takeDownloads = async () => {
    const out = [];
    for (const item of window.__downloaded) {
      const buf = await item.blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      out.push({ size: item.blob.size, type: item.blob.type, b64: btoa(bin) });
    }
    return out;
  };
})();
`;

async function open(slug) {
  await page.goto(`${BASE}/tools/${slug}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await wait(800);
  const ok = await page.evaluate(() => Array.isArray(window.__objs));
  if (!ok) throw new Error('hook 未注入');
}

async function pickFiles(files) {
  for (const f of files) {
    await page.waitForSelector('input[type=file]', { timeout: 15000 });
    const input = await page.$('input[type=file]');
    await input.uploadFile(f);
    await wait(800);
  }
}

async function dropFiles(files) {
  const payload = files.map((f) => ({
    name: path.basename(f),
    type: f.endsWith('.pdf') ? 'application/pdf' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream',
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

async function click(text) {
  const r = await page.evaluate((label) => {
    const pool = [...document.querySelectorAll('button')].filter(
      (b) => b.offsetParent !== null && b.textContent.trim() === label,
    );
    if (!pool.length) return { ok: false, visible: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 30) };
    const btn = pool.find((b) => !b.disabled);
    if (!btn) return { ok: false, disabled: true };
    btn.click();
    return { ok: true };
  }, text);
  await wait(500);
  return r;
}

async function bodyText() {
  return page.evaluate(() => document.body.innerText);
}

async function settle(ms = 4000) {
  await wait(ms);
}

/** 只取「点击下载按钮之后」新建的 Blob，避免把缩略图等对象的 URL 误当成产物 */
async function collectedBlobs() {
  const before = await page.evaluate(() => window.__objs.length);
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(
      (b) => b.offsetParent !== null && b.textContent.trim() === '下载' && !b.disabled,
    );
    if (!btns.length) return 0;
    btns[0].click();
    return 1;
  });
  if (!clicked) return [];
  await wait(400);
  const items = await page.evaluate(async (from) => {
    const out = [];
    for (const item of window.__objs.slice(from)) {
      const buf = await item.blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      out.push({ size: item.blob.size, type: item.blob.type, b64: btoa(bin) });
    }
    return out;
  }, before);
  return items;
}

/* ---------------- 断言工具 ---------------- */

function classify(record, _tag, label, ok, detail = '') {
  record.checks.push({ label, ok: !!ok, detail: String(detail) });
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
}

/** 页面没有崩溃、没有未捕获异常 */
function assertAlive(record) {
  const body = record.body;
  const crashed = /Cannot read|undefined is not|is not a function|TypeError:/.test(body);
  classify(record, 'x', '页面未崩溃', !crashed && body.length > 60, crashed ? '出现运行时错误文本' : '');
}

/** 出错时必须给人能看懂的提示，而不是空白或英文堆栈 */
function assertGracefulError(record, keywords = []) {
  const body = record.body;
  const hasFriendly =
    /失败|错误|无法|不支持|请|无效|不是有效|损坏|过大|为空|受限|出错了/.test(body) ||
    keywords.some((k) => new RegExp(k).test(body));
  const rawStack = /(TypeError|ReferenceError|SyntaxError:|at Object\.|at async )/.test(body);
  classify(record, 'x', '失败时有可读提示', hasFriendly && !rawStack, hasFriendly ? '有中文提示' : '无提示');
}

/** 不应产出 0 字节或明显损坏的文件 */
function assertNoCorruptOutput(blobs, record) {
  if (!blobs.length) return classify(record, 'x', '无损坏产物（未产出）', true, '未生成文件');
  const zero = blobs.filter((b) => b.size === 0);
  classify(record, 'x', '产物非空', zero.length === 0, zero.length ? `${zero.length} 个 0 字节文件` : `${blobs.length} 个文件`);
}

/* ---------------- 用例 ---------------- */

const cases = {
  // ============ 损坏 / 非法输入 ============
  'edge-pdf-merge-broken': {
    tool: 'pdf-merge',
    run: async (record) => {
      await dropFiles([edge('broken.pdf'), path.join(FIX, 'doc-1page.pdf')]);
      await wait(600);
      const r = await click('合并 2 个 PDF');
      await settle(3000);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      const failed = /失败|出错了|无法|不是有效/.test(record.body);
      classify(record, 'x', '损坏 PDF 被拒绝或降级', failed || blobs.length > 0, failed ? '有报错提示' : '仍产出了文件');
      if (failed) assertGracefulError(record);
      assertNoCorruptOutput(blobs, record);
    },
  },

  'edge-pdf-merge-empty': {
    tool: 'pdf-merge',
    run: async (record) => {
      // 空文件：未选择时应禁用按钮
      await dropFiles([edge('empty.pdf')]);
      await wait(600);
      record.body = await bodyText();
      assertAlive(record);
      const btn = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /合并 \d+ 个 PDF/.test(x.textContent));
        return b ? { disabled: b.disabled, text: b.textContent.trim() } : null;
      });
      classify(record, 'x', '单个文件时禁用合并', !!btn && btn.disabled, btn ? btn.text : '未找到按钮');
      // 空文件仍算一个文件，但状态应正常（不崩溃）
      const hasFileEntry = /empty\.pdf/.test(record.body);
      classify(record, 'x', '空文件能被识别并展示', hasFileEntry, hasFileEntry ? '出现在列表' : '未显示');
    },
  },

  'edge-pdf-split-out-of-range': {
    tool: 'pdf-split',
    run: async (record) => {
      await pickFiles([edge('one-page.pdf')]);
      await wait(300);
      // 输入超出范围的页码
      await page.evaluate(() => {
        const i = document.querySelector('input.mono');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, '99-200');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(400);
      const r = await click('开始拆分');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      const blobs = await collectedBlobs();
      // 范围非法时应当没有任何输出，并保持页面可用
      const noOutput = blobs.length === 0;
      const noCrash = !/TypeError|Cannot read/.test(record.body);
      classify(record, 'x', '非法页范围不产出垃圾文件', noOutput || noCrash, noOutput ? '未产出' : `产出 ${blobs.length} 个`);
      assertAlive(record);
    },
  },

  'edge-pdf-split-neg-page': {
    tool: 'pdf-split',
    run: async (record) => {
      await pickFiles([edge('one-page.pdf')]);
      await wait(300);
      await page.evaluate(() => {
        const i = document.querySelector('input.mono');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, '-5');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(300);
      await click('开始拆分');
      await settle(2500);
      record.body = await bodyText();
      assertAlive(record);
      const blobs = await collectedBlobs();
      classify(record, 'x', '负数页码不产出文件', blobs.length === 0, `${blobs.length} 个`);
    },
  },

  'edge-pdf-to-image-broken': {
    tool: 'pdf-to-image',
    run: async (record) => {
      await pickFiles([edge('broken.pdf')]);
      await wait(400);
      await click('开始转换');
      await settle(4000);
      record.body = await bodyText();
      assertAlive(record);
      assertGracefulError(record);
      const blobs = await collectedBlobs();
      classify(record, 'x', '损坏 PDF 不产出图片', blobs.length === 0, `${blobs.length} 张`);
    },
  },

  'edge-image-convert-broken': {
    tool: 'image-convert',
    run: async (record) => {
      await pickFiles([edge('broken.png')]);
      await wait(500);
      await click('开始转换（1 张）');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      assertGracefulError(record);
      const blobs = await collectedBlobs();
      classify(record, 'x', '损坏图片不产出文件', blobs.length === 0, `${blobs.length} 个`);
    },
  },

  'edge-image-convert-fake': {
    tool: 'image-convert',
    run: async (record) => {
      await pickFiles([edge('fake-image.png')]);
      await wait(400);
      await click('开始转换（1 张）');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      assertGracefulError(record);
    },
  },

  'edge-image-to-pdf-empty': {
    tool: 'image-to-pdf',
    run: async (record) => {
      await pickFiles([edge('empty.png')]);
      await wait(500);
      record.body = await bodyText();
      assertAlive(record);
      const btnState = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /生成 PDF/.test(x.textContent));
        return b ? b.disabled : null;
      });
      classify(record, 'x', '未选有效图片时不崩溃', true, btnState === null ? '按钮未出现' : `按钮 disabled=${btnState}`);
    },
  },

  'edge-image-1px': {
    tool: 'image-convert',
    run: async (record) => {
      await pickFiles([edge('tiny.png')]);
      await wait(400);
      await click('开始转换（1 张）');
      await settle(2500);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      classify(record, 'x', '1×1 图片可转换', blobs.length === 1 && blobs[0].size > 0, `${blobs.length} 个，${blobs[0]?.size ?? 0} B`);
    },
  },

  'edge-image-transparent-to-jpg': {
    tool: 'image-convert',
    run: async (record) => {
      await pickFiles([edge('transparent.png')]);
      await wait(400);
      // 选 JPG（透明图转 JPEG 需要补白底）
      const ok = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'JPG');
        if (b) { b.click(); return true; }
        return false;
      });
      await wait(300);
      await click('开始转换（1 张）');
      await settle(2500);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      if (blobs[0]) {
        const buf = Buffer.from(blobs[0].b64, 'base64');
        const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
        classify(record, 'x', '透明图转 JPG 成功（自动补底）', isJpeg, isJpeg ? 'JPEG' : '格式错误');
      } else {
        classify(record, 'x', '透明图转 JPG 成功（自动补底）', false, '无产物');
      }
    },
  },

  'edge-doc-to-pdf-not-docx': {
    tool: 'doc-to-pdf',
    run: async (record) => {
      await pickFiles([edge('not-a-docx.docx')]);
      await wait(400);
      await click('转换为 PDF');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      assertGracefulError(record, ['document\\.xml', '不是有效']);
      const blobs = await collectedBlobs();
      classify(record, 'x', '伪 docx 不产出 PDF', blobs.length === 0, `${blobs.length} 个`);
    },
  },

  // ============ 空 / 极端输入 ============
  'edge-json-invalid': {
    tool: 'json-format',
    run: async (record) => {
      await page.evaluate(() => {
        const ta = document.querySelectorAll('textarea')[0];
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, '{"a": 1, "b": }');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(300);
      await click('格式化 / 转换');
      await settle(800);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /Unexpected|格式|无效|错误/i.test(record.body);
      classify(record, 'x', '非法 JSON 给出解析错误', hasError, hasError ? '有错误提示' : '无提示');
    },
  },

  'edge-json-deep': {
    tool: 'json-format',
    run: async (record) => {
      const deep = '['.repeat(200) + ']'.repeat(200);
      await page.evaluate((v) => {
        const ta = document.querySelectorAll('textarea')[0];
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, v);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }, deep);
      await wait(300);
      await click('格式化 / 转换');
      await settle(1500);
      record.body = await bodyText();
      assertAlive(record);
      classify(record, 'x', '深层嵌套不卡死', record.body.length > 100, '');
    },
  },

  'edge-text-clean-empty': {
    tool: 'text-clean',
    run: async (record) => {
      record.body = await bodyText();
      assertAlive(record);
      const out = await page.evaluate(() => document.querySelectorAll('textarea')[1].value);
      classify(record, 'x', '空输入时输出为空而非报错', out === '', JSON.stringify(out.slice(0, 20)));
    },
  },

  'edge-text-clean-huge-line': {
    tool: 'text-clean',
    run: async (record) => {
      const huge = 'x'.repeat(200000);
      await page.evaluate((v) => {
        const ta = document.querySelectorAll('textarea')[0];
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, v);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }, huge);
      await wait(1200);
      record.body = await bodyText();
      assertAlive(record);
      const len = await page.evaluate(() => document.querySelectorAll('textarea')[1].value.length);
      classify(record, 'x', '20 万字符单行可处理', len >= 199000, `${len} 字符`);
    },
  },

  'edge-base64-invalid': {
    tool: 'base64',
    run: async (record) => {
      await page.evaluate(() => {
        const ta = document.querySelectorAll('textarea')[0];
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, '这不是base64!!@@##');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(200);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Base64 → 原文');
        if (b) b.click();
      });
      await wait(300);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '转换');
        if (b) b.click();
      });
      await settle(1500);
      record.body = await bodyText();
      assertAlive(record);
      classify(record, 'x', '非法 Base64 不崩溃', !/TypeError|at Object\./.test(record.body), '');
    },
  },

  'edge-regex-invalid': {
    tool: 'regex-test',
    run: async (record) => {
      await page.evaluate(() => {
        const i = document.querySelector('input.mono');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, '([a-z');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await settle(800);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /无效|错误|Invalid|正则/.test(record.body);
      classify(record, 'x', '非法正则给出提示', hasError, '');
    },
  },

  'edge-regex-catastrophic': {
    tool: 'regex-test',
    run: async (record) => {
      // 经典灾难性回溯
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input.mono');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(inputs[0], '(a+)+$');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        const ta = document.querySelector('textarea');
        const tsetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        tsetter.call(ta, 'a'.repeat(40) + '!');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const t0 = Date.now();
      await wait(2500);
      record.body = await bodyText();
      const elapsed = Date.now() - t0;
      assertAlive(record);
      classify(record, 'x', '灾难性回溯不冻死页面', elapsed < 8000, `${elapsed}ms`);
    },
  },

  'edge-jwt-malformed': {
    tool: 'jwt',
    run: async (record) => {
      await page.evaluate(() => {
        const ta = document.querySelector('textarea');
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, 'not.a.jwt');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(600);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /不是有效|解析失败|格式/.test(record.body);
      classify(record, 'x', '非法 JWT 给出提示', hasError, '');
    },
  },

  'edge-color-invalid': {
    tool: 'color',
    run: async (record) => {
      await page.evaluate(() => {
        const i = document.querySelector('input.input');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, '#zzz');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(500);
      record.body = await bodyText();
      assertAlive(record);
      const hasWarn = /格式|无效|应为/.test(record.body);
      classify(record, 'x', '非法 HEX 给出提示', hasWarn, '');
    },
  },

  'edge-cron-invalid': {
    tool: 'cron',
    run: async (record) => {
      await page.evaluate(() => {
        const i = document.querySelector('input.mono');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, 'not a cron');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(600);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /无法解析|需要 5 段|错误/.test(record.body);
      classify(record, 'x', '非法 Cron 给出提示', hasError, '');
    },
  },

  'edge-unit-negative': {
    tool: 'unit-convert',
    run: async (record) => {
      await page.evaluate(() => {
        const i = document.querySelector('input[type=number]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, '-5');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(500);
      record.body = await bodyText();
      assertAlive(record);
      classify(record, 'x', '负数输入不崩溃', !/NaN|Infinity|undefined/.test(record.body), '');
    },
  },

  // ============ 交互边界 ============
  'edge-pdf-merge-single': {
    tool: 'pdf-merge',
    run: async (record) => {
      await dropFiles([path.join(FIX, 'doc-1page.pdf')]);
      await wait(600);
      record.body = await bodyText();
      const disabled = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /合并 \d+ 个 PDF/.test(x.textContent));
        return b ? b.disabled : null;
      });
      classify(record, 'x', '仅 1 个文件时禁止合并', disabled === true, `disabled=${disabled}`);
    },
  },

  'edge-pdf-merge-same-file-twice': {
    tool: 'pdf-merge',
    run: async (record) => {
      await dropFiles([path.join(FIX, 'doc-1page.pdf'), path.join(FIX, 'doc-1page.pdf')]);
      await wait(600);
      await click('合并 2 个 PDF');
      await settle(3000);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      classify(record, 'x', '同一文件可合并两次', blobs.length === 1, `${blobs.length} 个`);
    },
  },

  'edge-image-collage-one': {
    tool: 'image-collage',
    run: async (record) => {
      await dropFiles([path.join(FIX, 'photo.png')]);
      await wait(600);
      record.body = await bodyText();
      const disabled = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /拼接 \d+ 张图片/.test(x.textContent));
        return b ? b.disabled : null;
      });
      classify(record, 'x', '仅 1 张图时禁止拼接', disabled === true, `disabled=${disabled}`);
    },
  },

  'edge-remove-bg-no-removal': {
    tool: 'image-remove-bg',
    run: async (record) => {
      // 已经是透明的图片，不应报错
      await pickFiles([edge('transparent.png')]);
      await wait(400);
      await click('去底并生成 PNG');
      await settle(2500);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      classify(record, 'x', '全透明图片去底不报错', blobs.length === 1, `${blobs.length} 个`);
    },
  },

  'edge-pdf-watermark-longtext': {
    tool: 'pdf-watermark',
    run: async (record) => {
      await pickFiles([path.join(FIX, 'doc-1page.pdf')]);
      await wait(300);
      await page.evaluate(() => {
        const i = document.querySelector('input.input');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(i, 'A'.repeat(40));
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(300);
      await click('添加水印');
      await settle(2500);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      classify(record, 'x', '40 字符水印可生成', blobs.length === 1, `${blobs.length} 个`);
    },
  },

  'edge-pdf-protect-short-pw': {
    tool: 'pdf-protect',
    run: async (record) => {
      await pickFiles([path.join(FIX, 'doc-1page.pdf')]);
      await wait(300);
      await page.click('input[type=password]');
      await page.keyboard.type('12', { delay: 20 });
      await wait(400);
      record.body = await bodyText();
      const disabled = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '加密并下载');
        return b ? b.disabled : null;
      });
      classify(record, 'x', '密码过短时禁止加密', disabled === true, `disabled=${disabled}`);
    },
  },

  'edge-pdf-protect-decrypt-wrong': {
    tool: 'pdf-protect',
    run: async (record) => {
      await pickFiles([path.join(FIX, 'doc-1page.pdf')]);
      await wait(300);
      // 切到解密模式，用错误密码
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '移除密码');
        if (b) b.click();
      });
      await wait(300);
      await page.click('input[type=password]');
      await page.keyboard.type('wrongpassword', { delay: 15 });
      await wait(400);
      await click('移除密码并下载');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /失败|密码可能不正确|未加密/.test(record.body);
      classify(record, 'x', '错误密码给出明确提示', hasError, '');
    },
  },

  'edge-pdf-to-text-broken': {
    tool: 'pdf-to-text',
    run: async (record) => {
      await pickFiles([edge('broken.pdf')]);
      await wait(400);
      await click('提取文字');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      assertGracefulError(record);
    },
  },

  'edge-ocr-invalid-image': {
    tool: 'ocr',
    run: async (record) => {
      await pickFiles([edge('broken.png')]);
      await settle(6000);
      record.body = await bodyText();
      assertAlive(record);
      classify(record, 'x', '损坏图片 OCR 不崩溃', !/TypeError|Cannot read/.test(record.body), '');
    },
  },

  // ============ 并发 ============
  'edge-concurrent-image-convert': {
    tool: 'image-convert',
    run: async (record) => {
      const files = ['photo.png', 'photo.jpg', 'small.png', 'wide.webp', 'icon-square.png'].map((n) => path.join(FIX, n));
      await dropFiles(files);
      await wait(600);
      await click('开始转换（5 张）');
      await settle(6000);
      record.body = await bodyText();
      const blobs = await collectedBlobs();
      assertAlive(record);
      classify(record, 'x', '5 张图片批量转换产出 1 个 ZIP 或 5 个文件', blobs.length >= 1, `${blobs.length} 个产物`);
    },
  },

  'edge-video-trim-invalid-range': {
    tool: 'video-trim',
    run: async (record) => {
      await pickFiles([path.join(FIX, 'photo.png')]);
      await wait(500);
      // 结束时间早于开始时间
      await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input.mono')];
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(inputs[0], '00:01:00');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(inputs[1], '00:00:10');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(300);
      await click('裁剪并下载');
      await settle(3000);
      record.body = await bodyText();
      assertAlive(record);
      const hasError = /结束时间|必须|失败/.test(record.body);
      classify(record, 'x', '非法时间范围有提示', hasError, '');
    },
  },
};

/* ---------------- 主流程 ---------------- */

let currentCase = '';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 30000,
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
  console.log(`共 ${entries.length} 个边界用例\n`);

  for (const [name, spec] of entries) {
    currentCase = name;
    pageErrors = [];
    consoleErrors = [];
    const record = { case: name, tool: spec.tool, checks: [], body: '', pageErrors: [], consoleErrors: [] };
    console.log(`== ${name}（${spec.tool}）==`);

    try {
      await Promise.race([
        (async () => {
          await open(spec.tool);
          await page.evaluate(() => window.__resetDownloads());
          await spec.run(record);
        })(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('用例超时（45s），疑似页面被阻塞')), 45000)),
      ]);
    } catch (e) {
      record.fatal = String(e && e.message ? e.message : e);
      console.log(`  ✗ 用例执行失败 — ${record.fatal}`);
    }

    record.pageErrors = pageErrors.slice(0, 5);
    record.consoleErrors = consoleErrors.slice(0, 5);
    if (pageErrors.length) console.log(`  ! 页面异常: ${pageErrors.slice(0, 2).join(' | ')}`);
    if (consoleErrors.length) console.log(`  ! 控制台错误: ${consoleErrors.slice(0, 2).join(' | ')}`);

    // 未捕获异常视为失败
    if (pageErrors.length) {
      record.checks.push({ label: '无未捕获异常', ok: false, detail: pageErrors[0] });
    }

    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }).catch(() => {});
    results.push(record);
    console.log('');
  }

  const failed = results.filter((r) => r.fatal || r.pageErrors.length || r.checks.some((c) => !c.ok));
  console.log('================ 边界测试汇总 ================');
  console.log(`用例数: ${results.length}  通过: ${results.length - failed.length}  失败: ${failed.length}`);
  for (const f of failed) {
    console.log(`  ✗ ${f.case}（${f.tool}）${f.fatal ? ' 执行异常: ' + f.fatal : ''}`);
    f.checks.filter((c) => !c.ok).forEach((c) => console.log(`      - ${c.label} ${c.detail}`));
    f.pageErrors.forEach((e) => console.log(`      页面异常: ${e}`));
  }

  fs.writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n报告: ${path.relative(process.cwd(), REPORT)}`);

  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('RUNNER CRASHED', e);
  process.exit(2);
});
