/**
 * 移动端触控测试
 * 在 iPhone 尺寸 + 触屏 + 移动 UA 下验证：
 *  1. 无横向溢出（scrollWidth <= clientWidth）
 *  2. 触控目标 ≥ 44px（Apple HIG 最小可点击尺寸）
 *  3. 关键交互可点击（菜单、搜索、工具卡、分段控件、按钮）
 *  4. 表单控件字号 ≥ 16px（避免 iOS 自动放大）
 *  5. 页面关键内容可见（不被遮挡）
 *
 * 用法：node tests/mobile.cjs [--only=slug1,slug2]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5188';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS = path.join(process.cwd(), 'tests', 'mobile-shots');
const REPORT = path.join(process.cwd(), 'tests', 'mobile-report.json');

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const DEVICES = [
  { name: 'iPhone-13', width: 390, height: 844, dpr: 3 },
  { name: 'iPhone-SE', width: 375, height: 667, dpr: 2 },
  { name: 'Android-Small', width: 360, height: 740, dpr: 2.6 },
];

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

const results = [];
let browser;
let page;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 页面度量 ---------------- */

async function measure() {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

    // 找出造成横向溢出的元素
    const overflowing = [];
    if (sw > vw + 1) {
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 2 && r.left >= -2) {
          const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
          overflowing.push({ tag: el.tagName, cls, right: Math.round(r.right), w: Math.round(r.width) });
        }
      });
    }

    // 触控目标尺寸：按钮严格 ≥44；文字链 ≥28（纯文字导航可接受更小但要有间距）
    const smallButtons = [];
    const smallLinks = [];
    document.querySelectorAll('button, input[type=checkbox], input[type=range], select, a[href]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (el.closest('[aria-hidden="true"]')) return;
      const item = {
        tag: el.tagName,
        text: (el.textContent || el.getAttribute('aria-label') || el.type || '').trim().slice(0, 24),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
      if (el.tagName === 'A') {
        if (r.height < 28) smallLinks.push(item);
      } else if (Math.min(r.width, r.height) < 44) {
        smallButtons.push(item);
      }
    });


    // 输入框字号（iOS <16px 会自动放大）
    const tinyInputs = [];
    document.querySelectorAll('input:not([type=checkbox]):not([type=range]):not([type=file]), textarea, select').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      if (fs > 0 && fs < 16) tinyInputs.push({ tag: el.tagName, type: el.type || '', fs });
    });

    // 固定/粘性元素是否遮挡内容
    const header = document.querySelector('header');
    const headerH = header ? Math.round(header.getBoundingClientRect().height) : 0;

    return {
      vw,
      sw,
      overflow: sw > vw + 1,
      overflowing: overflowing.slice(0, 8),
      smallTargets: smallButtons.slice(0, 10),
      smallLinks: smallLinks.slice(0, 6),
      smallCount: smallButtons.length,
      smallLinkCount: smallLinks.length,
      tinyInputs: tinyInputs.slice(0, 6),
      headerH,
      scrollH: document.documentElement.scrollHeight,
    };
  });
}

/* ---------------- 交互 ---------------- */

async function tapText(text) {
  return page.evaluate((label) => {
    const pool = [...document.querySelectorAll('button, a, [role=button]')].filter(
      (b) => b.textContent.trim() === label && b.offsetParent !== null && !b.disabled,
    );
    if (!pool.length) return false;
    pool[0].click();
    return true;
  }, text);
}

async function tapSelector(sel) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  await wait(500);
  return ok;
}

/* ---------------- 用例 ---------------- */

const checks = {
  home: async (record) => {
    const m = await measure();
    record.metrics = m;
    record.check('首页无横向溢出', !m.overflow, m.overflow ? `scrollWidth ${m.sw} > ${m.vw}` : `${m.vw}px`);
    record.check('首屏标题可见', (await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return false;
      const r = h1.getBoundingClientRect();
      return r.top < window.innerHeight && r.height > 20;
    })), '');

    // 移动菜单
    const opened = await tapSelector('button[aria-label="菜单"]');
    await wait(500);
    // 取「可见」的那个链接（页头桌面导航与移动菜单里各有一个）
    const menuVisible = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].filter((a) => a.textContent.trim() === '全部工具');
      return links.some((a) => a.getBoundingClientRect().height > 0);
    });
    record.check('汉堡菜单可打开', opened && menuVisible, '');
    await page.screenshot({ path: path.join(SHOTS, `home-menu.png`) });
    await tapSelector('button[aria-label="菜单"]');
    await wait(300);
  },

  tools: async (record) => {
    const m = await measure();
    record.metrics = m;
    record.check('工具列表无横向溢出', !m.overflow, m.overflow ? `scrollWidth ${m.sw}` : '');
    record.check('列表卡片可点击', (await page.evaluate(() => !!document.querySelector('a[href*="/tools/"]'))), '');
    record.check('分类筛选按钮可用', (await tapText('图片工具')), '');
    await wait(400);
    const filtered = await page.evaluate(() => document.querySelectorAll('a[href*="/tools/"]').length);
    record.check('分类筛选生效', filtered > 0 && filtered < 41, `${filtered} 个结果`);
  },

  search: async (record) => {
    // 移动端搜索按钮
    const btn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('搜索工具'));
      if (!b) return false;
      b.click();
      return true;
    });
    await wait(600);
    const paletteOpen = await page.evaluate(() => !!document.querySelector('[role=dialog]'));
    record.check('搜索面板可在移动端打开', btn && paletteOpen, '');
    if (paletteOpen) {
      await page.type('[role=dialog] input', '压缩');
      await wait(500);
      const hits = await page.evaluate(() => {
        const d = document.querySelector('[role=dialog]');
        return d ? [...d.querySelectorAll('button')].filter((b) => b.textContent.includes('压缩')).length : 0;
      });
      record.check('移动端搜索有结果', hits > 0, `${hits} 条`);
      await page.screenshot({ path: path.join(SHOTS, 'search.png') });
      await page.keyboard.press('Escape');
    }
  },

  /** 工具页通用检查：溢出、触控、字号 */
  toolPage: async (record, slug) => {
    const m = await measure();
    record.metrics = m;
    record.check('无横向溢出', !m.overflow, m.overflow ? `超出 ${m.sw - m.vw}px；${JSON.stringify(m.overflowing[0] || {})}` : '');
    record.check('触控目标基本达标', m.smallCount <= 6, `小于 44px 的元素 ${m.smallCount} 个`);
    record.check('输入控件字号 ≥16px', m.tinyInputs.length === 0, m.tinyInputs.length ? JSON.stringify(m.tinyInputs[0]) : '');
    record.check('工具主体已渲染', (await page.evaluate(() => {
      const dz = document.querySelector('.dropzone');
      const field = document.querySelector('textarea, input.input, input[type=number], input[type=text], select, canvas');
      return !!(dz || field);
    })), '');
  },
};

