import { useMemo, useState } from 'react';
import { Button, Field, Alert } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function luminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export default function ColorTool() {
  const [hex, setHex] = useState('#2547e6');
  const [copied, setCopied] = useState('');
  const [pickerOk, setPickerOk] = useState(true);

  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(...rgb) : null), [rgb]);

  const shades = useMemo(() => {
    if (!hsl) return [];
    const [h, s] = hsl;
    return [95, 85, 75, 65, 55, 45, 35, 25, 15].map((l) => {
      const [r, g, b] = hslToRgb(h, s / 100, l / 100);
      return { hex: rgbToHex(r, g, b), l };
    });
  }, [hsl]);

  const contrast = useMemo(() => {
    if (!rgb) return null;
    const lum = luminance(...rgb);
    const white = 1.05 / (lum + 0.05);
    const black = (lum + 0.05) / 0.05;
    return { white, black };
  }, [rgb]);

  const copy = async (label: string, value: string) => {
    if (await copyText(value)) {
      setCopied(label);
      setTimeout(() => setCopied(''), 1000);
    }
  };

  const pick = async () => {
    const AnyWindow = window as any;
    if (!AnyWindow.EyeDropper) {
      setPickerOk(false);
      return;
    }
    try {
      const res = await new AnyWindow.EyeDropper().open();
      setHex(res.sRGBHex);
    } catch {
      /* 用户取消 */
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          <div
            className="h-32 w-full rounded-2xl border border-ink-900/[0.08] sm:w-40"
            style={{ background: hex }}
          />
          <div className="flex gap-2">
            <input type="color" value={rgb ? hex : '#000000'} onChange={(e) => setHex(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
            <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={pick}>
              屏幕取色
            </Button>
          </div>
          {!pickerOk && <p className="text-xs text-[#8a6420]">当前浏览器不支持屏幕取色，请使用颜色选择器。</p>}
        </div>

        <div className="space-y-3">
          <Field label="HEX">
            <input className="input mono" value={hex} onChange={(e) => setHex(e.target.value)} />
          </Field>
          {rgb && hsl && (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'RGB', value: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` },
                { label: 'HSL', value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` },
                { label: 'RGBA', value: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)` },
                { label: 'CSS 变量', value: `--color: ${hex};` },
              ].map((it) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={() => copy(it.label, it.value)}
                  className="group flex items-center justify-between rounded-lg border border-ink-900/[0.08] px-3 py-2 text-left hover:border-jade-200"
                >
                  <div>
                    <div className="text-[11px] text-ink-400">{it.label}</div>
                    <div className="mono text-sm text-ink-800">{it.value}</div>
                  </div>
                  <span className="text-[10px] text-jade-700 opacity-0 group-hover:opacity-100">{copied === it.label ? '✓' : '复制'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!rgb && <Alert tone="warn">HEX 格式应为 #RRGGBB 或 #RGB</Alert>}

      {shades.length > 0 && (
        <div>
          <span className="label">明暗色阶（适合做 UI 主题色）</span>
          <div className="flex overflow-hidden rounded-xl border border-ink-900/[0.08]">
            {shades.map((s) => (
              <button
                key={s.hex}
                type="button"
                onClick={() => copy('shade', s.hex)}
                title={s.hex}
                className="swatch-button h-16 flex-1 text-[10px] font-medium transition hover:flex-[1.5]"
                style={{ background: s.hex, color: s.l > 55 ? '#0f172a' : '#ffffff' }}
              >
                {s.hex.replace('#', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {contrast && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: '黑字对比度', v: contrast.black, ok: contrast.black >= 4.5 },
            { label: '白字对比度', v: contrast.white, ok: contrast.white >= 4.5 },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-ink-900/[0.08] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">{c.label}</span>
                <span className={`chip ${c.ok ? '!bg-jade-50 !text-jade-700' : '!bg-amberish-50 !text-[#8a6420]'}`}>
                  {c.v.toFixed(2)}:1 {c.ok ? '可读' : '偏低'}
                </span>
              </div>
              <div className="mt-2 rounded-lg p-2 text-sm" style={{ background: hex, color: c.label.startsWith('黑') ? '#000' : '#fff' }}>
                示例文字 Aa 123
              </div>
            </div>
          ))}
        </div>
      )}

      <Note>WCAG AA 标准正文对比度需 ≥ 4.5:1，大号文字 ≥ 3:1。</Note>
    </div>
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
