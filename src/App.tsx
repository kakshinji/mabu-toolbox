import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useRoute, Link, navigate } from './lib/router';
import { useTitle, useQueryState } from './lib/hooks';
import { tools, categories, toolBySlug, searchTools, toolsByCategory } from './tools/registry';
import type { CategoryId, ToolMeta } from './tools/registry';
import { Icon, Logo } from './components/Icon';
import type { IconName } from './components/Icon';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';

/* ---------- 工具页面按需加载 ---------- */
const toolComponents: Record<string, ComponentType> = {
  'pdf-merge': lazy(() => import('./tools/pages/PdfMerge')),
  'pdf-split': lazy(() => import('./tools/pages/PdfSplit')),
  'pdf-compress': lazy(() => import('./tools/pages/PdfCompress')),
  'pdf-to-image': lazy(() => import('./tools/pages/PdfToImage')),
  'image-to-pdf': lazy(() => import('./tools/pages/ImageToPdf')),
  'pdf-rotate': lazy(() => import('./tools/pages/PdfRotate')),
  'pdf-watermark': lazy(() => import('./tools/pages/PdfWatermark')),
  'pdf-page-number': lazy(() => import('./tools/pages/PdfPageNumber')),
  'pdf-protect': lazy(() => import('./tools/pages/PdfProtect')),
  'image-convert': lazy(() => import('./tools/pages/ImageConvert')),
  'image-compress': lazy(() => import('./tools/pages/ImageCompress')),
  'image-resize': lazy(() => import('./tools/pages/ImageResize')),
  'image-watermark': lazy(() => import('./tools/pages/ImageWatermark')),
  'image-remove-bg': lazy(() => import('./tools/pages/ImageRemoveBg')),
  'image-collage': lazy(() => import('./tools/pages/ImageCollage')),
  'image-base64': lazy(() => import('./tools/pages/ImageBase64')),
  ocr: lazy(() => import('./tools/pages/Ocr')),
  'media-convert': lazy(() => import('./tools/pages/MediaConvert')),
  'video-to-gif': lazy(() => import('./tools/pages/VideoToGif')),
  'video-trim': lazy(() => import('./tools/pages/VideoTrim')),
  'json-format': lazy(() => import('./tools/pages/JsonFormat')),
  'text-clean': lazy(() => import('./tools/pages/TextClean')),
  'regex-test': lazy(() => import('./tools/pages/RegexTest')),
  'markdown-preview': lazy(() => import('./tools/pages/MarkdownPreview')),
  'case-convert': lazy(() => import('./tools/pages/CaseConvert')),
  base64: lazy(() => import('./tools/pages/Base64Tool')),
  'url-codec': lazy(() => import('./tools/pages/UrlCodec')),
  hash: lazy(() => import('./tools/pages/HashTool')),
  jwt: lazy(() => import('./tools/pages/JwtTool')),
  qrcode: lazy(() => import('./tools/pages/QrCode')),
  'barcode-decode': lazy(() => import('./tools/pages/QrDecode')),
  timestamp: lazy(() => import('./tools/pages/Timestamp')),
  color: lazy(() => import('./tools/pages/ColorTool')),
  uuid: lazy(() => import('./tools/pages/UuidTool')),
  cron: lazy(() => import('./tools/pages/CronTool')),
  'doc-to-pdf': lazy(() => import('./tools/pages/DocToPdf')),
  'pdf-to-text': lazy(() => import('./tools/pages/PdfToText')),
  'unit-convert': lazy(() => import('./tools/pages/UnitConvert')),
  'date-calc': lazy(() => import('./tools/pages/DateCalc')),
  finance: lazy(() => import('./tools/pages/Finance')),
  bmi: lazy(() => import('./tools/pages/Bmi')),
};

/* ---------- 分类图标与配色 ---------- */

const categoryIcon: Record<CategoryId, IconName> = {
  pdf: 'file-text',
  image: 'image',
  media: 'film',
  text: 'type',
  encode: 'lock',
  dev: 'code',
  convert: 'repeat',
  life: 'calculator',
};