/* ---------------- 主流程 ---------------- */

let current = '';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 40000,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();

  const device = DEVICES[0];
  await page.setViewport({
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.dpr,
    isMobile: true,
    hasTouch: true,
  });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  );

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/libheif|jsdelivr|unpkg|favicon|Failed to load resource|net::ERR|Password field/.test(t)) return;
    errors.push(t);
  });

  function makeRecord(name) {
    const record = { name, checks: [], metrics: null };
    record.check = (label, ok, detail = '') => {
      record.checks.push({ label, ok: !!ok, detail: String(detail) });
      console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
    };
    return record;
  }

  // 1) 页面级
  for (const [name, fn] of Object.entries(checks)) {
    if (name === 'toolPage') continue;
    current = name;
    console.log(`== ${name}（${device.name} ${device.width}×${device.height}）==`);
    const record = makeRecord(name);
    try {
      const target = name === 'home' ? '' : name === 'tools' ? '/tools' : '';
      await page.goto(`${BASE}/?m=${Date.now()}#${target}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.evaluate((d) => window.scrollTo(0, 0), device.height);
      await wait(800);
      await fn(record);
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    } catch (e) {
      record.fatal = String(e.message || e);
      console.log(`  ✗ 执行失败 — ${record.fatal}`);
    }
    if (errors.length) record.pageErrors = [...new Set(errors)].slice(0, 5);
    errors.length = 0;
    results.push(record);
    console.log('');
  }

  // 2) 41 个工具页
  const list = only ? slugs.filter((s) => only.includes(s)) : slugs;
  console.log(`== 工具页触控检查（${list.length} 个）==`);
  for (const slug of list) {
    current = slug;
    const record = makeRecord(slug);
    try {
      await page.goto(`${BASE}/?m=${Date.now()}#/tools/${slug}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await wait(700);
      await checks.toolPage(record, slug);
      if (['pdf-merge', 'json-format', 'qrcode', 'unit-convert'].includes(slug)) {
        await page.screenshot({ path: path.join(SHOTS, `tool-${slug}.png`) });
      }
    } catch (e) {
      record.fatal = String(e.message || e);
      console.log(`  ✗ ${slug} 执行失败 — ${record.fatal}`);
    }
    if (errors.length) record.pageErrors = [...new Set(errors)].slice(0, 3);
    errors.length = 0;
    results.push(record);
  }

  // 3) 多设备抽查首页
  console.log('\n== 多设备首页适配 ==');
  for (const d of DEVICES.slice(1)) {
    await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}/?d=${Date.now()}#`, { waitUntil: 'networkidle2' });
    await wait(600);
    const m = await measure();
    const record = makeRecord(`home-${d.name}`);
    record.metrics = m;
    record.check(`${d.name} 无横向溢出`, !m.overflow, m.overflow ? `${m.sw} > ${m.vw}` : `${d.width}px`);
    record.check(`${d.name} 触控目标达标`, m.smallCount <= 6, `${m.smallCount} 个小元素`);
    results.push(record);
    await page.screenshot({ path: path.join(SHOTS, `home-${d.name}.png`) });
  }

  const failed = results.filter((r) => r.fatal || (r.pageErrors && r.pageErrors.length) || r.checks.some((c) => !c.ok));
  console.log('\n================ 移动端测试汇总 ================');
  console.log(`页面数: ${results.length}  通过: ${results.length - failed.length}  失败: ${failed.length}`);
  for (const f of failed) {
    console.log(`  ✗ ${f.name}${f.fatal ? ' 执行异常: ' + f.fatal : ''}`);
    f.checks.filter((c) => !c.ok).forEach((c) => console.log(`      - ${c.label} ${c.detail}`));
    (f.pageErrors || []).forEach((e) => console.log(`      页面异常: ${e}`));
  }

  fs.writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n报告: ${path.relative(process.cwd(), REPORT)}`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('RUNNER CRASHED', e);
  process.exit(2);
});
