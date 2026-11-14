/**
 * 冒烟测试：用本机 Chrome 无头模式打开预览站点，逐个访问工具页，
 * 收集控制台错误与页面异常，并对部分工具做功能断言。
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5188';
const OUT = path.join(process.cwd(), 'screenshots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const slugs = [
  'pdf-merge', 'pdf-split', 'pdf-compress', 'pdf-to-image', 'image-to-pdf',
  'pdf-rotate', 'pdf-watermark', 'pdf-page-number', 'pdf-protect',
  'image-convert', 'image-compress', 'image-resize', 'image-watermark',
  'image-remove-bg', 'image-collage', 'image-base64', 'ocr',
  'media-convert', 'video-to-gif', 'video-trim',
  'json-format', 'text-clean', 'regex-test', 'markdown-preview', 'case-convert',
  'base64', 'url-codec', 'hash', 'jwt', 'qrcode', 'barcode-decode',
  'timestamp', 'color', 'uuid', 'cron', 'doc-to-pdf', 'pdf-to-text',
  'unit-convert', 'date-calc', 'finance', 'bmi',
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const problems = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // 忽略资源类噪声（CDN 探测失败等）
      if (/libheif|jsdelivr|unpkg|favicon|Failed to load resource/.test(t)) return;
      problems.push(`[console] ${page.url()} :: ${t}`);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(`[pageerror] ${page.url()} :: ${err.message}`);
  });

  const results = [];

  async function visit(url, name) {
    const before = problems.length + pageErrors.length;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 600));
    const title = await page.title();
    const heading = await page
      .$eval('h1', (el) => el.textContent.trim())
      .catch(() => '(no h1)');
    const bodyLen = (await page.evaluate(() => document.body.innerText.length));
    const newIssues = problems.length + pageErrors.length - before;
    results.push({ name, url, title, heading, bodyLen, issues: newIssues });
    if (newIssues > 0) {
      console.log(`  ✗ ${name} (${newIssues} 个问题)`);
    }
    return { title, heading, bodyLen };
  }

  console.log('== 首页 ==');
  await visit(`${BASE}/#/`, 'home');
  await page.screenshot({ path: path.join(OUT, 'home.png'), fullPage: false });

  console.log('== 工具列表 ==');
  await visit(`${BASE}/#/tools`, 'tools');
  await page.screenshot({ path: path.join(OUT, 'tools.png') });

  console.log('== 42 个工具页 ==');
  for (const slug of slugs) {
    const r = await visit(`${BASE}/#/tools/${slug}`, slug);
    if (r.bodyLen < 200) console.log(`  ⚠ ${slug} 内容过少 (${r.bodyLen})`);
  }

  // 功能断言：JSON 格式化
  console.log('== 功能测试：JSON 格式化 ==');
  await page.goto(`${BASE}/#/tools/json-format`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent.includes('格式化'));
    b && b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  const jsonOut = await page.evaluate(() => {
    const tas = [...document.querySelectorAll('textarea')];
    return tas[1] ? tas[1].value : '';
  });
  const jsonOk = jsonOut.includes('"name"') && jsonOut.includes('\n  ');
  console.log(jsonOk ? '  ✓ JSON 格式化输出正确' : `  ✗ JSON 格式化失败: ${jsonOut.slice(0, 80)}`);
  await page.screenshot({ path: path.join(OUT, 'json-format.png') });

  // 功能断言：时间戳
  console.log('== 功能测试：时间戳 ==');
  await page.goto(`${BASE}/#/tools/timestamp`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  const tsText = await page.evaluate(() => document.body.innerText);
  const tsOk = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(tsText);
  console.log(tsOk ? '  ✓ 时间戳实时显示正常' : '  ✗ 时间戳未显示');

  // 功能断言：二维码 canvas 渲染
  console.log('== 功能测试：二维码 ==');
  await page.goto(`${BASE}/#/tools/qrcode`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  const qrOk = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++;
    return dark > 100;
  });
  console.log(qrOk ? '  ✓ 二维码已绘制' : '  ✗ 二维码未绘制');
  await page.screenshot({ path: path.join(OUT, 'qrcode.png') });

  // 功能断言：单位换算
  console.log('== 功能测试：单位换算 ==');
  await page.goto(`${BASE}/#/tools/unit-convert`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 500));
  const unitText = await page.evaluate(() => document.body.innerText);
  const unitOk = unitText.includes('0.01') || unitText.includes('100');
  console.log(unitOk ? '  ✓ 单位换算有结果' : '  ✗ 单位换算无结果');

  // 功能断言：贷款计算
  console.log('== 功能测试：贷款计算 ==');
  await page.goto(`${BASE}/#/tools/finance`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 500));
  const finText = await page.evaluate(() => document.body.innerText);
  const finOk = /¥[\d,]+\.\d{2}/.test(finText);
  console.log(finOk ? '  ✓ 贷款月供已计算' : '  ✗ 贷款计算无结果');
  await page.screenshot({ path: path.join(OUT, 'finance.png') });

  console.log('\n== 汇总 ==');
  console.log(`访问页面数: ${results.length + 6}`);
  console.log(`控制台/页面错误: ${problems.length + pageErrors.length}`);
  [...problems, ...pageErrors].slice(0, 40).forEach((p) => console.log('  ' + p));

  const failed = results.filter((r) => r.issues > 0 || r.bodyLen < 200);
  console.log(`有问题的页面: ${failed.length}`);
  failed.forEach((f) => console.log(`  - ${f.name}: issues=${f.issues} bodyLen=${f.bodyLen}`));

  fs.writeFileSync(path.join(OUT, 'smoke-report.json'), JSON.stringify({ results, problems, pageErrors }, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('SMOKE FAILED', e);
  process.exit(1);
});
