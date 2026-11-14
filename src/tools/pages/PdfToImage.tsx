import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented, Progress } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { pdfToImages } from '../../utils/pdfjs';
import { describePdfError } from '../../utils/pdf';
import { baseName } from '../../utils/file';

export default function PdfToImage() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [dpi, setDpi] = useState<'1' | '1.5' | '2' | '3'>('2');
  const [quality, setQuality] = useState(88);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    setProgress({ done: 0, total: 1 });
    try {
      const pages = await pdfToImages(
        file,
        { scale: Number(dpi), format, quality: quality / 100 },
        (done, total) => setProgress({ done, total }),
      );
      const base = baseName(file.name);
      setResult(
        pages.map((p) => ({
          name: `${base}-第${String(p.pageNumber).padStart(3, '0')}页.${format === 'jpeg' ? 'jpg' : 'png'}`,
          blob: p.blob,
          meta: `${p.width}×${p.height} · ${(p.blob.size / 1024).toFixed(0)} KB`,
        })),
      );
    } catch (e) {
      setError(describePdfError(e, '转换'));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="每一页都会导出成一张图片" />
      ) : (
        <FileList files={files} onRemove={() => { clear(); setResult([]); }} />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="输出格式">
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: 'png', label: 'PNG（清晰、体积大）' },
                { value: 'jpeg', label: 'JPG（小、适合分享）' },
              ]}
            />
          </Field>
          <Field label="清晰度" hint="倍数越高越清楚，文件也越大。2 倍约等于 144 DPI">
            <Segmented
              value={dpi}
              onChange={setDpi}
              options={[
                { value: '1', label: '1×（屏显）' },
                { value: '1.5', label: '1.5×' },
                { value: '2', label: '2×（推荐）' },
                { value: '3', label: '3×（高清）' },
              ]}
            />
          </Field>
          {format === 'jpeg' && (
            <Field label={`JPEG 质量：${quality}`}>
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
          <Button onClick={run} disabled={busy}>
            {busy ? '转换中…' : '开始转换'}
          </Button>
          {progress && (
            <Progress value={(progress.done / progress.total) * 100} text={`正在处理第 ${progress.done}/${progress.total} 页`} />
          )}
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} zipName={`${file ? baseName(file.name) : 'pdf'}-images.zip`} />
      <Note>页数很多的 PDF 会占用较多内存，建议一次不超过 100 页。</Note>
    </div>
  );
}
