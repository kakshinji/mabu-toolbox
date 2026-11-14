import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field } from '../../components/ui';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { removeSolidBackground } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

export default function ImageRemoveBg() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [color, setColor] = useState('#ffffff');
  const [tolerance, setTolerance] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const blob = await removeSolidBackground(file, { color, tolerance });
      setResult([{ name: `${baseName(file.name)}-transparent.png`, blob, meta: formatBytes(blob.size) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '去底失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="image/*" multiple={false} title="选择图片" subtitle="把纯色背景（白底/蓝底）变成透明" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{file.name}</span>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
            换一张
          </Button>
          {remove && (
            <button type="button" onClick={() => remove(files[0].id)} className="text-xs text-ink-400 hover:text-clay-500">
              移除
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Row>
          <Field label="要去掉的背景色" hint="用取色器或输入 HEX，白色背景就是 #ffffff">
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
              <input className="input mono" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </Field>
          <Field label={`容差：${tolerance}%`} hint="值越大去掉的颜色范围越广，过大会吃掉主体边缘">
            <input type="range" min={0} max={60} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full accent-jade-600" />
          </Field>
        </Row>
        <Button onClick={run} disabled={busy || !file}>
          {busy ? '处理中…' : '去底并生成 PNG'}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>
        这是基于颜色距离的抠图，适合证件照、商品图这类纯色背景。复杂背景（人像、发丝）请用专业 AI 抠图工具。
      </Note>
    </div>
  );
}
