import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { toBitmap, drawToCanvas } from '../../utils/image';
import { formatBytes, baseName } from '../../utils/file';

type PageSize = 'auto' | 'a4' | 'letter';
type Fit = 'contain' | 'cover' | 'stretch';

export default function ImageToPdf() {
  const { files, add, remove, move, clear } = useFiles('image/*');
  const [pageSize, setPageSize] = useState<PageSize>('auto');
  const [fit, setFit] = useState<Fit>('contain');
  const [margin, setMargin] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ blob: Blob; name: string }[]>([]);

  // 过滤 0 字节 / 明显无效的文件，避免点下去才失败
  const addValid = (list: FileList | File[]) => {
    const arr = Array.from(list);
    const empty = arr.filter((f) => f.size === 0);
    const ok = arr.filter((f) => f.size > 0);
    if (empty.length) {
      setError(`${empty.length} 个文件为空（0 字节），已忽略：${empty.map((f) => f.name).join('、')}`);
    } else {
      setError(undefined);
    }
    if (ok.length) add(ok);
  };

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const doc = await PDFDocument.create();
      for (const { file } of files) {
        const { bitmap, width, height } = await toBitmap(file);
        const jpegFormat = /\.(jpe?g)$/i.test(file.name);
        let pw: number;
        let ph: number;

        if (pageSize === 'auto') {
          pw = width;
          ph = height;
        } else {
          const dims = pageSize === 'a4' ? [595.28, 841.89] : [612, 792];
          // 根据图片方向决定横竖
          const landscape = width > height;
          pw = landscape ? dims[1] : dims[0];
          ph = landscape ? dims[0] : dims[1];
        }

        // 统一转成 JPEG 再嵌入（兼容性最好）
        const canvas = drawToCanvas(bitmap, width, height, '#ffffff');
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if ('close' in bitmap) (bitmap as ImageBitmap).close();
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const img = await doc.embedJpg(bytes);

        const page = doc.addPage([pw, ph]);
        const availW = pw - margin * 2;
        const availH = ph - margin * 2;
        let dw = availW;
        let dh = availH;
        if (pageSize === 'auto' || fit !== 'stretch') {
          const ratio = Math.min(availW / width, availH / height);
          dw = width * ratio;
          dh = height * ratio;
        }
        if (fit === 'cover' && pageSize !== 'auto') {
          const ratio = Math.max(availW / width, availH / height);
          dw = width * ratio;
          dh = height * ratio;
        }
        if (fit === 'stretch' && pageSize !== 'auto') {
          dw = availW;
          dh = availH;
        }
        page.drawImage(img, {
          x: (pw - dw) / 2,
          y: (ph - dh) / 2,
          width: dw,
          height: dh,
        });
      }
      const bytes = await doc.save();
      const blob = bytesToBlob(bytes, 'application/pdf');
      setResult([{ blob, name: `${files.length > 1 || files[0] ? baseName(files[0].file.name) : 'images'}.pdf` }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成 PDF 失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone onFiles={addValid} accept="image/*" title="把图片拖到这里" subtitle="支持 JPG / PNG / WebP / HEIC 等，可多选" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              共 <b className="text-ink-800">{files.length}</b> 张图片，合计 {formatBytes(files.reduce((s, f) => s + f.file.size, 0))}
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={clear}>
              清空
            </Button>
          </div>
          <FileList files={files} onRemove={remove} onMove={move} />
        </>
      )}

      <div className="space-y-4">
        <Field label="页面尺寸">
          <Segmented
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: 'auto', label: '跟随图片' },
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'Letter' },
            ]}
          />
        </Field>
        {pageSize !== 'auto' && (
          <Field label="图片填充方式">
            <Segmented
              value={fit}
              onChange={setFit}
              options={[
                { value: 'contain', label: '完整显示' },
                { value: 'cover', label: '铺满裁切' },
                { value: 'stretch', label: '拉伸' },
              ]}
            />
          </Field>
        )}
        <Field label={`页边距：${margin} pt`}>
          <input
            type="range"
            min={0}
            max={72}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="w-full accent-jade-600"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy || !files.length}>
          {busy ? '生成中…' : `生成 PDF（${files.length} 页）`}
        </Button>
        <span className="text-xs text-ink-400">图片按列表顺序排列</span>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>大图会被重新编码为 JPEG 以控制体积，原始清晰度基本保留。</Note>
    </div>
  );
}
