import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useToast } from './Toast';
import { formatBytes } from '../utils/file';

/* ---------------- 基础控件 ---------------- */

export function Button({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  icon?: IconName;
}) {
  const cls =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'accent'
        ? 'btn-accent'
        : variant === 'secondary'
          ? 'btn-secondary'
          : 'btn-ghost';
  return (
    <button type="button" className={`${cls} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="group" className="inline-flex flex-wrap gap-0.5 rounded-xl border border-ink-900/[0.07] bg-paper-100 p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200 ${
              active
                ? 'bg-white font-medium text-ink-900 shadow-card ring-1 ring-inset ring-ink-900/[0.06]'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  suffix = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-ink-900/10 accent-jade-600"
      />
      <span className="w-14 shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-600">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'warn' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const map = {
    info: { box: 'border-ink-900/[0.08] bg-paper-100 text-ink-700', icon: 'info' as IconName, iconCls: 'text-ink-400' },
    warn: { box: 'border-amberish-200 bg-amberish-50 text-[#7a5717]', icon: 'alert' as IconName, iconCls: 'text-[#a97b1f]' },
    error: { box: 'border-clay-200 bg-clay-50 text-clay-500', icon: 'alert' as IconName, iconCls: 'text-clay-500' },
    success: { box: 'border-jade-200 bg-jade-50 text-jade-800', icon: 'check' as IconName, iconCls: 'text-jade-600' },
  } as const;
  const s = map[tone];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${s.box} ${className}`}>
      <Icon name={s.icon} size={16} className={`mt-0.5 shrink-0 ${s.iconCls}`} />
      <div className="min-w-0">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, text }: { value: number; text?: string }) {
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/[0.08]">
        <div
          className="h-full rounded-full bg-jade-600 transition-[width] duration-300 ease-smooth"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {text && <div className="mt-2 text-xs text-ink-400">{text}</div>}
    </div>
  );
}

/* ---------------- 文件拖拽区 ---------------- */

export function Dropzone({
  onFiles,
  accept = '*',
  multiple = true,
  title = '把文件拖到这里',
  subtitle = '或者点击选择文件',
  hint,
  icon = 'upload',
}: {
  onFiles: (files: FileList | File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  hint?: string;
  icon?: IconName;
}) {
  const [drag, setDrag] = useState(false);
  const inputId = `dz-${Math.random().toString(36).slice(2)}`;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`dropzone group ${drag ? 'dropzone-active' : ''}`}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-ink-900/[0.07] bg-white text-ink-500 shadow-card transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-jade-700 group-hover:shadow-lift">
        <Icon name={icon} size={24} />
      </span>
      <span className="text-[15px] font-medium text-ink-800">{title}</span>
      <span className="mt-1.5 text-[13px] text-ink-500">{subtitle}</span>
      {hint && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] text-ink-500 ring-1 ring-inset ring-ink-900/[0.06]">
          <Icon name="shield" size={12} className="text-jade-600" />
          {hint}
        </span>
      )}
    </label>
  );
}

/* ---------------- 文件列表 ---------------- */

export function FileList({
  files,
  onRemove,
  onMove,
  showSize = true,
  preview,
}: {
  files: { id: string; file: File }[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, dir: -1 | 1) => void;
  showSize?: boolean;
  preview?: (file: File) => ReactNode;
}) {
  if (!files.length) return null;
  return (
    <ul className="divide-y divide-ink-900/[0.06] overflow-hidden rounded-xl border border-ink-900/[0.08] bg-white">
      {files.map((f, i) => (
        <li key={f.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper-50">
          <span className="w-5 shrink-0 text-center font-mono text-[11px] tabular-nums text-ink-300">
            {String(i + 1).padStart(2, '0')}
          </span>
          {preview?.(f.file)}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink-800">{f.file.name}</div>
            {showSize && <div className="text-[11px] tabular-nums text-ink-400">{formatBytes(f.file.size)}</div>}
          </div>
          {onMove && (
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                aria-label="上移"
                onClick={() => onMove(f.id, -1)}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-700"
              >
                <Icon name="chevron-up" size={15} />
              </button>
              <button
                type="button"
                aria-label="下移"
                onClick={() => onMove(f.id, 1)}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-700"
              >
                <Icon name="chevron-down" size={15} />
              </button>
            </div>
          )}
          {onRemove && (
            <button
              type="button"
              aria-label="移除"
              onClick={() => onRemove(f.id)}
              className="shrink-0 rounded-lg p-1.5 text-ink-300 opacity-0 transition-all hover:bg-clay-50 hover:text-clay-500 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon name="x" size={15} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- 结果区 ---------------- */

export interface ResultItem {
  name: string;
  blob: Blob | string;
  mime?: string;
  meta?: string;
}

export function ResultPanel({
  items,
  title = '处理完成',
  zipName,
}: {
  items: ResultItem[];
  title?: string;
  zipName?: string;
}) {
  const toast = useToast();
  if (!items.length) return null;

  const downloadOne = (it: ResultItem) => {
    const blob = typeof it.blob === 'string' ? new Blob([it.blob], { type: it.mime ?? 'text/plain' }) : it.blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = it.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`已开始下载 ${it.name}`, 'success', 'download');
  };

  const downloadAll = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (const it of items) {
      zip.file(
        it.name,
        typeof it.blob === 'string' ? new Blob([it.blob], { type: it.mime ?? 'text/plain' }) : it.blob,
      );
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName ?? 'result.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`已打包 ${items.length} 个文件`, 'success', 'download');
  };

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-jade-600/20 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-jade-600/10 bg-jade-50/60 px-5 py-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-jade-900">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-jade-600 text-white">
            <Icon name="check" size={12} strokeWidth={2.4} />
          </span>
          {title}
          <span className="font-normal text-jade-700/70">· {items.length} 个文件</span>
        </h3>
        {items.length > 1 && (
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" icon="download" onClick={downloadAll}>
            打包下载
          </Button>
        )}
      </div>
      <ul className="max-h-80 divide-y divide-ink-900/[0.05] overflow-y-auto scrollbar-thin">
        {items.map((it) => (
          <li key={it.name} className="flex items-center gap-3 px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink-800">{it.name}</div>
              {it.meta && <div className="text-[11px] tabular-nums text-ink-400">{it.meta}</div>}
            </div>
            <Button variant="ghost" className="!px-2.5 !py-1.5 !text-xs" icon="download" onClick={() => downloadOne(it)}>
              下载
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 统计卡片 */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-ink-900/[0.07] bg-white px-4 py-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink-900">{value}</div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}
