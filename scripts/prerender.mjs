/**
 * 构建后静态预渲染 + SEO 资产生成
 *
 * 做四件事：
 *  1. 为每个路由生成独立 HTML（标题/描述/canonical/OG/JSON-LD + 可抓取的正文）
 *  2. 生成 robots.txt（显式放行主流 AI 爬虫）
 *  3. 生成 sitemap.xml
 *  4. 生成 llms.txt / llms-full.txt（给 AI 爬虫直接读的站点说明）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://kakshinji.github.io/mabu-toolbox').replace(/\/$/, '');
const BASE = process.env.SITE_BASE || '/';
const BASE_PREFIX = BASE.replace(/\/$/, ''); // '' 或 '/mabu-toolbox'
const SITE_NAME = '抹布工具箱';
const NOW = new Date().toISOString().slice(0, 10);

/* ---------------- 载入数据 ---------------- */

const bundlePath = path.join(ROOT, 'node_modules', '.cache', 'seo-data.mjs');
fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
await build({
  entryPoints: [path.join(ROOT, 'scripts', 'seo-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: bundlePath,
  logLevel: 'error',
});
const { tools, categories, toolsByCategory, toolBySlug, toolSeo, categorySeo, siteSeo } = await import(
  `file://${bundlePath.replace(/\\/g, '/')}`
);

/* ---------------- 工具函数 ---------------- */

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const url = (p) => `${SITE_URL}${p}`; // SITE_URL 已包含部署子路径
const href = (p) => `${BASE_PREFIX}${p}`;

const rawTemplate = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (rawTemplate.includes('class="prerender-header"')) {
  console.error('[prerender] dist/index.html 已经是预渲染结果，请先重新执行 vite build');
  process.exit(1);
}
const template = rawTemplate;

function headTags({ title, description, keywords, p, jsonLd, type = 'website' }) {
  // 描述过短时补充站点通用信息，控制在 60–160 字符（中文按字符计）
  let desc = description || '';
  if (desc.length < 60) {
    const suffix = '免费使用，无需注册，文件在浏览器本地处理，不上传服务器。';
    desc = desc.replace(/[。.]?$/, '。') + suffix;
  }
  if (desc.length > 160) desc = desc.slice(0, 157) + '…';
  description = desc;

  const canonical = url(p);
  const image = url('/og-cover.png');
  const blocks = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    keywords?.length ? `<meta name="keywords" content="${esc(keywords.join(','))}" />` : '',
    `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${canonical}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="zh_CN" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ];
  return blocks.filter(Boolean).join('\n    ');
}

function navHtml() {
  return `<header class="prerender-header">
      <a href="${href('/')}"><strong>${SITE_NAME}</strong></a>
      <nav aria-label="主导航">
        <a href="${href('/tools/')}">全部工具</a>
        ${categories.map((c) => `<a href="${href(`/category/${c.id}/`)}">${esc(c.name)}</a>`).join('')}
        <a href="${href('/about/')}">关于</a>
      </nav>
    </header>`;
}

function footerHtml() {
  return `<footer class="prerender-footer">
      <p><strong>${SITE_NAME}</strong> · ${tools.length} 个免费在线工具，文件不上传，全部在浏览器本地处理。</p>
      <nav aria-label="全部工具索引">
        ${categories
          .map(
            (c) =>
              `<div><h3><a href="${href(`/category/${c.id}/`)}">${esc(c.name)}</a></h3><ul>${toolsByCategory(c.id)
                .map((t) => `<li><a href="${href(`/tools/${t.slug}/`)}">${esc(t.name)}</a></li>`)
                .join('')}</ul></div>`,
          )
          .join('')}
      </nav>
      <p><a href="${href('/about/')}">关于本站</a> · <a href="${href('/llms.txt')}">llms.txt</a> · <a href="${href('/sitemap.xml')}">Sitemap</a></p>
    </footer>`;
}

const PRERENDER_CSS = `<style>
.prerender-header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;max-width:1120px;margin:0 auto;padding:16px 24px;border-bottom:1px solid rgba(20,20,19,.08)}
.prerender-header nav{display:flex;flex-wrap:wrap;gap:14px;font-size:14px}
.prerender-header a{color:#292926;text-decoration:none}
.prerender-main{max-width:1120px;margin:0 auto;padding:32px 24px}
.prerender-main h1{font-size:30px;margin:0 0 8px}
.prerender-main h2{font-size:19px;margin:28px 0 10px}
.prerender-main ul,.prerender-main ol{padding-left:20px;line-height:1.9}
.prerender-main a{color:#126455}
.prerender-main dl{margin:0}
.prerender-main dt{font-weight:600;margin-top:14px}
.prerender-main dd{margin:4px 0 0;color:#40403a;line-height:1.8}
.prerender-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));padding:0;list-style:none}
.prerender-cards li{border:1px solid rgba(20,20,19,.08);border-radius:12px;padding:14px}
.prerender-cards a{font-weight:600;text-decoration:none}
.prerender-cards p{margin:6px 0 0;font-size:13px;color:#54544c;line-height:1.6}
.prerender-footer{max-width:1120px;margin:40px auto 0;padding:24px;border-top:1px solid rgba(20,20,19,.08);font-size:13px;color:#54544c}
.prerender-footer nav{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));margin:18px 0}
.prerender-footer h3{font-size:13px;margin:0 0 6px}
.prerender-footer ul{list-style:none;padding:0;margin:0;line-height:1.9}
.prerender-footer a{color:#292926;text-decoration:none}
</style>`;

function toolListHtml(items) {
  return `<ul class="prerender-cards">${items
    .map(
      (t) =>
        `<li><a href="${href(`/tools/${t.slug}/`)}">${esc(t.name)}</a><p>${esc(t.desc)}</p></li>`,
    )
    .join('')}</ul>`;
}

/* ---------------- 各页面正文 ---------------- */

function homeMain() {
  return `<main class="prerender-main">
    <h1>${SITE_NAME} · ${tools.length} 个免费在线小工具</h1>
    <p>${esc(siteSeo.description)}</p>
    <h2>为什么用这个站</h2>
    <ul>
      <li>文件不上传：所有处理在浏览器本地完成，没有后端服务器，也没有文件上传接口。</li>
      <li>无需注册、无使用次数限制、不加水印。</li>
      <li>每个工具都有独立页面，说明用途、使用方式与常见问题。</li>
    </ul>
    <h2>全部工具</h2>
    ${categories
      .map(
        (c) =>
          `<h3><a href="${href(`/category/${c.id}/`)}">${esc(categorySeo[c.id]?.title ?? c.name)}</a></h3>${toolListHtml(
            toolsByCategory(c.id),
          )}`,
      )
      .join('')}
  </main>`;
}

function toolsMain() {
  return `<main class="prerender-main">
    <h1>全部 ${tools.length} 个免费在线工具</h1>
    <p>按分类浏览，或直接进入具体工具页。全部工具均在浏览器本地运行，不上传文件、无需注册。</p>
    ${categories
      .map(
        (c) =>
          `<h2><a href="${href(`/category/${c.id}/`)}">${esc(categorySeo[c.id]?.title ?? c.name)}</a></h2>
           <p>${esc(categorySeo[c.id]?.intro ?? c.desc)}</p>${toolListHtml(toolsByCategory(c.id))}`,
      )
      .join('')}
  </main>`;
}

function categoryMain(c) {
  const seo = categorySeo[c.id];
  const items = toolsByCategory(c.id);
  return `<main class="prerender-main">
    <h1>${esc(seo?.title ?? c.name)}</h1>
    <p>${esc(seo?.intro ?? c.desc)}</p>
    <p>共 ${items.length} 个工具，全部免费、无需注册，文件在浏览器本地处理。</p>
    <h2>本分类的工具</h2>
    ${toolListHtml(items)}
    ${seo ? `<h2>适合谁用</h2><ul>${seo.audience.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${seo ? `<h2>常见问题</h2><dl>${seo.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>` : ''}
    <h2>其它分类</h2>
    <ul>${categories
      .filter((x) => x.id !== c.id)
      .map((x) => `<li><a href="${href(`/category/${x.id}/`)}">${esc(x.name)}</a></li>`)
      .join('')}</ul>
  </main>`;
}

function toolMain(t) {
  const seo = toolSeo[t.id];
  const cat = categories.find((c) => c.id === t.category);
  const related = tools.filter((x) => x.category === t.category && x.id !== t.id).slice(0, 6);
  return `<main class="prerender-main">
    <nav aria-label="面包屑"><a href="${href('/')}">首页</a> › <a href="${href(`/category/${t.category}/`)}">${esc(cat?.name ?? '')}</a> › <span>${esc(t.name)}</span></nav>
    <h1>${esc(t.name)}</h1>
    <p>${esc(seo?.intro ?? t.desc)}</p>
    <p>免费使用，无需注册；文件在浏览器本地处理，不会上传到服务器。</p>
    ${seo ? `<h2>功能特点</h2><ul>${seo.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${seo ? `<h2>常见问题</h2><dl>${seo.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>` : ''}
    <h2>同类工具</h2>
    <ul>${related.map((r) => `<li><a href="${href(`/tools/${r.slug}/`)}">${esc(r.name)}</a> — ${esc(r.desc)}</li>`).join('')}</ul>
    <p>所属分类：<a href="${href(`/category/${t.category}/`)}">${esc(cat?.name ?? '')}</a></p>
  </main>`;
}

function aboutMain() {
  return `<main class="prerender-main">
    <h1>关于${SITE_NAME}</h1>
    <p>一个不用注册、没有广告的在线工具箱。所有文件都在你自己的浏览器里处理，不会上传到任何服务器。</p>
    <h2>隐私说明</h2>
    <p>除 OCR 与音视频工具需要首次从公共 CDN 下载识别模型或转码引擎外，其余工具全部使用浏览器本地能力完成，文件不会离开你的设备。本站没有后端服务器，也没有数据库。</p>
    <h2>使用限制</h2>
    <ul>
      <li>PDF 与图片工具建议单个文件不超过 200MB，超大文件可能因浏览器内存不足失败。</li>
      <li>音视频工具受 WebAssembly 性能限制，建议视频不超过 200MB 或 5 分钟。</li>
      <li>OCR 首次使用需要下载约 1.7MB 语言模型，之后走浏览器缓存。</li>
      <li>Word 转 PDF 只做文字重排，复杂版式与中文字体需要桌面软件。</li>
    </ul>
    <h2>常见问题</h2>
    <dl>
      <dt>真的免费吗？</dt><dd>免费，无使用次数限制，也不要求注册。</dd>
      <dt>断网能用吗？</dt><dd>页面加载完成后，PDF、图片、文本类工具可以离线使用；OCR 与音视频首次需要联网下载引擎。</dd>
      <dt>会记录我的文件吗？</dt><dd>不会。没有服务器，也没有任何文件上传接口。</dd>
    </dl>
  </main>`;
}

/* ---------------- 生成页面 ---------------- */

const pages = [];

function addPage(p, { title, description, keywords, jsonLd, main, type }) {
  pages.push({ p, title, description, keywords, jsonLd, main, type });
}

addPage('/', {
  title: `${SITE_NAME} · ${tools.length} 个免费在线小工具，文件不上传`,
  description: siteSeo.description,
  keywords: siteSeo.keywords,
  type: 'website',
  main: homeMain(),
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: 'Mabu Toolbox',
      url: url('/'),
      description: siteSeo.description,
      inLanguage: 'zh-CN',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${url('/tools/')}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '全部在线工具',
      numberOfItems: tools.length,
      itemListElement: tools.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: t.name,
        url: url(`/tools/${t.slug}/`),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: url('/'),
      logo: url('/icons/icon-512.png'),
    },
  ],
});

addPage('/tools/', {
  title: `全部工具（${tools.length} 个）· 免费在线工具`,
  description: `抹布工具箱全部 ${tools.length} 个免费在线工具，涵盖 PDF、图片、OCR、音视频、文本处理、编码加密、开发辅助与生活计算。全部在浏览器本地运行，不上传文件。`,
  keywords: ['全部工具', '在线工具列表', '免费在线工具箱', '本地处理'],
  type: 'CollectionPage',
  main: toolsMain(),
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `全部工具（${tools.length} 个）`,
      url: url('/tools/'),
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tools.length,
        itemListElement: tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name,
          url: url(`/tools/${t.slug}/`),
        })),
      },
    },
  ],
});

addPage('/about/', {
  title: `关于本站 · 隐私说明与使用限制`,
  description:
    '抹布工具箱是一个纯前端在线工具箱：所有工具都在浏览器本地运行，文件不上传、无后端、无数据库、无需注册。这里说明隐私策略、大小限制与常见问题。',
  keywords: ['抹布工具箱', '隐私说明', '在线工具箱', '本地处理'],
  type: 'AboutPage',
  main: aboutMain(),
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `关于${SITE_NAME}`,
    url: url('/about/'),
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') },
  },
});

for (const c of categories) {
  const seo = categorySeo[c.id];
  const items = toolsByCategory(c.id);
  addPage(`/category/${c.id}/`, {
    title: `${seo?.title ?? c.name}（${items.length} 个工具）· 免费在线使用`,
    description: `${seo?.intro ?? c.desc} 共 ${items.length} 个工具，免费无需注册，文件在浏览器本地处理。`,
    keywords: [seo?.title ?? c.name, `${c.name}在线`, '免费在线工具', '本地处理'],
    type: 'CollectionPage',
    main: categoryMain(c),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: seo?.title ?? c.name,
        description: seo?.intro ?? c.desc,
        url: url(`/category/${c.id}/`),
        inLanguage: 'zh-CN',
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.name,
            url: url(`/tools/${t.slug}/`),
          })),
        },
      },
    ],
  });
}

for (const t of tools) {
  const seo = toolSeo[t.id];
  const cat = categories.find((c) => c.id === t.category);
  const faq = seo?.faq ?? [];
  addPage(`/tools/${t.slug}/`, {
    title: `${t.name} · 免费在线使用`,
    description: seo?.intro ?? t.desc,
    keywords: seo?.keywords ?? [t.name, ...t.keywords],
    type: 'website',
    main: toolMain(t),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${t.name} - ${SITE_NAME}`,
        description: seo?.intro ?? t.desc,
        url: url(`/tools/${t.slug}/`),
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (Web Browser)',
        browserRequirements: '需要支持 WebAssembly 的现代浏览器',
        inLanguage: 'zh-CN',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
        featureList: seo?.features ?? [],
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: url('/') },
          { '@type': 'ListItem', position: 2, name: cat?.name ?? '', item: url(`/category/${t.category}/`) },
          { '@type': 'ListItem', position: 3, name: t.name, item: url(`/tools/${t.slug}/`) },
        ],
      },
      ...(faq.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ]
        : []),
    ],
  });
}

