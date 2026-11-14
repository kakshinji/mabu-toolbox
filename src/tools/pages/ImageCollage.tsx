import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { ThumbList } from '../../components/FileThumb';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { collageImages } from '../../utils/image';
import { formatBytes } from '../../utils/file';

export default function ImageCollage() {
  const { files, add, remove, move, clear } = useFiles('image/*');
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [gap, setGap] = useState(0);
  const [background, setBackground] = useState('#ffffff');
  const [maxWidth, setMaxWidth] = useState(1080);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const run = async () => {
    if (files.length < 2) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const blob = await collageImages(files.map((f) => f.file), {
        direction,
        gap,
        background,
        maxWidth: direction === 'vertical' ? maxWidth : undefined,
      });
      setResult([{ name: `拼接长图-${files.length}张.jpg`, blob, meta: formatBytes(blob.size) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '拼接失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone onFiles={add} accept="image/*" title="把图片拖到这里" subtitle="两张以上，按列表顺序拼接" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              共 <b className="text-ink-800">{files.length}</b> 张，顺序可在列表里调整
            </p>
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
              清空
            </Button>
          </div>
          <ul className="divide-y divide-ink-900/[0.06] overflow-hidden rounded-xl border border-ink-900/[0.08]">
            {files.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-xs text-ink-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{f.file.name}</span>
                <button type="button" onClick={() => move(f.id, -1)} className="text-xs text-ink-400 hover:text-ink-700">上移</button>
                <button type="button" onClick={() => move(f.id, 1)} className="text-xs text-ink-400 hover:text-ink-700">下移</button>
                <button type="button" onClick={() => remove(f.id)} className="text-xs text-ink-400 hover:text-clay-500">移除</button>
              </li>
            ))}
          </ul>
          <ThumbList files={files} size={48} />
        </>
      )}

      <div className="space-y-4">
        <Field label="拼接方向">
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'vertical', label: '纵向长图（上下拼）' },
              { value: 'horizontal', label: '横向（左右拼）' },
            ]}
          />
        </Field>
        <Row>
          <Field label={`图片间距：${gap}px`}>
            <input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="w-full accent-jade-600" />
          </Field>
          <Field label="背景色（间距与空白处）">
            <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-10 w-20 cursor-pointer rounded-lg border border-ink-900/[0.08]" />
          </Field>
        </Row>
        {direction === 'vertical' && (
          <Field label="输出宽度（px）" hint="所有图片会等比缩放到这个宽度，避免长图宽窄不一">
            <input type="number" min={200} step={40} className="input w-40" value={maxWidth} onChange={(e) => setMaxWidth(Math.max(200, Number(e.target.value)))} />
          </Field>
        )}
        <Button onClick={run} disabled={busy || files.length < 2}>
          {busy ? '拼接中…' : `拼接 ${files.length} 张图片`}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>纵向拼接常用于聊天记录、文章长图；图片会等比缩放，不会被裁切。</Note>
    </div>
  );
}
