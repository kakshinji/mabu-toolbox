/**
 * 生成站点图标与社交分享封面（一次性脚本，产物提交到 public/）
 * 需要本机 Chrome。
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('.');
const OUT = path.join(ROOT, 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const SEAL = `
  <rect width="32" height="32" rx="7" fill="#141413"/>
  <rect x="7.5" y="7" width="17" height="18" rx="2.5" stroke="#f9f7f3" stroke-width="1.4" fill="none" opacity="0.9"/>
  <path d="M12 12v8M16 12v8M20 12v5" stroke="#f9f7f3" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="20" cy="21" r="1.5" fill="#1f9c82"/>
`;

function iconHtml(size, padding = 0) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:transparent}
    svg{display:block;width:${size - padding * 2}px;height:${size - padding * 2}px;margin:${padding}px}
  </style></head><body>
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">${SEAL}</svg>
  </body></html>`;
}

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:sys;src:local("Microsoft YaHei"),local("PingFang SC")}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#f9f7f3;font-family:sys,-apple-system,"Segoe UI",sans-serif;color:#141413;
       display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;
       background-image:radial-gradient(at 12% 4%, rgba(31,156,130,.10) 0px, transparent 42%),
                        radial-gradient(at 88% 2%, rgba(207,85,61,.07) 0px, transparent 38%),
                        linear-gradient(to right, rgba(20,20,19,.045) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(20,20,19,.045) 1px, transparent 1px)}
  .top{display:flex;align-items:center;gap:18px}
  .mark{width:76px;height:76px}
  .name{font-size:34px;font-weight:600;letter-spacing:-.5px}
  h1{font-size:74px;line-height:1.14;letter-spacing:-2px;font-weight:600;max-width:960px}
  h1 em{font-style:italic;font-family:Georgia,"Songti SC",serif;color:#126455;font-weight:500}
  p{font-size:27px;color:#54544c;line-height:1.55;max-width:900px}
  .bottom{display:flex;align-items:center;justify-content:space-between;font-size:22px;color:#6b6b62}
  .chips{display:flex;gap:12px}
  .chip{border:1px solid rgba(20,20,19,.12);border-radius:999px;padding:9px 20px;font-size:20px;background:rgba(255,255,255,.6)}
  .stats{display:flex;gap:44px}
  .stat b{display:block;font-size:40px;font-weight:600;letter-spacing:-1px}
  .stat span{font-size:19px;color:#8a8a80}
</style></head><body>
  <div class="top">
    <svg class="mark" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">${SEAL}</svg>
    <div class="name">抹布工具箱 · Mabu Toolbox</div>
  </div>
  <div>
    <h1>日常小工具，<em>打开就能用</em></h1>
    <p style="margin-top:26px">41 个免费在线工具：PDF、图片、OCR、音视频、文本处理。<br/>文件不上传，全部在你的浏览器里完成。</p>
  </div>
  <div class="bottom">
    <div class="chips"><span class="chip">无需注册</span><span class="chip">免费</span><span class="chip">本地处理</span></div>
    <div class="stats">
      <div class="stat"><b>41</b><span>个工具</span></div>
      <div class="stat"><b>0</b><span>个文件上传</span></div>
      <div class="stat"><b>100%</b><span>浏览器本地</span></div>
    </div>
  </div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});

async function shot(html, width, height, file, transparent = true) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
  console.log('  ✓', path.relative(ROOT, file), fs.statSync(file).size, 'bytes');
}

await shot(iconHtml(192), 192, 192, path.join(OUT, 'icon-192.png'));
await shot(iconHtml(512), 512, 512, path.join(OUT, 'icon-512.png'));
// maskable：图标留出安全区（约 20% padding）
await shot(iconHtml(512, 64), 512, 512, path.join(OUT, 'icon-512-maskable.png'));
await shot(iconHtml(180), 180, 180, path.join(OUT, 'apple-touch-icon.png'));
await shot(ogHtml, 1200, 630, path.join(ROOT, 'public', 'og-cover.png'), false);

await browser.close();
console.log('done');