/** 分类只用低饱和单色，避免全站色彩过载 */
const categoryTint: Record<CategoryId, string> = {
  pdf: 'bg-[#fdf2f2] text-[#b24a4a]',
  image: 'bg-[#fdf7ed] text-[#a2743a]',
  media: 'bg-[#f6f3fb] text-[#6b5b95]',
  text: 'bg-[#eff7f2] text-[#3f7d5c]',
  encode: 'bg-[#eff5fa] text-[#3d6b8e]',
  dev: 'bg-[#f2f2f7] text-[#5a5a72]',
  convert: 'bg-[#eef7f5] text-[#3d7a72]',
  life: 'bg-[#fbf3ee] text-[#9a6244]',
};

const tintClass: Record<string, string> = {
  rose: 'bg-[#fdf2f2] text-[#b24a4a]',
  amber: 'bg-[#fdf7ed] text-[#a2743a]',
  violet: 'bg-[#f6f3fb] text-[#6b5b95]',
  emerald: 'bg-[#eff7f2] text-[#3f7d5c]',
  sky: 'bg-[#eff5fa] text-[#3d6b8e]',
  indigo: 'bg-[#f2f2f7] text-[#5a5a72]',
  teal: 'bg-[#eef7f5] text-[#3d7a72]',
  orange: 'bg-[#fbf3ee] text-[#9a6244]',
};