let written = 0;
for (const page of pages) {
  const head = headTags(page);
  const body = `${PRERENDER_CSS}
${navHtml()}
${page.main}
${footerHtml()}`;

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[\s\S]*?\/>/, '')
    .replace(/\s*<meta name="keywords"[\s\S]*?\/>/, '')
    .replace('</head>', `  ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  const dest = page.p === '/' ? path.join(DIST, 'index.html') : path.join(DIST, page.p.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html, 'utf8');
  written += 1;
}

/* ---------------- robots.txt ---------------- */

const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'cohere-ai',
  'YouBot',
  'Bingbot',
  'DuckDuckBot',
  'Baiduspider',
  'YisouSpider',
  'Sogou web spider',
];

const robots = `# ${SITE_NAME}
# ${tools.length} 个免费在线工具，文件不上传，全部在浏览器本地处理。
# 全站允许抓取，包括用于 AI 搜索与模型训练目的的爬虫。

User-agent: *
Allow: /

${AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n')}

# 站点地图与 AI 友好索引
Sitemap: ${url('/sitemap.xml')}
# 结构化站点说明（供 LLM 读取）
# ${url('/llms.txt')}
`;
fs.writeFileSync(path.join(DIST, 'robots.txt'), robots, 'utf8');

/* ---------------- sitemap.xml ---------------- */

const priority = (p) => {
  if (p === '/') return '1.0';
  if (p === '/tools/') return '0.9';
  if (p.startsWith('/category/')) return '0.8';
  if (p.startsWith('/tools/')) return '0.7';
  return '0.4';
};
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map(
    (p) => `  <url>
    <loc>${url(p.p)}</loc>
    <lastmod>${NOW}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority(p.p)}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

/* ---------------- llms.txt / llms-full.txt ---------------- */

const llms = `# ${SITE_NAME}

> ${siteSeo.description}

${SITE_NAME}是一个纯前端（无后端、无数据库）的在线工具箱，共 ${tools.length} 个工具。所有文件处理都在用户浏览器内存中完成，不会上传到服务器，无需注册，免费且无使用次数限制。

## 基本信息

- 站点名称：${SITE_NAME}（Mabu Toolbox）
- 地址：${url('/')}
- 语言：简体中文（zh-CN）
- 工具数量：${tools.length}
- 收费：完全免费
- 隐私：无后端，文件不上传；仅 OCR 与音视频首次需从 CDN 下载模型/引擎
- 技术栈：React + TypeScript + Vite，WebAssembly（ffmpeg.wasm、Tesseract、libheif、pdf-lib、pdf.js）

## 分类与工具

${categories
  .map(
    (c) => `### ${categorySeo[c.id]?.title ?? c.name}

${categorySeo[c.id]?.intro ?? c.desc}

${toolsByCategory(c.id)
  .map((t) => `- [${t.name}](${url(`/tools/${t.slug}/`)}): ${toolSeo[t.id]?.intro ?? t.desc}`)
  .join('\n')}`,
  )
  .join('\n\n')}

## 使用方式

打开对应工具页面，把文件拖入页面或点击选择，处理完成后点击下载。全部运算在浏览器完成，关闭页面即释放内存。

## 隐私与限制

- 没有后端服务器，也没有任何文件上传接口，可在浏览器开发者工具的 Network 面板验证
- PDF/图片建议单文件不超过 200MB；音视频建议不超过 200MB 或 5 分钟
- Word 转 PDF 仅做文字重排，复杂版式与中文字体需要桌面软件
- OCR 依赖 Tesseract 引擎，印刷体效果较好，手写体准确率有限

## 页面索引

- [首页](${url('/')})
- [全部工具](${url('/tools/')})
- [关于与隐私说明](${url('/about/')})
${categories.map((c) => `- [${c.name}](${url(`/category/${c.id}/`)})`).join('\n')}
- [Sitemap](${url('/sitemap.xml')})

## 许可

站点代码以 MIT License 开源：https://github.com/kakshinji/mabu-toolbox
`;

fs.writeFileSync(path.join(DIST, 'llms.txt'), llms, 'utf8');

const llmsFull = `# ${SITE_NAME} 完整内容

> ${siteSeo.description}

${tools
  .map((t) => {
    const seo = toolSeo[t.id];
    const cat = categories.find((c) => c.id === t.category);
    return `## ${t.name}

- 页面：${url(`/tools/${t.slug}/`)}
- 分类：${cat?.name ?? ''}
- 简介：${seo?.intro ?? t.desc}
- 关键词：${(seo?.keywords ?? t.keywords).join('、')}
${seo ? `\n### 功能特点\n\n${seo.features.map((f) => `- ${f}`).join('\n')}` : ''}
${seo ? `\n### 常见问题\n\n${seo.faq.map((f) => `**${f.q}**\n\n${f.a}`).join('\n\n')}` : ''}
`;
  })
  .join('\n')}
`;
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), llmsFull, 'utf8');

