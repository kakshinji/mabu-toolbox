import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { ThumbList } from '../../components/FileThumb';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { watermarkImage } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

export default function ImageWatermark() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [text, setText] = useState('© 我的水印');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'tile'>('bottom-right');
  const [size, setSize] = useState(36);
  const [opacity, setOpacity] = useState(60);
  const [color, setColor] = useState('#ffffff');
  const [rotate, setRotate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    const out: { name: string; blob: Blob; meta?: string }[] = [];
    try {
      for (const { file } of files) {
        const blob = await watermarkImage(file, {
          text,
          position,
          size,
          opacity: opacity / 100,
          color,
          rotate,
          format: 'png',
        });
        out.push({ name: `${baseName(file.name)}-wm.png`, blob, meta: formatBytes(blob.size) });
      }
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加水印失败');
      if (out.length) setResult(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone onFiles={add} accept="image/*" title="把图片拖到这里" subtitle="批量加文字水印" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              已选 <b className="text-ink-800">{files.length}</b> 张
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
              清空
            </Button>
          </div>
          <ThumbList files={files} onRemove={remove} size={56} />
        </>
      )}

      <div className="space-y-4">
        <Field label="水印文字">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} />
        </Field>
        <Field label="位置">
          <Segmented
            value={position}
            onChange={setPosition}
            options={[
              { value: 'bottom-right', label: '右下' },
              { value: 'bottom-left', label: '左下' },
              { value: 'top-right', label: '右上' },
              { value: 'center', label: '居中' },
              { value: 'tile', label: '平铺' },
            ]}
          />
        </Field>
        <Row>
          <Field label={`字号：${size}`}>
            <input type="range" min={12} max={160} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-jade-600" />
          </Field>
          <Field label={`透明度：${opacity}%`}>
            <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-jade-600" />
          </Field>
        </Row>
        <Row>
          <Field label={`旋转：${rotate}°`}>
            <input type="range" min={-90} max={90} value={rotate} onChange={(e) => setRotate(Number(e.target.value))} className="w-full accent-jade-600" />
          </Field>
          <Field label="颜色">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
          </Field>
        </Row>
        <Button onClick={run} disabled={busy || !files.length || !text.trim()}>
          {busy ? '处理中…' : '添加水印'}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} zipName="watermarked-images.zip" />
      <Note>深色图片建议用白色水印并配合阴影；导出统一为 PNG，避免二次压缩损失。</Note>
    </div>
  );
}
