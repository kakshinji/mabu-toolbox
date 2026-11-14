/**
 * 统一图标：线性风格（1.5px stroke），24×24 视框。
 * 全站只用这一套，避免 emoji 与图标混排造成的廉价感。
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'command'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-up'
  | 'x'
  | 'check'
  | 'copy'
  | 'download'
  | 'upload'
  | 'file-text'
  | 'file-plus'
  | 'file-output'
  | 'image'
  | 'images'
  | 'crop'
  | 'scissors'
  | 'film'
  | 'music'
  | 'type'
  | 'hash'
  | 'code'
  | 'terminal'
  | 'repeat'
  | 'calculator'
  | 'lock'
  | 'key'
  | 'shield'
  | 'shield-off'
  | 'qr'
  | 'scan'
  | 'clock'
  | 'calendar'
  | 'palette'
  | 'pipette'
  | 'fingerprint'
  | 'sparkles'
  | 'zap'
  | 'layers'
  | 'grid'
  | 'list'
  | 'settings'
  | 'trash'
  | 'menu'
  | 'github'
  | 'external'
  | 'loader'
  | 'alert'
  | 'info'
  | 'help'
  | 'heart'
  | 'brain'
  | 'wand'
  | 'gauge'
  | 'wallet'
  | 'activity'
  | 'mic';

const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  command: <path d="M9 6a3 3 0 1 0-3 3h3M9 6v12M9 6h6M9 18a3 3 0 1 1-3-3h3M15 6a3 3 0 1 1 3 3h-3M15 6v12M15 18a3 3 0 1 0 3-3h-3M9 12h6" />,
  'arrow-right': (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: <path d="m5 13 4.5 4.5L19 7" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  'file-plus': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 12v5M9.5 14.5h5" />
    </>
  ),
  'file-output': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M14 3v5h5M9 13h5M9 17h3" />
      <path d="m17 14 4 3-4 3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-4-9 8" />
    </>
  ),
  images: (
    <>
      <rect x="7" y="3" width="14" height="14" rx="2" />
      <path d="M3 9v10a2 2 0 0 0 2 2h10" />
      <path d="m7 13 3-2 6 6" />
    </>
  ),
  crop: (
    <>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M2 6h14a2 2 0 0 1 2 2v14" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M20 4 8.5 15.5M20 20 8.5 8.5" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  type: (
    <>
      <path d="M4 6V4h16v2" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </>
  ),
  hash: <path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18" />,
  code: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  terminal: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  repeat: (
    <>
      <path d="m17 3 4 4-4 4" />
      <path d="M3 11V9a2 2 0 0 1 2-2h16" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 13v2a2 2 0 0 1-2 2H3" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4M8 19h4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 9 9M17 17l2-2M14 14l2-2" />
    </>
  ),
  shield: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />,
  'shield-off': (
    <>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 20h3v1" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M4 12h16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-2 1-2h2a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" />
      <path d="M7.5 10h.01M10 7h.01M14 7.5h.01M16.5 10.5h.01" />
    </>
  ),
  pipette: (
    <>
      <path d="m14 5 5 5M17 2l5 5-3 3-5-5z" />
      <path d="m14 10-9 9v2h2l9-9" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M12 3a9 9 0 0 0-9 9v3M21 12a9 9 0 0 0-9-9" />
      <path d="M7 12a5 5 0 0 1 10 0v4M9.5 21a9 9 0 0 1-.5-3v-6a3 3 0 0 1 6 0v6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18.5 15.5 19 17l1.5.5L19 18l-.5 1.5L18 18l-1.5-.5L18 17zM5 16l.7 1.8L7.5 18.5 5.7 19.2 5 21l-.7-1.8L2.5 18.5l1.8-.7z" />
    </>
  ),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  github: (
    <path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.4-3.7 4.9 4.9 0 0 0-.1-3.7s-1.1-.3-3.8 1.4a13 13 0 0 0-6.8 0C4.5 0 3.4.3 3.4.3a4.9 4.9 0 0 0-.1 3.7A5.3 5.3 0 0 0 1.9 7.7c0 5.2 3.2 6.4 6.2 6.8a3.4 3.4 0 0 0-.9 2.6V22" />
  ),
  external: (
    <>
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  loader: <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />,
  alert: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5M12 17h.01" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20z" />,
  brain: (
    <>
      <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.7V15a3 3 0 0 0 3 3h1v3M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.7V15a3 3 0 0 1-3 3h-1v3" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  wand: (
    <>
      <path d="m14 6 4 4M3 21 17 7l-3-3L3 18z" />
      <path d="M18 3v3M21 6h-3M6 3v2M5 4h2" />
    </>
  ),
  gauge: (
    <>
      <path d="M5 18a8 8 0 1 1 14 0" />
      <path d="m12 14 4-5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h.01" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.5,
  ...rest
}: { name: IconName; size?: number; className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

/** 品牌标记：印章感的方章 + 字 */
export function Logo({ size = 32, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[9px] bg-ink-900 text-paper-50 shadow-card"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
          <rect width="32" height="32" fill="#141413" />
          {/* 印章感的方框 + 三条竖笔，抽象自「抹」字的结构 */}
          <rect x="7.5" y="7" width="17" height="18" rx="2.5" stroke="#f9f7f3" strokeWidth="1.4" fill="none" opacity="0.9" />
          <path d="M12 12v8M16 12v8M20 12v5" stroke="#f9f7f3" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="21" r="1.5" fill="#1f9c82" />
        </svg>
        <span className="pointer-events-none absolute inset-0 rounded-[9px] ring-1 ring-inset ring-white/10" />
      </span>
      {withWord && <span className="text-[15px] font-semibold tracking-tight text-ink-900">抹布工具箱</span>}
    </span>
  );
}
