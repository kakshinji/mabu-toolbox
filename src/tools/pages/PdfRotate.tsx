import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { rotatePdf, describePdfError } from '../../utils/pdf';

export default function PdfRotate() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [angle, setAngle] = useState<'90' | '180' | '270'>('90');
  const [pages, setPages] = useState('');
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
      const data = await rotatePdf(file, Number(angle) as 90 | 180 | 270, pages);
      setResult([{ blob: bytesToBlob(data, 'application/pdf'), name: file.name.replace(/\.pdf$/i, '') + '-旋转.pdf' }]);
    } catch (e) {
      setError(describePdfError(e, '旋转'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="修正扫描件方向" />
      ) : (
        <FileList files={files} onRemove={() => { clear(); setResult([]); }} />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="旋转角度">
            <Segmented
              value={angle}
              onChange={setAngle}
              options={[
                { value: '90', label: '顺时针 90°' },
                { value: '180', label: '180°' },
                { value: '270', label: '逆时针 90°' },
              ]}
            />
          </Field>
          <Field label="作用范围" hint="留空表示整份旋转；也可以写 1-3,5 只旋转指定页">
            <input className="input mono" placeholder="留空 = 全部页" value={pages} onChange={(e) => setPages(e.target.value)} />
          </Field>
          <Button onClick={run} disabled={busy}>
            {busy ? '处理中…' : '旋转并下载'}
          </Button>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>旋转只改变页面显示方向，不会重绘内容，文件体积基本不变。</Note>
    </div>
  );
}
