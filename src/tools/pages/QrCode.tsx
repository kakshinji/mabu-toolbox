import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Field, Segmented, Alert } from '../../components/ui';
import { Note } from '../../components/ToolBody';

type Kind = 'text' | 'url' | 'wifi' | 'card';

export default function QrCodePage() {
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('https://example.com');
  const [wifi, setWifi] = useState({ ssid: '', password: '', encryption: 'WPA' });
  const [card, setCard] = useState({ name: '', org: '', phone: '', email: '' });
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(2);
  const [dark, setDark] = useState('#000000');
  const [light, setLight] = useState('#ffffff');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [error, setError] = useState<string>();
  const [dataUrl, setDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const payload = (() => {
    if (kind === 'wifi') {
      const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
      return `WIFI:T:${wifi.encryption};S:${esc(wifi.ssid)};P:${esc(wifi.password)};;`;
    }
    if (kind === 'card') {
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${card.name}`,
        card.org ? `ORG:${card.org}` : '',
        card.phone ? `TEL:${card.phone}` : '',
        card.email ? `EMAIL:${card.email}` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');
    }
    return text;
  })();

  useEffect(() => {
    let cancelled = false;
    const gen = async () => {
      setError(undefined);
      if (!payload.trim()) {
        setDataUrl('');
        return;
      }
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        await QRCode.toCanvas(canvas, payload, {
          width: size,
          margin,
          errorCorrectionLevel: level,
          color: { dark, light },
        });
        const url = canvas.toDataURL('image/png');
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '生成失败，内容可能过长');
      }
    };
    gen();
    return () => {
      cancelled = true;
    };
  }, [payload, size, margin, level, dark, light]);

  const download = (fmt: 'png' | 'svg') => {
    if (fmt === 'svg') {
      QRCode.toString(payload, { type: 'svg', margin, errorCorrectionLevel: level, color: { dark, light } }).then((svg) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'qrcode.svg';
        a.click();
      });
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    a.click();
  };

  return (
    <div className="space-y-5">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'text', label: '文本 / 网址' },
          { value: 'wifi', label: 'WiFi 密码' },
          { value: 'card', label: '名片' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {kind === 'text' && (
            <Field label="内容" hint="网址、文本、电话号码、邮件地址都行">
              <textarea className="input mono h-28 resize-y" value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          )}

          {kind === 'wifi' && (
            <div className="space-y-3">
              <Field label="WiFi 名称（SSID）">
                <input className="input" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
              </Field>
              <Field label="密码">
                <input className="input" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} />
              </Field>
              <Field label="加密方式">
                <Segmented
                  value={wifi.encryption}
                  onChange={(v) => setWifi({ ...wifi, encryption: v })}
                  options={[
                    { value: 'WPA', label: 'WPA/WPA2' },
                    { value: 'WEP', label: 'WEP' },
                    { value: 'nopass', label: '无密码' },
                  ]}
                />
              </Field>
            </div>
          )}

          {kind === 'card' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="姓名">
                <input className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
              </Field>
              <Field label="公司">
                <input className="input" value={card.org} onChange={(e) => setCard({ ...card, org: e.target.value })} />
              </Field>
              <Field label="电话">
                <input className="input" value={card.phone} onChange={(e) => setCard({ ...card, phone: e.target.value })} />
              </Field>
              <Field label="邮箱">
                <input className="input" value={card.email} onChange={(e) => setCard({ ...card, email: e.target.value })} />
              </Field>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="尺寸（像素）">
              <input type="number" min={128} max={2048} step={64} className="input w-32" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </Field>
            <Field label="容错级别" hint="H 最抗污损，但内容密度更高">
              <Segmented
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'L', label: 'L' },
                  { value: 'M', label: 'M' },
                  { value: 'Q', label: 'Q' },
                  { value: 'H', label: 'H' },
                ]}
              />
            </Field>
            <Field label="前景色">
              <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-10 w-20 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
            </Field>
            <Field label="背景色">
              <input type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-10 w-20 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
            </Field>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-ink-900/[0.08] bg-white p-4">
            <canvas ref={canvasRef} className="max-w-[260px]" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => download('png')} disabled={!dataUrl}>
              下载 PNG
            </Button>
            <Button variant="secondary" onClick={() => download('svg')} disabled={!payload.trim()}>
              下载 SVG
            </Button>
          </div>
          <span className="text-xs text-ink-400">SVG 任意放大不模糊，适合印刷</span>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Note>离线生成，内容不经过服务器。WiFi 二维码扫码后手机会直接提示连接。</Note>
    </div>
  );
}
