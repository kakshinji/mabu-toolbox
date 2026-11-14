import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { addPageNumbers, describePdfError } from '../../utils/pdf';

export default function PdfPageNumber() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [format, setFormat] = useState('第 {n} 页 / 共 {total} 页');
  const [start, setStart] = useState(1);
  const [size, setSize] = useState(10);
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ blob: Blob; name: string }[]>([]);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const data = await addPageNumbers(file, { format, start, size, position });
      setResult([{ blob: bytesToBlob(data, 'application/pdf'), name: file.name.replace(/\.pdf$/i, '') + '-页码.pdf' }]);
    } catch (e) {
      setError(describePdfError(e, '添加页码'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="批量添加页码" />
      ) : (
        <FileList files={files} onRemove={() => { clear(); setResult([]); }} />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="页码格式" hint="{n} 会替换成页码，{total} 替换成总页数">
            <input className="input" value={format} onChange={(e) => setFormat(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="起始页码">
              <input type="number" min={1} className="input w-28" value={start} onChange={(e) => setStart(Math.max(1, Number(e.target.value)))} />
            </Field>
            <Field label="字号">
              <input type="number" min={6} max={24} className="input w-28" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="位置">
            <Segmented
              value={position}
              onChange={setPosition}
              options={[
                { value: 'bottom-center', label: '底部居中' },
                { value: 'bottom-right', label: '底部右侧' },
                { value: 'top-center', label: '顶部居中' },
                { value: 'top-right', label: '顶部右侧' },
              ]}
            />
          </Field>
          <Button onClick={run} disabled={busy}>
            {busy ? '处理中…' : '添加页码'}
          </Button>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>页码使用 Helvetica 字体写入，若格式里包含中文可能显示异常，建议使用数字格式。</Note>
    </div>
  );
}
