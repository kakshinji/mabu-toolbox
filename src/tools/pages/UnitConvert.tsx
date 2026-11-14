import { useMemo, useState } from 'react';
import { Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';

interface Unit {
  key: string;
  label: string;
  /** 换算到基准单位的系数 */
  factor: number;
}

interface Group {
  name: string;
  units: Unit[];
  /** 温度等非线性换算单独处理 */
  special?: 'temperature';
}

const groups: Group[] = [
  {
    name: '长度',
    units: [
      { key: 'mm', label: '毫米 mm', factor: 0.001 },
      { key: 'cm', label: '厘米 cm', factor: 0.01 },
      { key: 'm', label: '米 m', factor: 1 },
      { key: 'km', label: '千米 km', factor: 1000 },
      { key: 'in', label: '英寸 in', factor: 0.0254 },
      { key: 'ft', label: '英尺 ft', factor: 0.3048 },
      { key: 'yd', label: '码 yd', factor: 0.9144 },
      { key: 'mi', label: '英里 mi', factor: 1609.344 },
      { key: 'li', label: '里', factor: 500 },
      { key: 'chi', label: '尺', factor: 1 / 3 },
    ],
  },
  {
    name: '重量',
    units: [
      { key: 'mg', label: '毫克 mg', factor: 0.000001 },
      { key: 'g', label: '克 g', factor: 0.001 },
      { key: 'kg', label: '千克 kg', factor: 1 },
      { key: 't', label: '吨 t', factor: 1000 },
      { key: 'jin', label: '斤', factor: 0.5 },
      { key: 'liang', label: '两', factor: 0.05 },
      { key: 'lb', label: '磅 lb', factor: 0.45359237 },
      { key: 'oz', label: '盎司 oz', factor: 0.028349523125 },
    ],
  },
  {
    name: '面积',
    units: [
      { key: 'mm2', label: '平方毫米 mm²', factor: 0.000001 },
      { key: 'cm2', label: '平方厘米 cm²', factor: 0.0001 },
      { key: 'm2', label: '平方米 m²', factor: 1 },
      { key: 'km2', label: '平方千米 km²', factor: 1000000 },
      { key: 'mu', label: '亩', factor: 666.6666667 },
      { key: 'ha', label: '公顷 ha', factor: 10000 },
      { key: 'ft2', label: '平方英尺 ft²', factor: 0.09290304 },
      { key: 'acre', label: '英亩 acre', factor: 4046.8564224 },
    ],
  },
  {
    name: '体积',
    units: [
      { key: 'ml', label: '毫升 mL', factor: 0.001 },
      { key: 'l', label: '升 L', factor: 1 },
      { key: 'm3', label: '立方米 m³', factor: 1000 },
      { key: 'gal', label: '加仑（美）gal', factor: 3.785411784 },
      { key: 'qt', label: '夸脱 qt', factor: 0.946352946 },
      { key: 'floz', label: '液量盎司 fl oz', factor: 0.0295735295625 },
    ],
  },
  {
    name: '数据存储',
    units: [
      { key: 'b', label: '字节 B', factor: 1 },
      { key: 'kb', label: 'KB', factor: 1024 },
      { key: 'mb', label: 'MB', factor: 1024 ** 2 },
      { key: 'gb', label: 'GB', factor: 1024 ** 3 },
      { key: 'tb', label: 'TB', factor: 1024 ** 4 },
      { key: 'bit', label: 'bit', factor: 1 / 8 },
    ],
  },
  {
    name: '速度',
    units: [
      { key: 'ms', label: '米/秒 m/s', factor: 1 },
      { key: 'kmh', label: '千米/时 km/h', factor: 1 / 3.6 },
      { key: 'mph', label: '英里/时 mph', factor: 0.44704 },
      { key: 'knot', label: '节 kn', factor: 0.514444 },
    ],
  },
  {
    name: '温度',
    special: 'temperature',
    units: [
      { key: 'c', label: '摄氏度 °C', factor: 1 },
      { key: 'f', label: '华氏度 °F', factor: 1 },
      { key: 'k', label: '开尔文 K', factor: 1 },
    ],
  },
  {
    name: '时间',
    units: [
      { key: 'ms2', label: '毫秒 ms', factor: 0.001 },
      { key: 's', label: '秒 s', factor: 1 },
      { key: 'min', label: '分钟 min', factor: 60 },
      { key: 'h', label: '小时 h', factor: 3600 },
      { key: 'd', label: '天 d', factor: 86400 },
      { key: 'w', label: '周', factor: 604800 },
    ],
  },
];

function convertTemp(value: number, from: string, to: string): number {
  let c = value;
  if (from === 'f') c = ((value - 32) * 5) / 9;
  if (from === 'k') c = value - 273.15;
  if (to === 'f') return (c * 9) / 5 + 32;
  if (to === 'k') return c + 273.15;
  return c;
}

export default function UnitConvert() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('cm');
  const [value, setValue] = useState('1');

  const group = groups[groupIndex];

  const result = useMemo(() => {
    const v = Number(value);
    if (!Number.isFinite(v)) return '';
    if (group.special === 'temperature') {
      return String(Number(convertTemp(v, from, to).toFixed(4)));
    }
    const f = group.units.find((u) => u.key === from);
    const t = group.units.find((u) => u.key === to);
    if (!f || !t) return '';
    return formatNumber((v * f.factor) / t.factor);
  }, [value, from, to, group]);

  const allValues = useMemo(() => {
    const v = Number(value);
    if (!Number.isFinite(v)) return [];
    return group.units.map((u) => {
      if (group.special === 'temperature') {
        return { ...u, v: formatNumber(convertTemp(v, from, u.key)) };
      }
      const f = group.units.find((x) => x.key === from)!;
      return { ...u, v: formatNumber((v * f.factor) / u.factor) };
    });
  }, [value, from, group]);

  const switchGroup = (i: number) => {
    setGroupIndex(i);
    setFrom(groups[i].units[0].key);
    setTo(groups[i].units[1]?.key ?? groups[i].units[0].key);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {groups.map((g, i) => (
          <button
            key={g.name}
            type="button"
            onClick={() => switchGroup(i)}
            className={`chip !px-3 !py-1.5 ${i === groupIndex ? '!bg-jade-600 !text-white' : 'hover:!bg-paper-300'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <Field label="从">
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
          <input
            className="input mono mt-2 text-lg"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="btn-secondary mb-9 !px-3"
          title="交换"
        >
          ⇄
        </button>
        <div>
          <Field label="到">
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 font-mono text-lg text-jade-800">
            {result || '—'}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-900/[0.08]">
        <div className="border-b border-ink-900/[0.06] bg-paper-100 px-4 py-2 text-xs font-medium text-ink-600">
          {value || 0} {group.units.find((u) => u.key === from)?.label} 换算为
        </div>
        <ul className="divide-y divide-ink-900/[0.06]">
          {allValues.map((u) => (
            <li key={u.key} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-ink-500">{u.label}</span>
              <span className="mono text-ink-800">{u.v}</span>
            </li>
          ))}
        </ul>
      </div>

      <Note>数值按二进制换算（1 KB = 1024 B），与硬盘厂商标称的十进制略有差异。</Note>
    </div>
  );
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
  return String(Number(n.toPrecision(10)));
}
