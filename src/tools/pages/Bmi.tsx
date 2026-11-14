import { useMemo, useState } from 'react';
import { Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';

const bmiRanges = [
  { max: 18.5, label: '偏瘦', color: 'text-jade-700', bg: 'bg-jade-50' },
  { max: 24, label: '正常', color: 'text-jade-700', bg: 'bg-jade-50' },
  { max: 28, label: '超重', color: 'text-[#8a6420]', bg: 'bg-amberish-50' },
  { max: 999, label: '肥胖', color: 'text-clay-500', bg: 'bg-clay-50' },
];

export default function Bmi() {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState<'low' | 'mid' | 'high'>('mid');

  const bmi = useMemo(() => {
    const h = height / 100;
    if (h <= 0) return 0;
    return weight / (h * h);
  }, [height, weight]);

  const range = bmiRanges.find((r) => bmi < r.max) ?? bmiRanges[bmiRanges.length - 1];

  const bmr = useMemo(() => {
    // Mifflin-St Jeor
    return sex === 'male' ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  }, [weight, height, age, sex]);

  const factor = activity === 'low' ? 1.2 : activity === 'mid' ? 1.55 : 1.725;
  const tdee = bmr * factor;

  const ideal = useMemo(() => {
    const h = height / 100;
    return { min: 18.5 * h * h, max: 23.9 * h * h };
  }, [height]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="身高（cm）">
          <input type="number" className="input mono" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </Field>
        <Field label="体重（kg）">
          <input type="number" step={0.1} className="input mono" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </Field>
        <Field label="年龄">
          <input type="number" className="input mono" value={age} onChange={(e) => setAge(Number(e.target.value))} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <Field label="性别">
          <Segmented
            value={sex}
            onChange={setSex}
            options={[
              { value: 'male', label: '男' },
              { value: 'female', label: '女' },
            ]}
          />
        </Field>
        <Field label="活动量">
          <Segmented
            value={activity}
            onChange={setActivity}
            options={[
              { value: 'low', label: '久坐' },
              { value: 'mid', label: '中等' },
              { value: 'high', label: '高强度' },
            ]}
          />
        </Field>
      </div>

      <div className={`rounded-2xl border border-ink-900/[0.08] p-6 ${range.bg}`}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-xs text-ink-500">BMI</div>
            <div className={`text-4xl font-bold ${range.color}`}>{bmi.toFixed(1)}</div>
          </div>
          <div className={`mb-1 rounded-full bg-white/70 px-3 py-1 text-sm font-medium ${range.color}`}>{range.label}</div>
        </div>
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full">
            {[
              { w: 30, c: 'bg-ink-300' },
              { w: 25, c: 'bg-jade-400' },
              { w: 20, c: 'bg-amberish-200' },
              { w: 25, c: 'bg-clay-300' },
            ].map((s, i) => (
              <div key={i} className={s.c} style={{ width: `${s.w}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink-400">
            <span>偏瘦</span>
            <span>18.5</span>
            <span>24</span>
            <span>28</span>
            <span>肥胖</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-600">
          你的健康体重范围约 <b>{ideal.min.toFixed(1)} ~ {ideal.max.toFixed(1)} kg</b>
          {weight > ideal.max && `，比上限重 ${(weight - ideal.max).toFixed(1)} kg`}
          {weight < ideal.min && `，比下限轻 ${(ideal.min - weight).toFixed(1)} kg`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-900/[0.08] bg-white px-4 py-3">
          <div className="text-xs text-ink-500">基础代谢 BMR</div>
          <div className="mt-0.5 text-lg font-semibold text-ink-800">{Math.round(bmr)} kcal</div>
        </div>
        <div className="rounded-xl border border-ink-900/[0.08] bg-white px-4 py-3">
          <div className="text-xs text-ink-500">每日消耗 TDEE</div>
          <div className="mt-0.5 text-lg font-semibold text-ink-800">{Math.round(tdee)} kcal</div>
        </div>
        <div className="rounded-xl border border-ink-900/[0.08] bg-white px-4 py-3">
          <div className="text-xs text-ink-500">减脂建议摄入</div>
          <div className="mt-0.5 text-lg font-semibold text-clay-500">{Math.round(tdee - 400)} kcal</div>
        </div>
      </div>

      <Note>
        BMI 依据中国成人标准划分；BMR 使用 Mifflin-St Jeor 公式估算。运动员、孕妇、老年人不适用，仅供日常参考。
      </Note>
    </div>
  );
}
