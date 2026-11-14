import type { ReactNode } from 'react';

export function ToolBody({ children }: { children: ReactNode }) {
  return <div className="card p-5 sm:p-6">{children}</div>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>;
}

export function Row({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-4 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{children}</div>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-xs leading-relaxed text-slate-400">{children}</p>;
}