function ToolGlyph({ tool, size = 'md' }: { tool: ToolMeta; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  const ico = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  return (
    <span
      className={`grid shrink-0 place-items-center transition-transform duration-300 group-hover:scale-[1.04] ${box} ${categoryTint[tool.category]}`}
    >
      <Icon name={(tool.icon as IconName) || categoryIcon[tool.category]} size={ico} strokeWidth={1.6} />
    </span>
  );
}

/* ---------- 顶栏 ---------- */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'border-b border-ink-900/[0.07] bg-paper-50/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="shrink-0" aria-label="抹布工具箱首页">
            <Logo />
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            <Link to="/tools" className="btn-ghost !px-3 !py-2 !text-[13px]">
              全部工具
            </Link>
            <Link to="/tools?c=pdf" className="btn-ghost !px-3 !py-2 !text-[13px]">
              PDF
            </Link>
            <Link to="/tools?c=image" className="btn-ghost !px-3 !py-2 !text-[13px]">
              图片
            </Link>
            <Link to="/about" className="btn-ghost !px-3 !py-2 !text-[13px]">
              关于
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-ink-900/[0.09] bg-white/70 px-0 text-[13px] text-ink-400 shadow-card transition-all duration-200 hover:border-ink-900/20 hover:text-ink-600 sm:h-9 sm:w-52 sm:justify-start sm:px-3"
            >
              <Icon name="search" size={15} />
              <span className="hidden sm:inline">搜索工具…</span>
              <span className="ml-auto hidden items-center gap-0.5 sm:flex">
                <kbd className="kbd">⌘</kbd>
                <kbd className="kbd">K</kbd>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="菜单"
              aria-expanded={open}
              className="grid h-11 w-11 place-items-center rounded-xl border border-ink-900/[0.09] bg-white/70 text-ink-600 shadow-card transition-colors hover:text-ink-900 lg:hidden"
            >
              <Icon name={open ? 'x' : 'menu'} size={17} />
            </button>
          </div>
        </div>

        {open && (
          <div className="animate-fade-in border-t border-ink-900/[0.07] bg-paper-50/95 backdrop-blur-xl lg:hidden">
            <div className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
              <Link to="/tools" className="rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-paper-200" onClick={() => setOpen(false)}>
                全部工具
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/tools?c=${c.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-paper-200"
                  onClick={() => setOpen(false)}
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${tintClass[c.color]}`}>
                    <Icon name={categoryIcon[c.id]} size={14} />
                  </span>
                  {c.name}
                </Link>
              ))}
              <Link to="/about" className="rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-paper-200" onClick={() => setOpen(false)}>
                关于本站
              </Link>
            </div>
          </div>
        )}
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

/* ---------- 页脚 ---------- */
function Footer() {
  return (
    <footer className="border-t border-ink-900/[0.07] bg-paper-50">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-500">
              一个不用注册、没有广告的在线工具箱。所有文件都在你自己的浏览器里处理，不会上传到任何服务器。
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-jade-600/15 bg-jade-50 px-3 py-1.5 text-[11px] font-medium text-jade-700">
              <Icon name="shield" size={13} />
              纯前端 · 无后端 · 无数据库
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <div className="eyebrow mb-3">热门分类</div>
                <ul className="space-y-2.5 text-[13px] text-ink-500">
                  {categories.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <Link to={`/tools?c=${c.id}`} className="transition-colors hover:text-ink-900">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="eyebrow mb-3">常用工具</div>
                <ul className="space-y-2.5 text-[13px] text-ink-500">
                  {['pdf-merge', 'image-convert', 'json-format', 'qrcode'].map((slug) => {
                    const t = toolBySlug(slug);
                    if (!t) return null;
                    return (
                      <li key={slug}>
                        <Link to={`/tools/${slug}`} className="transition-colors hover:text-ink-900">
                          {t.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <div className="eyebrow mb-3">关于</div>
                <ul className="space-y-2.5 text-[13px] text-ink-500">
                  <li>
                    <Link to="/about" className="transition-colors hover:text-ink-900">
                      隐私说明
                    </Link>
                  </li>
                  <li>
                    <Link to="/about#limits" className="transition-colors hover:text-ink-900">
                      使用限制
                    </Link>
                  </li>
                  <li>
                    <Link to="/about#faq" className="transition-colors hover:text-ink-900">
                      常见问题
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-900/[0.07] pt-6 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} 抹布工具箱 · 不收集、不存储任何文件</span>
          <span className="flex items-center gap-1.5">
            用
            <Icon name="heart" size={12} className="text-clay-400" />
            在浏览器里完成
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- 工具卡片 ---------- */
function ToolCard({ tool, index = 0 }: { tool: ToolMeta; index?: number }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="group card card-hover flex animate-fade-up flex-col p-5"
    >
      <div className="flex items-start gap-3.5">
        <ToolGlyph tool={tool} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-ink-900">{tool.name}</h3>
            {tool.hot && (
              <span className="shrink-0 rounded-full bg-clay-50 px-1.5 py-0.5 text-[10px] font-semibold text-clay-500">
                热门
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{tool.desc}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
          {categories.find((c) => c.id === tool.category)?.name}
          {tool.badge && tool.badge !== '本地' && (
            <span className="rounded bg-paper-200 px-1.5 py-0.5 text-[10px] text-ink-500">{tool.badge}</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-medium text-ink-400 transition-colors group-hover:text-jade-700">
          打开
          <Icon name="arrow-right" size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/* ---------- 首页 ---------- */
function Home() {
  const featured = useMemo(() => {
    // 精选：每个分类挑最常用的，保证首屏覆盖面
    const order = ['pdf-merge', 'image-convert', 'ocr', 'json-format', 'qrcode', 'unit-convert', 'image-compress', 'base64'];
    return order.map((s) => toolBySlug(s)).filter(Boolean) as ToolMeta[];
  }, []);

  const stats = [
    { value: String(tools.length), label: '个工具' },
    { value: '0', label: '个文件上传' },
    { value: '0', label: '次注册要求' },
    { value: '100%', label: '本地处理' },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex animate-fade-up items-center gap-2 rounded-full border border-ink-900/[0.08] bg-white/80 px-3.5 py-1.5 text-[12px] font-medium text-ink-600 shadow-card backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade-600" />
              </span>
              文件不上传 · 全部在你的浏览器里完成
            </div>

            <h1
              className="mt-6 animate-fade-up text-balance text-[36px] font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-[54px]"
              style={{ animationDelay: '40ms' }}
            >
              日常小工具，
              <br className="sm:hidden" />
              <span className="font-display italic text-jade-700">打开就能用</span>
            </h1>

            <p
              className="mx-auto mt-5 max-w-lg animate-fade-up text-balance text-[15px] leading-relaxed text-ink-500 sm:text-base"
              style={{ animationDelay: '80ms' }}
            >
              PDF 合并拆分压缩、图片格式转换、文字识别、音视频处理、JSON 格式化……
              不下载、不注册，结果直接从你自己的电脑里出来。
            </p>

            <div
              className="mt-8 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '120ms' }}
            >
              <Link to="/tools" className="btn-primary w-full sm:w-auto">
                浏览全部工具
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link to="/tools/pdf-merge" className="btn-secondary w-full sm:w-auto">
                <Icon name="file-text" size={16} />
                试试 PDF 合并
              </Link>
            </div>

            <div
              className="mx-auto mt-10 flex max-w-lg animate-fade-up flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-ink-900/[0.07] pt-7"
              style={{ animationDelay: '160ms' }}
            >
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-mono text-[19px] font-semibold tabular-nums text-ink-900">{s.value}</div>
                  <div className="mt-0.5 text-[11px] text-ink-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 精选工具 */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Most used</div>
            <h2 className="section-title mt-1.5">大家最常用的</h2>
          </div>
          <Link
            to="/tools"
            className="group hidden items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900 sm:flex"
          >
            全部 {tools.length} 个
            <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t, i) => (
            <ToolCard key={t.id} tool={t} index={i} />
          ))}
        </div>
      </section>

      {/* 分类导航 */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="mb-6">
          <div className="eyebrow">Browse by category</div>
          <h2 className="section-title mt-1.5">按分类找工具</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => {
            const items = toolsByCategory(c.id);
            return (
              <Link
                key={c.id}
                to={`/tools?c=${c.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                className="group card card-hover animate-fade-up p-5"
              >
                <div className="flex items-center justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${tintClass[c.color]}`}>
                    <Icon name={categoryIcon[c.id]} size={18} strokeWidth={1.6} />
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ink-300">{items.length}</span>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-ink-900">{c.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{c.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {items.slice(0, 2).map((t) => (
                    <span key={t.id} className="rounded bg-paper-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                      {t.name}
                    </span>
                  ))}
                  {items.length > 2 && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] text-ink-400">+{items.length - 2}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 设计原则 */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: 'shield' as IconName,
              title: '真的不上传',
              body: '所有计算在浏览器里完成。断网也能用，关掉页面即释放内存。',
            },
            {
              icon: 'zap' as IconName,
              title: '没有套路',
              body: '不限次数、不加水印、不弹注册。打开工具就是工具本身。',
            },
            {
              icon: 'code' as IconName,
              title: '可自己部署',
              body: '纯静态站点，一套 dist 目录，放到任何服务器或内网都能跑。',
            },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper-100 text-ink-700 ring-1 ring-inset ring-ink-900/[0.06]">
                <Icon name={f.icon} size={19} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-center shadow-pop sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 0%, #ffffff 0%, transparent 40%), radial-gradient(circle at 80% 100%, #1f9c82 0%, transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-balance text-[26px] font-semibold tracking-tight text-paper-50 sm:text-[32px]">
              下次要转格式，直接打开这里
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-paper-300/80">
              {tools.length} 个工具，全都在浏览器里跑。收藏这个页面，比记住一堆网址省事。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/tools" className="btn bg-paper-50 !text-ink-900 hover:bg-white">
                开始使用
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link to="/about" className="btn border border-white/15 !text-paper-100 hover:bg-white/[0.08]">
                了解隐私说明
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- 工具列表页 ---------- */
function ToolsPage({ query, catFilter }: { query: string; catFilter?: string }) {
  const list = useMemo(() => {
    let arr = query ? searchTools(query) : tools;
    if (catFilter) arr = arr.filter((t) => t.category === catFilter);
    return arr;
  }, [query, catFilter]);
  const activeCat = categories.find((c) => c.id === catFilter);
  const [filter, setFilter] = useState('');

  const shown = useMemo(() => {
    if (!filter) return list;
    return list.filter((t) => t.name.includes(filter) || t.desc.includes(filter));
  }, [list, filter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">All tools</div>
          <h1 className="mt-1.5 text-[30px] font-semibold tracking-tight text-ink-900 sm:text-[36px]">
            {activeCat ? activeCat.name : '全部工具'}
          </h1>
          <p className="mt-2 text-[13px] text-ink-500">
            {activeCat ? activeCat.desc : '按分类浏览，或者直接搜索。全部在本地运行，不上传文件。'}
            <span className="ml-2 tabular-nums text-ink-400">共 {list.length} 个</span>
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            className="input !py-2.5 pl-9"
            placeholder="筛选工具…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => navigate('/tools')}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
            !catFilter
              ? 'bg-ink-900 text-paper-50 shadow-card'
              : 'bg-white text-ink-500 ring-1 ring-inset ring-ink-900/[0.08] hover:text-ink-900'
          }`}
        >
          全部
        </button>
        {categories.map((c) => {
          const active = catFilter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/tools?c=${c.id}`)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-ink-900 text-paper-50 shadow-card'
                  : 'bg-white text-ink-500 ring-1 ring-inset ring-ink-900/[0.08] hover:text-ink-900'
              }`}
            >
              <Icon name={categoryIcon[c.id]} size={13} className={active ? 'text-paper-200' : 'text-ink-400'} />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t, i) => (
          <ToolCard key={t.id} tool={t} index={i} />
        ))}
      </div>
      {!shown.length && (
        <div className="card mt-10 flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-paper-100 text-ink-400">
            <Icon name="search" size={22} />
          </span>
          <p className="text-[15px] font-medium text-ink-800">没有找到匹配的工具</p>
          <p className="text-[13px] text-ink-500">换个关键词，或者回头看看全部分类。</p>
          <button type="button" className="btn-secondary mt-2" onClick={() => navigate('/tools')}>
            查看全部工具
          </button>
        </div>
      )}
    </main>
  );
}

/* ---------- 关于页 ---------- */
function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="eyebrow">About</div>
      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-ink-900">关于抹布工具箱</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
        一个讨厌「上传文件、等进度条、看广告、被迫注册」之后做出来的站点。
      </p>

      <div className="mt-10 space-y-8">
        {[
          {
            id: 'why',
            title: '为什么做这个站',
            body: (
              <p>
                网上「在线转换」站点大多要求上传文件、限制次数、加水印，还要看广告。其实很多处理完全可以在浏览器里完成——
                本站就是把这类工具集中起来，做成一个打开就能用、不用注册的免费站点。
              </p>
            ),
          },
          {
            id: 'privacy',
            title: '隐私说明',
            body: (
              <p>
                除 OCR 与音视频工具需要首次从公共 CDN 下载识别模型或转码引擎外，其余工具全部使用浏览器本地能力完成，
                文件不会离开你的设备。本站没有后端服务器，也没有数据库。
              </p>
            ),
          },
          {
            id: 'limits',
            title: '大小与性能限制',
            body: (
              <ul className="list-disc space-y-2 pl-5">
                <li>PDF 与图片工具建议单个文件不超过 200MB，超大文件可能因浏览器内存不足失败。</li>
                <li>音视频工具受 ffmpeg.wasm 性能限制，建议视频不超过 200MB 或 5 分钟。</li>
                <li>OCR 首次使用需要下载约 15MB 中文模型，之后会走浏览器缓存。</li>
                <li>AVIF 导出依赖浏览器编码支持，较老的浏览器会提示改用 WebP。</li>
                <li>Word 转 PDF 只做文字重排，复杂版式与中文字体需要桌面软件处理。</li>
              </ul>
            ),
          },
          {
            id: 'faq',
            title: '常见问题',
            body: (
              <dl className="space-y-5">
                {[
                  ['真的免费吗？', '免费，无使用次数限制，也不要求注册。'],
                  ['断网能用吗？', '页面加载完成后，PDF、图片、文本类工具可以离线使用；OCR 与音视频首次需要联网下载引擎。'],
                  ['转换结果保存在哪里？', '只在你的浏览器内存里，处理完点击下载即可，关闭页面后自动释放。'],
                  ['会记录我的文件吗？', '不会。没有服务器，也没有任何文件上传接口，可以在开发者工具的 Network 面板自行验证。'],
                ].map(([q, a]) => (
                  <div key={q}>
                    <dt className="font-medium text-ink-900">{q}</dt>
                    <dd className="mt-1 text-ink-600">{a}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ].map((s) => (
          <section key={s.id} id={s.id} className="border-t border-ink-900/[0.07] pt-7">
            <h2 className="mb-3 text-[17px] font-semibold text-ink-900">{s.title}</h2>
            <div className="space-y-3 text-[14px] leading-7 text-ink-600">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}

/* ---------- 工具详情页 ---------- */
function ToolPage({ meta }: { meta: ToolMeta }) {
  const Comp = toolComponents[meta.id];
  const cat = categories.find((c) => c.id === meta.category);
  const related = tools.filter((t) => t.category === meta.category && t.id !== meta.id).slice(0, 3);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="mb-6 flex items-center gap-1.5 text-[12px] text-ink-400">
        <Link to="/" className="transition-colors hover:text-ink-800">
          首页
        </Link>
        <Icon name="chevron-right" size={12} className="text-ink-300" />
        <Link to={`/tools?c=${meta.category}`} className="transition-colors hover:text-ink-800">
          {cat?.name}
        </Link>
        <Icon name="chevron-right" size={12} className="text-ink-300" />
        <span className="text-ink-700">{meta.name}</span>
      </nav>

      <div className="mb-7 flex items-start gap-4">
        <ToolGlyph tool={meta} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">{meta.name}</h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-500">{meta.desc}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="chip-accent">
              <Icon name="shield" size={12} />
              本地处理
            </span>
            {meta.badge && meta.badge !== '本地' && (
              <span className="chip !bg-amberish-50 !text-[#8a6420]">
                <Icon name="download" size={12} />
                {meta.badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="grid place-items-center py-24 text-[13px] text-ink-400">
              <span className="flex items-center gap-2">
                <Icon name="loader" size={16} className="animate-spin" />
                正在加载工具…
              </span>
            </div>
          }
        >
          {Comp ? <Comp /> : <div className="py-6 text-[13px] text-ink-500">该工具正在开发中。</div>}
        </Suspense>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-ink-500">同类工具</h2>
            <Link to={`/tools?c=${meta.category}`} className="text-[12px] text-ink-400 transition-colors hover:text-ink-800">
              更多{cat?.name}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((t, i) => (
              <ToolCard key={t.id} tool={t} index={i} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/* ---------- App ---------- */
export default function App() {
  const route = useRoute();
  const [query] = useQueryState();

  const meta = route.slug ? toolBySlug(route.slug) : undefined;
  useTitle(meta ? `${meta.name} · 抹布工具箱` : `抹布工具箱 · ${tools.length} 个免费在线小工具`);

  const catFilter = useMemo(() => {
    const m = route.path.match(/[?&]c=([a-z]+)/);
    return m?.[1];
  }, [route.path]);

  const content = (() => {
    if (route.path === '/about') return <AboutPage />;
    if (route.path.startsWith('/tools/') && route.slug) {
      const m = toolBySlug(route.slug);
      if (m) return <ToolPage meta={m} />;
      return (
        <main className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper-200 text-ink-400">
            <Icon name="help" size={24} />
          </div>
          <h1 className="mt-5 text-[24px] font-semibold text-ink-900">没有找到这个工具</h1>
          <p className="mt-2 text-[13px] text-ink-500">它可能改名了，去全部工具里找找。</p>
          <Link to="/tools" className="btn-primary mt-7">
            浏览全部工具
          </Link>
        </main>
      );
    }
    if (route.path.startsWith('/tools')) return <ToolsPage query={query} catFilter={catFilter} />;
    return <Home />;
  })();

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{content}</div>
        <Footer />
      </div>
    </ToastProvider>
  );
}
