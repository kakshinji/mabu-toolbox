import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented, Slider } from '../../components/ui';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { watermarkPdf, describePdfError } from '../../utils/pdf';

export default function PdfWatermark() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [text, setText] = useState('内部资料');
  const [size, setSize] = useState(48);
  const [opacity, setOpacity] = useState(15);
  const [angle, setAngle] = useState(35);
  const [color, setColor] = useState('#94a3b8');
  const [layout, setLayout] = useState<'center' | 'tile'>('center');
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
      const data = await watermarkPdf(file, {
        text,
        size,
        opacity: opacity / 100,
        angle,
        color,
        tile: layout === 'tile',
      });
      setResult([{ blob: bytesToBlob(data, 'application/pdf'), name: file.name.replace(/\.pdf$/i, '') + '-水印.pdf' }]);
    } catch (e) {
      setError(describePdfError(e, '添加水印'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="给整份文档加文字水印" />
      ) : (
        <FileList files={files} onRemove={() => { clear(); setResult([]); }} />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="水印文字">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} />
          </Field>
          <Field label="排布方式">
            <Segmented
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'center', label: '居中一个' },
                { value: 'tile', label: '平铺满页' },
              ]}
            />
          </Field>
          <Row>
            <Field label={`字号：${size}`}>
              <Slider value={size} onChange={setSize} min={12} max={120} />
            </Field>
            <Field label={`透明度：${opacity}%`}>
              <Slider value={opacity} onChange={setOpacity} min={2} max={100} />
            </Field>
          </Row>
          <Row>
            <Field label={`旋转角度：${angle}°`}>
              <Slider value={angle} onChange={setAngle} min={0} max={90} />
            </Field>
            <Field label="颜色">
              <input type="color" className="h-10 w-20 cursor-pointer rounded-lg border border-ink-900/[0.08]" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
          </Row>
          <Button onClick={run} disabled={busy || !text.trim()}>
            {busy ? '添加中…' : '添加水印'}
          </Button>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>水印作为文字层写入，不影响原页面内容；中文可以使用系统字体。</Note>
    </div>
  );
}
