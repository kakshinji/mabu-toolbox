import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { resizeImage } from '../../utils/image';
import type { OutputFormat } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

export default function ImageResize() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [mode, setMode] = useState<'width' | 'height' | 'longest' | 'percent'>('longest');
  const [value, setValue] = useState(1920);
  const [keepRatio, setKeepRatio] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    const out: { name: string; blob: Blob; meta?: string }[] = [];
    const ext = format === 'jpeg' ? 'jpg' : format;
    try {
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i].file;
        const blob = await resizeImage(f, { mode, value, keepRatio, format, quality });
        out.push({ name: `${baseName(f.name)}-${value}${mode === 'percent' ? 'pct' : 'px'}.${ext}`, blob, meta: formatBytes(blob.size) });
        setProgress({ done: i + 1, total: files.length });
      }
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : '缩放失败');
      if (out.length) setResult(out);
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone onFiles={add} accept="image/*" title="把图片拖到这里" subtitle="批量调整尺寸，支持 PNG / JPG / WebP / HEIC" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              已选 <b className="text-ink-800">{files.length}</b> 张
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
              清空
            </Button>
          </div>
          <ul className="divide-y divide-ink-900/[0.06] overflow-hidden rounded-xl border border-ink-900/[0.08]">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{f.file.name}</span>
                <span className="shrink-0 text-xs text-ink-400">{formatBytes(f.file.size)}</span>
                <button type="button" onClick={() => remove(f.id)} className="shrink-0 text-xs text-ink-400 hover:text-clay-500">
                  移除
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="space-y-4">
        <Field label="缩放依据">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'longest', label: '最长边' },
              { value: 'width', label: '宽度' },
              { value: 'height', label: '高度' },
              { value: 'percent', label: '百分比' },
            ]}
          />
        </Field>
        <Field label={mode === 'percent' ? '百分比（%）' : '目标像素'}>
          <input
            type="number"
            min={1}
            className="input w-40"
            value={value}
            onChange={(e) => setValue(Math.max(1, Number(e.target.value)))}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} />
          保持宽高比
        </label>
        <Field label="输出格式">
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { value: 'jpeg', label: 'JPG' },
              { value: 'png', label: 'PNG' },
              { value: 'webp', label: 'WebP' },
            ]}
          />
        </Field>
        <Field label={`质量：${quality}`}>
          <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-jade-600" />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || !files.length}>
            {busy ? '处理中…' : '开始缩放'}
          </Button>
          {progress && <span className="text-xs text-ink-500">{progress.done}/{progress.total}</span>}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} zipName="resized-images.zip" />
      <Note>放大图片不会增加细节，建议只用于缩小。批量处理时所有图片使用同一规则。</Note>
    </div>
  );
}
