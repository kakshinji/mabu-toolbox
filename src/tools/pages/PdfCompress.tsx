import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented, Progress } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { InfoNotes } from '../../components/InfoNote';
import { useFiles } from '../../components/useFiles';
import { describePdfError } from '../../utils/pdf';
import { formatBytes } from '../../utils/file';

export default function PdfCompress() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [level, setLevel] = useState<'light' | 'medium' | 'strong'>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<{ name: string; blob: Blob; before: number; after: number }[]>([]);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    setProgress({ done: 0, total: 1 });
    try {
      const { compressPdf } = await import('../../utils/pdfCompress');
      const scale = level === 'light' ? 1.0 : level === 'medium' ? 0.7 : 0.5;
      const quality = level === 'light' ? 0.85 : level === 'medium' ? 0.65 : 0.45;
      const blob = await compressPdf(file, scale, quality, (done, total) => setProgress({ done, total }));
      setResult([
        {
          name: file.name.replace(/\.pdf$/i, '') + '-压缩.pdf',
          blob,
          before: file.size,
          after: blob.size,
        },
      ]);
    } catch (e) {
      setError(describePdfError(e, '压缩'));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const saved = result[0] ? Math.max(0, Math.round((1 - result[0].after / result[0].before) * 100)) : 0;

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          onFiles={add}
          accept="application/pdf,.pdf"
          multiple={false}
          icon="gauge"
          title="选择要压缩的 PDF"
          subtitle="建议单文件小于 200MB"
        />
      ) : (
        <FileList
          files={files}
          onRemove={() => {
            clear();
            setResult([]);
          }}
        />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="压缩强度" hint="强度越高体积越小，但内嵌图片会变模糊；纯文字 PDF 效果有限">
            <Segmented
              value={level}
              onChange={setLevel}
              options={[
                { value: 'light', label: '轻度（保留清晰度）' },
                { value: 'medium', label: '推荐' },
                { value: 'strong', label: '强力（体积优先）' },
              ]}
            />
          </Field>
          <Button onClick={run} disabled={busy}>
            {busy ? '压缩中…' : '开始压缩'}
          </Button>
          {progress && (
            <Progress
              value={(progress.done / progress.total) * 100}
              text={`正在处理第 ${progress.done}/${progress.total} 页`}
            />
          )}
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {result[0] && (
        <div className="card flex flex-wrap items-center gap-4 p-5 text-sm">
          <span className="text-ink-500">
            原始：<b className="text-ink-900">{formatBytes(result[0].before)}</b>
          </span>
          <span className="text-ink-300">→</span>
          <span className="text-ink-500">
            压缩后：<b className="text-jade-700">{formatBytes(result[0].after)}</b>
          </span>
          <span
            className={`chip ${saved > 0 ? '!bg-jade-50 !text-jade-700' : '!bg-amberish-50 !text-[#8a6420]'}`}
          >
            {saved > 0 ? `减少 ${saved}%` : '没有变小'}
          </span>
        </div>
      )}

      <ResultPanel items={result.map((r) => ({ name: r.name, blob: r.blob, meta: formatBytes(r.blob.size) }))} />
      <InfoNotes
        items={[
          {
            icon: 'info',
            title: '原理',
            body: '把每页渲染成图片再重新封装，并对图片做降采样与重新编码。纯文字 PDF 本身很小，压缩空间有限。',
          },
          {
            icon: 'alert',
            title: '注意',
            body: '压缩后文字会变成图片，不能再选中复制。如果还要编辑内容，请保留原文件。',
          },
        ]}
      />
      <Note>大文件渲染需要较多内存，若浏览器卡住请关闭其他标签页后重试。</Note>
    </div>
  );
}
