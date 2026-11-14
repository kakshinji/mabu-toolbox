import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Actions, Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { splitPdf, describePdfError } from '../../utils/pdf';
import { loadPdf } from '../../utils/pdf';

export default function PdfSplit() {
  const { files, add, remove, clear, inputProps } = useFiles('application/pdf,.pdf');
  const [mode, setMode] = useState<'ranges' | 'each' | 'every'>('ranges');
  const [ranges, setRanges] = useState('1-2,3-');
  const [every, setEvery] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ name: string; blob: Blob }[]>([]);
  const [pageCount, setPageCount] = useState<number>();

  const file = files[0]?.file;

  const onFiles = async (list: FileList | File[]) => {
    add(list);
    const f = Array.from(list)[0];
    if (f) {
      try {
        const doc = await loadPdf(f);
        setPageCount(doc.getPageCount());
      } catch {
        setPageCount(undefined);
      }
    }
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const parts = await splitPdf(file, { mode, ranges, every });
      setResult(
        parts.map((p) => ({ name: p.name, blob: bytesToBlob(p.data, 'application/pdf') })),
      );
    } catch (e) {
      setError(describePdfError(e, '拆分'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          onFiles={onFiles}
          accept="application/pdf,.pdf"
          multiple={false}
          title="选择要拆分的 PDF"
          subtitle="一次处理一个文件"
        />
      ) : (
        <>
          <input {...inputProps} />
          <FileList
            files={files}
            onRemove={() => {
              clear();
              setPageCount(undefined);
              setResult([]);
            }}
          />
          {pageCount && <p className="text-sm text-ink-500">这份 PDF 共 {pageCount} 页</p>}
        </>
      )}

      {file && (
        <div className="space-y-4">
          <Field label="拆分方式">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'ranges', label: '按范围分段' },
                { value: 'every', label: '每 N 页一份' },
                { value: 'each', label: '每页单独一份' },
              ]}
            />
          </Field>

          {mode === 'ranges' && (
            <Field
              label="页码范围"
              hint="用逗号分隔多段，例如 1-2,3- 表示第 1~2 页一段、第 3 页到末尾一段；每段生成一个 PDF"
            >
              <input className="input mono" value={ranges} onChange={(e) => setRanges(e.target.value)} />
            </Field>
          )}

          {mode === 'every' && (
            <Field label="每份页数">
              <input
                type="number"
                min={1}
                className="input w-32"
                value={every}
                onChange={(e) => setEvery(Math.max(1, Number(e.target.value)))}
              />
            </Field>
          )}

          <Actions>
            <Button onClick={run} disabled={busy}>
              {busy ? '拆分中…' : '开始拆分'}
            </Button>
          </Actions>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} zipName="split-pdf.zip" />
      <Note>输出为多个 PDF 文件，文件较多时用「打包下载 ZIP」一次性拿走。</Note>
    </div>
  );
}
