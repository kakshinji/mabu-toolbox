import { useState } from 'react';
import { Dropzone, Button, Alert } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

declare global {
  interface Window {
    jsQR?: (data: Uint8ClampedArray, width: number, height: number, opts?: unknown) => { data: string } | null;
  }
}

const JSQR_CDN = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('无法加载解码库'));
    document.head.appendChild(s);
  });
}

async function decodeWithBarcodeDetector(image: ImageBitmap): Promise<string | null> {
  const Ctor = (window as any).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = await Ctor.getSupportedFormats?.();
    const detector = new Ctor(formats ? { formats: ['qr_code'] } : undefined);
    const codes = await detector.detect(image);
    return codes?.[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

export default function QrDecode() {
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const decode = async (f: File) => {
    setBusy(true);
    setError(undefined);
    setResult('');
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片读取失败'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 不可用');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 1) 优先用浏览器原生 BarcodeDetector
      const bmp = await createImageBitmap(canvas);
      let text = await decodeWithBarcodeDetector(bmp);
      bmp.close();

      // 2) 回退到 jsQR
      if (!text) {
        await loadScript(JSQR_CDN);
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          text = code?.data ?? null;
        }
      }

      if (text) setResult(text);
      else setError('没有识别到二维码。请确认图片清晰、二维码完整，或换一张图。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  const copy = async () => {
    if (await copyText(result)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          onFiles={(list) => {
            const f = Array.from(list)[0];
            if (f) {
              setFile(f);
              decode(f);
            }
          }}
          accept="image/*"
          multiple={false}
          title="上传带二维码的图片"
          subtitle="截图、照片都可以，自动识别其中的内容"
        />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{file.name}</span>
          <Button
            variant="ghost"
            className="!py-1.5 !text-xs"
            onClick={() => {
              setFile(undefined);
              setResult('');
              setError(undefined);
            }}
          >
            换一张
          </Button>
        </div>
      )}

      {busy && <Alert tone="info">正在识别…</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}

      {result && (
        <div className="rounded-xl border border-jade-200 bg-jade-50/60 p-4">
          <div className="mb-1 text-xs font-medium text-jade-700">识别结果</div>
          <div className="break-all text-sm text-ink-800">{result}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" className="!py-1.5 !text-xs" onClick={copy}>
              {copied ? '已复制 ✓' : '复制内容'}
            </Button>
            {/^https?:\/\//.test(result) && (
              <a href={result} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-xs">
                打开链接
              </a>
            )}
          </div>
        </div>
      )}

      <Note>优先使用浏览器内置识别能力，不支持时自动加载轻量解码库（约 50KB）。图片不会上传。</Note>
    </div>
  );
}
