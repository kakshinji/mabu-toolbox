import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';

/** 单条说明卡片 */
export function InfoNote({
  icon = 'info',
  title,
  children,
}: {
  icon?: IconName;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-ink-900/[0.06] bg-paper-50 px-4 py-3.5">
      <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-ink-300" />
      <div className="min-w-0 text-[12.5px] leading-relaxed text-ink-500">
        {title && <div className="mb-0.5 font-medium text-ink-700">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** 一组说明卡片（默认两列） */
export function InfoNotes({ items }: { items: { icon?: IconName; title: string; body: ReactNode }[] }) {
  return (
    <div className="mt-1 grid gap-3 sm:grid-cols-2">
      {items.map((n) => (
        <InfoNote key={n.title} icon={n.icon} title={n.title}>
          {n.body}
        </InfoNote>
      ))}
    </div>
  );
}
