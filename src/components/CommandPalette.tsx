import { useEffect, useMemo, useRef, useState } from 'react';
import { tools, categories, toolsByCategory } from '../tools/registry';
import type { ToolMeta } from '../tools/registry';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { navigate } from '../lib/router';

/**
 * 命令面板：⌘K / Ctrl+K 唤起，键盘上下选择，回车跳转。
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      return tools.filter((t) => t.hot).slice(0, 7);
    }
    const scored = tools
      .map((t) => {
        const name = t.name.toLowerCase();
        const desc = t.desc.toLowerCase();
        let score = 0;
        if (name.startsWith(s)) score = 100;
        else if (name.includes(s)) score = 60;
        else if (t.keywords.some((k) => k.toLowerCase().includes(s))) score = 40;
        else if (desc.includes(s)) score = 20;
        return { t, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 9).map((x) => x.t);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((v) => Math.min(v + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((v) => Math.max(v - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const t = results[active];
        if (t) {
          navigate(`/tools/${t.slug}`);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const grouped = categories
    .map((c) => ({ c, items: results.filter((t) => t.category === c.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-ink-900/[0.07] px-4">
          <Icon name="search" size={17} className="shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="搜索工具：PDF、压缩、二维码…"
            className="h-14 w-full bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="kbd shrink-0">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2 scrollbar-thin">
          {!results.length && (
            <div className="px-4 py-10 text-center text-[13px] text-ink-400">
              没有找到「{q}」相关的工具
            </div>
          )}

          {q
            ? results.map((t, i) => (
                <Row
                  key={t.id}
                  tool={t}
                  active={i === active}
                  idx={i}
                  onHover={() => setActive(i)}
                  onPick={() => {
                    navigate(`/tools/${t.slug}`);
                    onClose();
                  }}
                />
              ))
            : grouped.map((g) => (
                <div key={g.c.id} className="mb-1">
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">
                    {g.c.name}
                  </div>
                  {g.items.map((t) => {
                    const idx = results.indexOf(t);
                    return (
                      <Row
                        key={t.id}
                        tool={t}
                        active={idx === active}
                        idx={idx}
                        onHover={() => setActive(idx)}
                        onPick={() => {
                          navigate(`/tools/${t.slug}`);
                          onClose();
                        }}
                      />
                    );
                  })}
                </div>
              ))}
        </div>

        <div className="flex items-center gap-4 border-t border-ink-900/[0.07] bg-paper-50 px-4 py-2.5 text-[11px] text-ink-400">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd>
            打开
          </span>
          <span className="ml-auto tabular-nums">{tools.length} 个工具</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  tool,
  active,
  idx,
  onHover,
  onPick,
}: {
  tool: ToolMeta;
  active: boolean;
  idx: number;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      data-idx={idx}
      onMouseMove={onHover}
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-paper-100' : 'hover:bg-paper-50'
      }`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-white text-jade-700 shadow-card' : 'bg-paper-100 text-ink-500'}`}>
        <Icon name={(tool.icon as IconName) || 'file-text'} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink-800">{tool.name}</span>
        <span className="block truncate text-[11px] text-ink-400">{tool.desc}</span>
      </span>
      {active && <Icon name="arrow-right" size={14} className="shrink-0 text-ink-400" />}
    </button>
  );
}

export { toolsByCategory };
