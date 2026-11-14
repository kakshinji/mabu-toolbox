import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface Route {
  path: string;
  slug?: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const m = path.match(/^\/tools\/([a-z0-9-]+)/);
  return { path, slug: m?.[1] };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onHash = () => {
      setRoute(parse());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function Link({
  to,
  className,
  children,
  onClick,
  style,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <a href={`#${to}`} className={className} style={style} onClick={() => onClick?.()}>
      {children}
    </a>
  );
}