/* ---------------- 404.html（GitHub Pages 兜底） ---------------- */

const notFound = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>页面不存在 · ${SITE_NAME}</title>
<link rel="canonical" href="${url('/')}" />
<style>
body{font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:#f9f7f3;color:#292926;display:grid;place-items:center;min-height:100vh;margin:0}
main{max-width:520px;padding:32px;text-align:center}
h1{font-size:24px;margin:0 0 12px}
p{color:#54544c;line-height:1.8}
a{color:#126455}
</style>

</head>
<body>
<main>
  <h1>页面不存在</h1>
  <p>这个地址没有对应的页面，可能已经改名或删除。</p>
  <p><a href="${href('/')}">返回首页</a> · <a href="${href('/tools/')}">浏览全部工具</a></p>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(DIST, '404.html'), notFound, 'utf8');

/* ---------------- IndexNow 校验文件 ---------------- */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'mabutoolbox2026indexnowkey';
fs.writeFileSync(path.join(DIST, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf8');

console.log(`[prerender] 生成 ${written} 个页面`);
console.log(`[prerender] robots.txt / sitemap.xml / llms.txt / llms-full.txt / 404.html 已生成`);
console.log(`[prerender] 站点地址: ${SITE_URL}${BASE_PREFIX}/`);
console.log(`[prerender] IndexNow key: ${INDEXNOW_KEY}`);
