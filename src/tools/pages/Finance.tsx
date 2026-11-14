import { useMemo, useState } from 'react';
import { Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';

function fmtMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Finance() {
  const [amount, setAmount] = useState(1000000);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(3.1);
  const [method, setMethod] = useState<'equal' | 'principal'>('equal');
  const [showTable, setShowTable] = useState(false);

  const calc = useMemo(() => {
    const months = Math.round(years * 12);
    const monthlyRate = rate / 100 / 12;
    if (months <= 0 || amount <= 0) return null;

    if (method === 'equal') {
      const m = monthlyRate === 0 ? amount / months : (amount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
      const total = m * months;
      return {
        monthly: m,
        first: m,
        last: m,
        total,
        interest: total - amount,
        schedule: Array.from({ length: months }, (_, i) => ({ i: i + 1, pay: m, principal: m - (amount - 0) * 0, interest: 0 })),
      };
    }
    // 等额本金
    const principalPerMonth = amount / months;
    let remaining = amount;
    let total = 0;
    let first = 0;
    let last = 0;
    const schedule: { i: number; pay: number; principal: number; interest: number }[] = [];
    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate;
      const pay = principalPerMonth + interest;
      if (i === 1) first = pay;
      last = pay;
      total += pay;
      schedule.push({ i, pay, principal: principalPerMonth, interest });
      remaining -= principalPerMonth;
    }
    return { monthly: 0, first, last, total, interest: total - amount, schedule };
  }, [amount, years, rate, method]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="贷款金额（元）">
          <input type="number" min={0} step={10000} className="input mono" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="贷款年限（年）">
          <input type="number" min={1} max={50} className="input mono" value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </Field>
        <Field label="年利率（%）">
          <input type="number" min={0} step={0.01} className="input mono" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="还款方式">
        <Segmented
          value={method}
          onChange={setMethod}
          options={[
            { value: 'equal', label: '等额本息（每月一样）' },
            { value: 'principal', label: '等额本金（逐月递减）' },
          ]}
        />
      </Field>

      {calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={method === 'equal' ? '每月月供' : '首月月供'} value={`¥${fmtMoney(method === 'equal' ? calc.monthly : calc.first)}`} highlight />
            {method === 'principal' && <Stat label="末月月供" value={`¥${fmtMoney(calc.last)}`} />}
            <Stat label="支付总利息" value={`¥${fmtMoney(calc.interest)}`} />
            <Stat label="还款总额" value={`¥${fmtMoney(calc.total)}`} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              共 {Math.round(years * 12)} 期 · {method === 'equal' ? '等额本息' : '等额本金'} · 年利率 {rate}%
            </p>
            <button type="button" onClick={() => setShowTable((s) => !s)} className="text-sm text-jade-700 hover:underline">
              {showTable ? '收起还款计划' : '查看还款计划'}
            </button>
          </div>

          {showTable && (
            <div className="max-h-96 overflow-auto rounded-xl border border-ink-900/[0.08] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-paper-100 text-xs text-ink-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">期数</th>
                    <th className="px-3 py-2 text-right font-medium">月供</th>
                    <th className="px-3 py-2 text-right font-medium">本金</th>
                    <th className="px-3 py-2 text-right font-medium">利息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/[0.06]">
                  {method === 'equal'
                    ? Array.from({ length: Math.round(years * 12) }, (_, i) => {
                        const monthlyRate = rate / 100 / 12;
                        const months = Math.round(years * 12);
                        const m = calc.monthly;
                        let balance = amount;
                        for (let k = 0; k < i; k += 1) balance -= m - balance * monthlyRate;
                        const interest = balance * monthlyRate;
                        return (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-ink-500">{i + 1}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{fmtMoney(m)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-ink-600">{fmtMoney(m - interest)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-clay-500">{fmtMoney(interest)}</td>
                          </tr>
                        );
                      })
                    : calc.schedule.map((r) => (
                        <tr key={r.i}>
                          <td className="px-3 py-1.5 text-ink-500">{r.i}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{fmtMoney(r.pay)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-ink-600">{fmtMoney(r.principal)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-clay-500">{fmtMoney(r.interest)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}

          <Note>
            估算结果仅供参考，实际以银行合同为准。等额本息前期利息占比高，等额本金总利息更少但前期压力大。
          </Note>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? 'border-jade-200 bg-jade-50' : 'border-ink-900/[0.08] bg-white'}`}>
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${highlight ? 'text-jade-800' : 'text-ink-800'}`}>{value}</div>
    </div>
  );
}
