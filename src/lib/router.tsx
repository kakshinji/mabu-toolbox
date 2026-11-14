import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface Route {
  path: string;
  slug?: string;
  category?: string;
}

/** 部署前缀，例如 '/' 或 '/mabu-toolbox/'（由 Vite base 决定） */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 把站内路径转成真实 href */
export function toHref(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}

function normalize(pathname: string): string {
  let p = pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  if (!p.startsWith('/')) p = `/${p}`;
  // 去掉 index.html 与结尾多余斜杠（同时保留根路径）
  p = p.replace(/\/index\.html$/, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

function parse(): Route {
  const path = normalize(window.location.pathname);
  const tool = path.match(/^\/tools\/([a-z0-9-]+)/);
  const cat = path.match(/^\/category\/([a-z]+)/);
  return { path, slug: tool?.[1], category: cat?.[1] };
}

const CHANGE_EVENT = 'app:routechange';

export function navigate(path: string) {
  const href = toHref(path);
  if (window.location.pathname + window.location.search === href) return;
  window.history.pushState({}, '', href);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('popstate', onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);
  return route;
}

export function Link({
  to,
  className,
  children,
  onClick,
  style,
  title,
  'aria-label': ariaLabel,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  title?: string;
  'aria-label'?: string;
}) {
  return (
    <a
      href={toHref(to)}
      className={className}
      style={style}
      title={title}
      aria-label={ariaLabel}
      onClick={(e) => {
        // 保留 cmd/ctrl/shift/中键的默认行为（新标签打开）
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          onClick?.();
          return;
        }
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
