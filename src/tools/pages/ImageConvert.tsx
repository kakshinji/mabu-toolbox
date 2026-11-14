import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { ThumbList } from '../../components/FileThumb';
import { Note } from '../../components/ToolBody';
import { InfoNote } from '../../components/InfoNote';
import { useFiles } from '../../components/useFiles';
import { convertImage } from '../../utils/image';
import type { OutputFormat } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

const formats: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'ico', label: 'ICO' },
];

export default function ImageConvert() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(92);
  const [maxSize, setMaxSize] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const addValid = (list: FileList | File[]) => {
    const arr = Array.from(list);
    const empty = arr.filter((f) => f.size === 0);
    const ok = arr.filter((f) => f.size > 0);
    if (empty.length) setError(`${empty.length} 个文件为空（0 字节），已忽略：${empty.map((f) => f.name).join('、')}`);
    else setError(undefined);
    if (ok.length) add(ok);
  };

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    const out: { name: string; blob: Blob; meta?: string }[] = [];
    const ext = format === 'jpeg' ? 'jpg' : format;
    try {
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i].file;
        const blob = await convertImage(f, format, quality, maxSize || undefined);
        out.push({
          name: `${baseName(f.name)}.${ext}`,
          blob,
          meta: `${formatBytes(f.size)} → ${formatBytes(blob.size)}`,
        });
        setProgress({ done: i + 1, total: files.length });
      }
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败');
      if (out.length) setResult(out);
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone
          onFiles={addValid}
          accept="image/*,.heic,.heif"
          icon="image"
          title="把图片拖到这里，或点击选择"
          subtitle="支持 PNG / JPG / WebP / AVIF / BMP / GIF / HEIC，可批量"
          hint="HEIC 会先在本机解码，再转成你选的格式"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-500">
              已选 <b className="text-ink-900">{files.length}</b> 张，合计{' '}
              {formatBytes(files.reduce((s, f) => s + f.file.size, 0))}
            </p>
            <Button
              variant="ghost"
              className="!py-1.5 !text-xs"
              onClick={() => {
                clear();
                setResult([]);
              }}
            >
              清空
            </Button>
          </div>
          <ThumbList files={files} onRemove={remove} size={64} />
        </>
      )}

      <div className="space-y-4">
        <Field label="输出格式">
          <Segmented value={format} onChange={setFormat} options={formats} />
        </Field>
        {(format === 'jpeg' || format === 'webp' || format === 'avif') && (
          <Field label={`质量：${quality}`} hint="质量越低体积越小">
            <input
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-jade-600"
            />
          </Field>
        )}
        <Field label="限制最长边（像素，0 表示不限制）" hint="例如填 1920，会把超大图片缩到这个尺寸内">
          <input
            type="number"
            min={0}
            step={100}
            className="input w-40"
            value={maxSize}
            onChange={(e) => setMaxSize(Math.max(0, Number(e.target.value)))}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || !files.length}>
            {busy ? '转换中…' : `开始转换（${files.length} 张）`}
          </Button>
          {progress && <span className="text-xs tabular-nums text-ink-400">{progress.done}/{progress.total}</span>}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} zipName="converted-images.zip" />
      <InfoNote icon="wand" title="关于 HEIC 与 ICO">
        HEIC/HEIF 需要先加载解码模块（约 2MB），首次转换会稍慢。ICO 会自动生成 16~256 像素多尺寸，适合做网站图标。
      </InfoNote>
      <Note>所有转换都在本地完成，图片不会上传。批量处理时请留意单张过大图片的内存占用。</Note>
    </div>
  );
}
