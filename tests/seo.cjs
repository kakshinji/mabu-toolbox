/**
 * SEO / 可抓取性验证
 *
 * 直接抓取静态 HTML（不执行 JS），检查爬虫能看到什么：
 *  1. sitemap 每个 URL 都 200，且 canonical 与自身一致
 *  2. 每页有唯一 title / description / 唯一 H1
 *  3. 正文内容在原始 HTML 里（不依赖 JS 渲染）
 *  4. JSON-LD 能被解析
 *  5. robots.txt 放行主流 AI 爬虫并声明 sitemap
 *  6. llms.txt / llms-full.txt 可用
 *
 * 用法：node tests/seo.cjs [--base=http://localhost:5188]
 */
const BASE = (process.argv.find((a) => a.startsWith('--base=')) || '').split('=')[1] || 'http://localhost:5188';
// sitemap 里是部署后的绝对地址，本地测试时需要换算回站内路径
const SITE_ROOT = (process.argv.find((a) => a.startsWith('--root=')) || '').split('=')[1] || 'https://kakshinji.github.io/mabu-toolbox';

const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, text: await res.text() };
}

const unescape = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

function textOf(html) {
  return unescape(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim();
}

(async () => {
  console.log(`\n== 基础文件（${BASE}）==`);

  const robots = await get(`${BASE}/robots.txt`);
  check('robots.txt 可访问', robots.status === 200, `HTTP ${robots.status}`);
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Bingbot']) {
    check(`robots.txt 放行 ${bot}`, robots.text.includes(`User-agent: ${bot}`));
  }
  check('robots.txt 声明 sitemap', /Sitemap:\s*https?:\/\//.test(robots.text));

  const sitemap = await get(`${BASE}/sitemap.xml`);
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check('sitemap.xml 可访问', sitemap.status === 200, `HTTP ${sitemap.status}`);
  check('sitemap 包含 50+ URL', locs.length >= 50, `${locs.length} 条`);

  const llms = await get(`${BASE}/llms.txt`);
  check('llms.txt 可访问', llms.status === 200, `HTTP ${llms.status}, ${llms.text.length} 字符`);
  check('llms.txt 以标题开头', llms.text.startsWith('# '));
  check('llms.txt 含工具链接', (llms.text.match(/https?:\/\/[^)\s]+\/tools\//g) || []).length >= 30);

  const llmsFull = await get(`${BASE}/llms-full.txt`);
  check('llms-full.txt 可访问', llmsFull.status === 200, `${llmsFull.text.length} 字符`);

  const notFound = await get(`${BASE}/404.html`);
  check('404.html 存在', notFound.status === 200 && notFound.text.includes('noindex'));

  // 逐个 URL 检查
  console.log(`\n== 页面检查（${locs.length} 个 URL）==`);
  const titles = new Map();
  const descs = new Map();
  const problems = [];

  for (const loc of locs) {
    const path = loc.startsWith(SITE_ROOT) ? loc.slice(SITE_ROOT.length) || '/' : new URL(loc).pathname;
    const res = await get(`${BASE}${path}`);
    const html = res.text;
    const issues = [];

    if (res.status !== 200) issues.push(`HTTP ${res.status}`);

    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => textOf(m[1]));

    if (!title) issues.push('缺 title');
    if (title.length > 70) issues.push(`title 过长(${title.length})`);
    if (!desc) issues.push('缺 description');
    if (desc && (desc.length < 40 || desc.length > 220)) issues.push(`description 长度异常(${desc.length})`);
    if (!canonical) issues.push('缺 canonical');
    if (h1s.length !== 1) issues.push(`H1 数量=${h1s.length}`);
    if (!/og:title/.test(html)) issues.push('缺 og:title');
    if (!/og:image/.test(html)) issues.push('缺 og:image');
    if (!/application\/ld\+json/.test(html)) issues.push('缺 JSON-LD');

    // canonical 应与 sitemap 中的地址一致（允许末尾斜杠差异）
    const canonPath = canonical ? new URL(canonical).pathname.replace(/^\/mabu-toolbox/, '') || '/' : '';
    if (canonical && canonPath.replace(/\/$/, '') !== path.replace(/\/$/, '')) {
      issues.push(`canonical 不匹配: ${canonical}`);
    }

    // JSON-LD 可解析
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ld) {
      try {
        JSON.parse(ld[1]);
      } catch (e) {
        issues.push('JSON-LD 解析失败');
      }
    }

    // 正文不依赖 JS
    const body = textOf(html);
    if (body.length < 300) issues.push(`正文过短(${body.length})`);

    // title / description 唯一性
    if (titles.has(title)) issues.push(`title 与 ${titles.get(title)} 重复`);
    else titles.set(title, path);
    if (descs.has(desc)) issues.push(`description 与 ${descs.get(desc)} 重复`);
    else descs.set(desc, path);

    if (issues.length) problems.push(`${path}: ${issues.join('; ')}`);
  }

  check('所有 sitemap URL 均 200', problems.filter((p) => p.includes('HTTP')).length === 0);
  check('所有页面 title 唯一', [...titles.keys()].length === locs.length - 0 || problems.filter((p) => p.includes('重复')).length === 0, `${titles.size} 个唯一 title`);
  check('所有页面有唯一 H1', problems.filter((p) => p.includes('H1')).length === 0);
  check('所有页面 canonical 正确', problems.filter((p) => p.includes('canonical')).length === 0);
  check('所有页面 JSON-LD 合法', problems.filter((p) => p.includes('JSON-LD')).length === 0);
  check('所有页面正文不依赖 JS', problems.filter((p) => p.includes('正文过短')).length === 0);

  if (problems.length) {
    console.log('\n  问题明细（前 15 条）：');
    problems.slice(0, 15).forEach((p) => console.log('   -', p));
  }

  // 抽查工具页正文是否包含该工具的专属内容
  console.log('\n== 内容抽查 ==');
  const sample = await get(`${BASE}/tools/pdf-merge/`);
  check('工具页含专属功能描述', sample.text.includes('合并') && sample.text.includes('不上传'));
  check('工具页含 FAQ 结构化数据', /FAQPage/.test(sample.text));
  check('工具页含 SoftwareApplication', /SoftwareApplication/.test(sample.text));
  check('工具页含面包屑结构化数据', /BreadcrumbList/.test(sample.text));

  const home = await get(`${BASE}/`);
  check('首页含 WebSite 结构化数据', /"@type":"WebSite"/.test(home.text));
  check('首页列出全部工具链接', (home.text.match(/\/tools\/[a-z0-9-]+\//g) || []).length >= 41);

  const cat = await get(`${BASE}/category/pdf/`);
  check('分类页含分类说明与 FAQ', /适合谁用/.test(cat.text) && /常见问题/.test(cat.text));

  console.log('\n================ SEO 汇总 ================');
  console.log(`检查项: ${results.length}  通过: ${results.length - failures}  失败: ${failures}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('SEO 检查崩溃', e);
  process.exit(2);
});
