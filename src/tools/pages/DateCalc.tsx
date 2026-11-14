import { useMemo, useState } from 'react';
import { Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function workdaysBetween(a: Date, b: Date): number {
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  let count = 0;
  const cur = new Date(start);
  count += 1;
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export default function DateCalc() {
  const [mode, setMode] = useState<'diff' | 'add'>('diff');
  const [a, setA] = useState(today());
  const [b, setB] = useState(today());
  const [base, setBase] = useState(today());
  const [days, setDays] = useState(30);
  const [workday, setWorkday] = useState(false);

  const diff = useMemo(() => {
    const da = parseDate(a);
    const db = parseDate(b);
    const ms = Math.abs(db.getTime() - da.getTime());
    const days = Math.round(ms / 86400000);
    const work = workdaysBetween(da, db);
    return { days, work, weeks: days / 7, months: days / 30.44 };
  }, [a, b]);

  const added = useMemo(() => {
    const d = parseDate(base);
    if (!workday) {
      d.setDate(d.getDate() + days);
      return d;
    }
    let left = Math.abs(days);
    const dir = days >= 0 ? 1 : -1;
    while (left > 0) {
      d.setDate(d.getDate() + dir);
      if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
    }
    return d;
  }, [base, days, workday]);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 周${
      '日一二三四五六'[d.getDay()]
    }`;

  return (
    <div className="space-y-6">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'diff', label: '两个日期相差多少天' },
          { value: 'add', label: '从某天加减天数' },
        ]}
      />

      {mode === 'diff' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="开始日期">
              <input type="date" className="input" value={a} onChange={(e) => setA(e.target.value)} />
            </Field>
            <Field label="结束日期">
              <input type="date" className="input" value={b} onChange={(e) => setB(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="相差天数" value={`${diff.days} 天`} />
            <Stat label="工作日" value={`${diff.work} 天`} sub="不含周末" />
            <Stat label="周数" value={diff.weeks.toFixed(1)} />
            <Stat label="约合月数" value={diff.months.toFixed(1)} />
          </div>
          <p className="text-sm text-ink-500">
            {a} → {b}：共 {diff.days} 天。
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="起始日期">
              <input type="date" className="input" value={base} onChange={(e) => setBase(e.target.value)} />
            </Field>
            <Field label="增减天数（可为负数）">
              <input type="number" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={workday} onChange={(e) => setWorkday(e.target.checked)} />
            只计算工作日（跳过周末）
          </label>
          <div className="rounded-xl border border-jade-200 bg-jade-50 p-5">
            <div className="text-xs text-jade-700">
              {base} {days >= 0 ? '往后' : '往前'} {Math.abs(days)} {workday ? '个工作日' : '天'}
            </div>
            <div className="mt-1 text-2xl font-semibold text-jade-900">{fmt(added)}</div>
          </div>
        </>
      )}

      <Note>按日历日计算，暂不包含法定节假日与调休。</Note>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-ink-900/[0.08] bg-white px-4 py-3">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink-800">{value}</div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  );
}
