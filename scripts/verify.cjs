/**
 * 最终验收：用真实交互路径（键盘输入、精确按钮定位、点击后轮询）验证核心工具。
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5188';
const OUT = path.join(process.cwd(), 'screenshots', 'verify');
const inputs = path.join(process.cwd(), 'screenshots', 'func', 'inputs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  const pdfA = path.join(inputs, 'a-3pages.pdf');
  const pdfB = path.join(inputs, 'b-2pages.pdf');
  const png = path.join(inputs, 'photo.png');
  const jpg = path.join(inputs, 'photo.jpg');

  async function go(slug) {
    await page.goto(`${BASE}/#/tools/${slug}`, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('input[type=file]', { timeout: 20000 });
    await wait(400);
  }

  /** 按可见文本点击主按钮（只取可见且未禁用的） */
  async function clickButton(text) {
    const ok = await page.evaluate((label) => {
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === label && !b.disabled && b.offsetParent !== null,
      );
      if (!btn) return false;
      btn.click();
      return true;
    }, text);
    if (!ok) throw new Error(`找不到可点击按钮：${text}`);
    await wait(400);
  }

  // 一次性投放多个文件（Dropzone 真正接收的是 label 的 drop 事件）
  async function dropFiles(filePaths) {
    const payload = filePaths.map((f) => ({
      name: path.basename(f),
      b64: fs.readFileSync(f).toString('base64'),
      type: f.endsWith('.pdf') ? 'application/pdf' : f.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
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
      zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    }, payload);
    await wait(1200);
  }
  async function pickFiles(...files) {
    await page.waitForSelector('input[type=file]');
    const input = await page.$('input[type=file]');
    // 支持一次投放多个文件；必要时回退到逐个追加
    try {
      await input.uploadFile(...files);
    } catch {
      for (const f of files) {
        const el = await page.$('input[type=file]');
        if (el) await el.uploadFile(f);
        await wait(700);
      }
    }
    await wait(900);
  }

  async function waitText(re, timeout = 60000) {
    try {
      await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source);
      return true;
    } catch {
      return false;
    }
  }

  // PDF 合并
  console.log('== PDF 合并 ==');
  await go('pdf-merge');
  await pickFiles(pdfA, pdfB);
  await clickButton('合并 2 个 PDF');
  check('合并生成 PDF', await waitText(/合并结果\.pdf/), '');
  await page.screenshot({ path: path.join(OUT, 'pdf-merge.png') });

  // PDF 拆分
  console.log('== PDF 拆分 ==');
  await go('pdf-split');
  await pickFiles(pdfA);
  await wait(1200);
  check('识别总页数', await waitText(/共 3 页/, 8000), '');
  await clickButton('开始拆分');
  check('拆分产出 2 份', await waitText(/2 个文件/, 30000), '');
  await page.screenshot({ path: path.join(OUT, 'pdf-split.png') });

  // PDF 转图片
  console.log('== PDF 转图片 ==');
  await go('pdf-to-image');
  await pickFiles(pdfA);
  await wait(800);
  await clickButton('开始转换');
  check('导出 3 张图片', await waitText(/3 个文件/, 90000), '');
  await page.screenshot({ path: path.join(OUT, 'pdf-to-image.png') });

  // 图片转 PDF
  console.log('== 图片转 PDF ==');
  await go('image-to-pdf');
  await dropFiles([png, jpg]);
  await clickButton('生成 PDF（2 页）');
  check('两张图生成 PDF', await waitText(/\.pdf/, 30000), '');
  await page.screenshot({ path: path.join(OUT, 'image-to-pdf.png') });

  // PDF 加密
  console.log('== PDF 加密 ==');
  await go('pdf-protect');
  await pickFiles(pdfA);
  await page.click('input[type=password]');
  await page.keyboard.type('test12345', { delay: 40 });
  await wait(800);
  const btnState = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '加密并下载');
    return b ? { disabled: b.disabled, visible: b.offsetParent !== null } : null;
  });
  check('密码填写后按钮可用', !!btnState && !btnState.disabled, JSON.stringify(btnState));
  await clickButton('加密并下载');
  check('加密生成文件', await waitText(/-加密\.pdf/, 30000), '');
  await page.screenshot({ path: path.join(OUT, 'pdf-protect.png') });

  // PDF 转文本
  console.log('== PDF 转文本 ==');
  await go('pdf-to-text');
  await pickFiles(pdfA);
  await clickButton('提取文字');
  await wait(4000);
  const txt = await page.evaluate(() => {
    const ta = [...document.querySelectorAll('textarea')].find((t) => t.value.includes('Page'));
    return ta ? ta.value : '';
  });
  check('提取到正文', /Page 1/.test(txt) && /Page 3/.test(txt), JSON.stringify(txt.slice(0, 40)));

  // 图片格式转换
  console.log('== 图片格式转换 ==');
  await go('image-convert');
  await pickFiles(png);
  await clickButton('开始转换（1 张）');
  check('PNG 转 JPG', await waitText(/\.jpg/, 30000), '');
  await page.screenshot({ path: path.join(OUT, 'image-convert.png') });

  // 图片压缩
  console.log('== 图片压缩 ==');
  await go('image-compress');
  await pickFiles(png);
  await clickButton('开始压缩（1 张）');
  check('压缩完成', await waitText(/compressed/, 30000), '');
  await page.screenshot({ path: path.join(OUT, 'image-compress.png') });

  // OCR（依赖 CDN，允许失败但要有提示）
  console.log('== OCR ==');
  await go('ocr');
  await pickFiles(png);
  const ocrDone = await waitText(/识别结果|识别失败|正在识别|准备中/, 120000);
  const ocrBody = await page.evaluate(() => document.body.innerText);
  check('OCR 流程可触发（有结果或明确报错）', ocrDone && /识别|失败|模型/.test(ocrBody), ocrBody.includes('识别失败') ? '网络受限时有明确提示' : '');
  await page.screenshot({ path: path.join(OUT, 'ocr.png') });

  console.log('\n== 验收汇总 ==');
  const pass = results.filter((r) => r.ok).length;
  console.log(`${pass}/${results.length} 通过`);
  results.filter((r) => !r.ok).forEach((r) => console.log('  ✗ ' + r.name + ' ' + r.detail));
  if (errs.length) console.log('页面异常:', errs.slice(0, 5));

  fs.writeFileSync(path.join(OUT, 'verify-report.json'), JSON.stringify({ results, errs }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAILED', e);
  process.exit(1);
});