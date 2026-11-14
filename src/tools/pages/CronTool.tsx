import { useMemo, useState } from 'react';
import { Field, Alert } from '../../components/ui';
import { Note } from '../../components/ToolBody';

interface Field_ {
  name: string;
  min: number;
  max: number;
}

const FIELDS: Field_[] = [
  { name: '分钟', min: 0, max: 59 },
  { name: '小时', min: 0, max: 23 },
  { name: '日', min: 1, max: 31 },
  { name: '月', min: 1, max: 12 },
  { name: '星期', min: 0, max: 6 },
];

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function expand(field: string, min: number, max: number): number[] | null {
  const out = new Set<number>();
  for (const part of field.split(',')) {
    const [range, stepStr] = part.split('/');
    const step = stepStr ? Number(stepStr) : 1;
    if (!Number.isFinite(step) || step <= 0) return null;
    if (range === '*') {
      for (let i = min; i <= max; i += step) out.add(i);
      continue;
    }
    const m = range.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (a > b) return null;
      for (let i = a; i <= b; i += step) out.add(i);
      continue;
    }
    if (/^\d+$/.test(range)) {
      const v = Number(range);
      if (stepStr) {
        for (let i = v; i <= max; i += step) out.add(i);
      } else {
        out.add(v);
      }
      continue;
    }
    return null;
  }
  return [...out].filter((v) => v >= min && v <= max).sort((a, b) => a - b);
}

function parse(expr: string) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { error: '需要 5 段：分 时 日 月 周' };
  const sets: number[][] = [];
  for (let i = 0; i < 5; i += 1) {
    const s = expand(parts[i], FIELDS[i].min, FIELDS[i].max);
    if (!s || !s.length) return { error: `第 ${i + 1} 段（${FIELDS[i].name}）无法解析` };
    sets.push(s);
  }
  return { parts, sets, error: '' };
}

function nextRuns(sets: number[][], count = 8): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  let guard = 0;
  while (out.length < count && guard < 200000) {
    guard += 1;
    if (
      sets[0].includes(d.getMinutes()) &&
      sets[1].includes(d.getHours()) &&
      sets[2].includes(d.getDate()) &&
      sets[3].includes(d.getMonth() + 1) &&
      sets[4].includes(d.getDay())
    ) {
      out.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    } else {
      d.setMinutes(d.getMinutes() + 1);
    }
    // 快速跳过：每天没有匹配的小时/分钟时，直接跳到下一天
    if (guard % 1440 === 0) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
    }
  }
  return out;
}

function describe(parts: string[], sets: number[][]): string {
  const [mi, ho, dom, mon, dow] = parts;
  const everyMin = mi === '*';
  const everyHour = ho === '*';
  const partsDesc: string[] = [];
  if (everyMin && everyHour) partsDesc.push('每分钟');
  else if (everyMin) partsDesc.push(`每小时的第 ${sets[0].join('、')} 分钟`);
  else if (everyHour) partsDesc.push(`每小时的 ${mi} 分`);
  else partsDesc.push(`${sets[1].join('、')} 点 ${sets[0].join('、')} 分`);

  if (dom !== '*') partsDesc.push(`每月 ${sets[2].join('、')} 号`);
  if (mon !== '*') partsDesc.push(`${sets[3].join('、')} 月`);
  if (dow !== '*') partsDesc.push(sets[4].map((d) => WEEK[d]).join('、'));
  return partsDesc.join('，');
}

export default function CronTool() {
  const [expr, setExpr] = useState('0 9 * * 1-5');
  const parsed = useMemo(() => parse(expr), [expr]);
  const runs = useMemo(() => (parsed.error ? [] : nextRuns(parsed.sets!, 8)), [parsed]);

  const presets = [
    { e: '*/5 * * * *', d: '每 5 分钟' },
    { e: '0 * * * *', d: '每小时整点' },
    { e: '0 9 * * *', d: '每天 9:00' },
    { e: '0 9 * * 1-5', d: '工作日 9:00' },
    { e: '0 0 1 * *', d: '每月 1 号 0:00' },
    { e: '30 2 * * 0', d: '每周日 2:30' },
    { e: '0 0 1 1 *', d: '每年 1 月 1 日' },
  ];

  return (
    <div className="space-y-5">
      <Field label="Cron 表达式" hint="5 段格式：分 时 日 月 周（0 和 7 都表示周日）">
        <input className="input mono text-base" value={expr} onChange={(e) => setExpr(e.target.value)} />
      </Field>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.e}
            type="button"
            onClick={() => setExpr(p.e)}
            className="chip !px-3 !py-1.5 hover:!bg-paper-300"
            title={p.e}
          >
            {p.d}
          </button>
        ))}
      </div>

      {parsed.error ? (
        <Alert tone="error">{parsed.error}</Alert>
      ) : (
        <>
          <div className="rounded-xl border border-jade-200 bg-jade-50/50 p-4">
            <div className="text-xs text-jade-700">含义</div>
            <div className="mt-1 text-sm text-ink-800">{describe(parsed.parts!, parsed.sets!)}</div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink-900/[0.08]">
            <div className="border-b border-ink-900/[0.06] bg-paper-100 px-4 py-2 text-xs font-medium text-ink-600">
              接下来 8 次执行时间
            </div>
            <ul className="divide-y divide-ink-900/[0.06]">
              {runs.map((d, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="mono text-ink-700">
                    {d.getFullYear()}-{String(d.getMonth() + 1).padStart(2, '0')}-{String(d.getDate()).padStart(2, '0')}{' '}
                    {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-ink-400">{WEEK[d.getDay()]}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Note>按浏览器本地时区计算。服务器上部署时注意时区差异，Linux 的 crontab 通常按服务器时区执行。</Note>
    </div>
  );
}
