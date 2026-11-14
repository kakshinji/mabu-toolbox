import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Segmented, Alert } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export default function Timestamp() {
  const [now, setNow] = useState(() => Date.now());
  const [unit, setUnit] = useState<'s' | 'ms'>('s');
  const [ts, setTs] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(() => {
    if (!ts.trim()) return null;
    const n = Number(ts.trim());
    if (!Number.isFinite(n)) return null;
    const ms = ts.trim().length <= 10 || unit === 's' ? n * 1000 : n;
    return new Date(ms);
  }, [ts, unit]);

  const fromDate = useMemo(() => {
    if (!dateStr) return null;
    const d = new Date(dateStr.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateStr]);

  const copy = async (v: string) => {
    if (await copyText(v)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  const rows = [
    { label: 'Unix 秒', value: String(Math.floor(now / 1000)) },
    { label: 'Unix 毫秒', value: String(now) },
    { label: '本地时间', value: fmtLocal(new Date(now)) },
    { label: 'UTC 时间', value: fmtUtc(new Date(now)) },
    { label: 'ISO 8601', value: new Date(now).toISOString() },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-800">当前时间</h3>
          <span className="text-xs text-ink-400">实时更新</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => copy(r.value)}
              className="group flex items-center justify-between gap-2 rounded-lg border border-ink-900/[0.08] px-3 py-2 text-left hover:border-jade-200 hover:bg-jade-50/30"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-ink-400">{r.label}</div>
                <div className="mono truncate text-sm text-ink-800">{r.value}</div>
              </div>
              <span className="shrink-0 text-[10px] text-jade-700 opacity-0 group-hover:opacity-100">
                {copied ? '✓' : '复制'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-800">时间戳 → 日期</h3>
          <Field label="输入时间戳">
            <div className="flex gap-2">
              <input className="input mono" placeholder="1700000000" value={ts} onChange={(e) => setTs(e.target.value)} />
              <Segmented
                value={unit}
                onChange={setUnit}
                options={[
                  { value: 's', label: '秒' },
                  { value: 'ms', label: '毫秒' },
                ]}
              />
            </div>
          </Field>
          {parsed && (
            <div className="rounded-xl border border-ink-900/[0.08] bg-paper-100 p-4 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">本地时间</span>
                <span className="mono text-ink-800">{fmtLocal(parsed)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">UTC</span>
                <span className="mono text-ink-800">{fmtUtc(parsed)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">ISO</span>
                <span className="mono text-ink-800">{parsed.toISOString()}</span>
              </div>
            </div>
          )}
          {ts && !parsed && <Alert tone="warn">请输入数字时间戳</Alert>}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-800">日期 → 时间戳</h3>
          <Field label="选择日期时间">
            <input
              type="datetime-local"
              step={1}
              className="input"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </Field>
          {fromDate && (
            <div className="rounded-xl border border-ink-900/[0.08] bg-paper-100 p-4 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">Unix 秒</span>
                <span className="mono text-ink-800">{Math.floor(fromDate.getTime() / 1000)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">Unix 毫秒</span>
                <span className="mono text-ink-800">{fromDate.getTime()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-ink-500">距今</span>
                <span className="mono text-ink-800">
                  {Math.round((fromDate.getTime() - Date.now()) / 86400000)} 天
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Note>时间为浏览器所在时区（当前 {Intl.DateTimeFormat().resolvedOptions().timeZone}），UTC 会是同一时刻的零时区表示。</Note>
    </div>
  );
}
