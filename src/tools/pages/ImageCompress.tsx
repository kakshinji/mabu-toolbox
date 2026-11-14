import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { ThumbList } from '../../components/FileThumb';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { compressImage } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

export default function ImageCompress() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [quality, setQuality] = useState(75);
  const [maxSize, setMaxSize] = useState(0);
  const [format, setFormat] = useState<'keep' | 'jpeg' | 'webp'>('keep');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const before = files.reduce((s, f) => s + f.file.size, 0);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    const out: { name: string; blob: Blob; meta?: string }[] = [];
    try {
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i].file;
        const blob = await compressImage(f, { quality, maxSize: maxSize || undefined, format });
        const ext = format === 'webp' ? 'webp' : 'jpg';
        out.push({ name: `${baseName(f.name)}-compressed.${ext}`, blob, meta: `${formatBytes(f.size)} → ${formatBytes(blob.size)}` });
        setProgress({ done: i + 1, total: files.length });
      }
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : '压缩失败');
      if (out.length) setResult(out);
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const after = result.reduce((s, r) => s + r.blob.size, 0);
  const saved = result.length ? Math.round((1 - after / before) * 100) : 0;

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone onFiles={add} accept="image/*" title="把图片拖到这里" subtitle="支持批量，PNG / JPG / WebP / HEIC" hint="完全在本地压缩，图片不会上传" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              已选 <b className="text-ink-800">{files.length}</b> 张，原始合计 {formatBytes(before)}
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
              清空
            </Button>
          </div>
          <ThumbList files={files} onRemove={remove} size={56} />
        </>
      )}

      <div className="space-y-4">
        <Field label={`压缩质量：${quality}`} hint="一般用 70~80 就够，肉眼几乎无差别">
          <input type="range" min={20} max={95} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-jade-600" />
        </Field>
        <Row>
          <Field label="输出格式">
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: 'keep', label: '保持原格式' },
                { value: 'jpeg', label: 'JPG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
          </Field>
          <Field label="同时限制最长边（0 = 不限制）">
            <input type="number" min={0} step={100} className="input w-40" value={maxSize} onChange={(e) => setMaxSize(Math.max(0, Number(e.target.value)))} />
          </Field>
        </Row>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || !files.length}>
            {busy ? '压缩中…' : `开始压缩（${files.length} 张）`}
          </Button>
          {progress && <span className="text-xs text-ink-500">{progress.done}/{progress.total}</span>}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {result.length > 0 && (
        <div className="card flex flex-wrap items-center gap-4 p-5 text-sm">
          <span className="text-ink-500">
            原始：<b className="text-ink-800">{formatBytes(before)}</b>
          </span>
          <span className="text-ink-300">→</span>
          <span className="text-ink-500">
            压缩后：<b className="text-jade-700">{formatBytes(after)}</b>
          </span>
          <span className={`chip ${saved > 0 ? '!bg-jade-50 !text-jade-700' : '!bg-amberish-50 !text-[#8a6420]'}`}>
            {saved > 0 ? `节省 ${saved}%` : '没有变小'}
          </span>
        </div>
      )}

      <ResultPanel items={result} zipName="compressed-images.zip" />
      <Note>如果原图本身已经压缩过（例如微信保存的 JPG），再压缩的空间会比较小。</Note>
    </div>
  );
}
