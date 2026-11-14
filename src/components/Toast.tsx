import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type Tone = 'default' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  icon?: IconName;
}

const ToastContext = createContext<(message: string, tone?: Tone, icon?: IconName) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: Tone = 'default', icon?: IconName) => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev.slice(-2), { id, message, tone, icon }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-scale-in items-center gap-2 rounded-xl px-4 py-2.5 text-sm shadow-pop ${
              t.tone === 'error'
                ? 'bg-clay-500 text-white'
                : t.tone === 'success'
                  ? 'bg-ink-900 text-paper-50'
                  : 'bg-ink-900 text-paper-50'
            }`}
          >
            <Icon name={t.icon ?? (t.tone === 'error' ? 'alert' : 'check')} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
