import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Progress, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { runFfmpeg } from '../../utils/media';
import { baseName, formatBytes } from '../../utils/file';

function toSec(t: string): number {
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}

export default function VideoToGif() {
  const { files, add, clear } = useFiles('video/*');
  const [start, setStart] = useState('00:00:00');
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(12);
  const [width, setWidth] = useState(480);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    setProgress(0);
    try {
      const inputName = `input.${file.name.split('.').pop()?.toLowerCase() ?? 'mp4'}`;
      const blob = await runFfmpeg({
        input: file,
        args: [
          '-ss',
          String(toSec(start)),
          '-t',
          String(duration),
          '-i',
          inputName,
          '-vf',
          `fps=${fps},scale=${width}:-1:flags=lanczos`,
          '-loop',
          '0',
        ],
        outputName: 'out.gif',
        onProgress: (r) => setProgress(r * 100),
        onStatus: setStatus,
      });
      const typed = new Blob([blob], { type: 'image/gif' });
      setResult([{ name: `${baseName(file.name)}.gif`, blob: typed, meta: formatBytes(typed.size) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="video/*" multiple={false} title="选择视频" subtitle="截取一段生成 GIF，建议 10 秒以内" hint="首次使用需下载约 30MB 转码引擎" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">
            {file.name} · {formatBytes(file.size)}
          </span>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setResult([]); }}>
            换文件
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="开始时间" hint="格式 00:00:05 或 5">
            <input className="input mono" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="持续时长（秒）">
            <input type="number" min={1} max={60} className="input w-28" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </Field>
        </div>
        <Field label={`帧率：${fps} fps`} hint="GIF 建议 10~15，太高体积暴涨">
          <input type="range" min={5} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full accent-jade-600" />
        </Field>
        <Field label="宽度（像素）">
          <Segmented
            value={String(width)}
            onChange={(v) => setWidth(Number(v))}
            options={[
              { value: '320', label: '320 小' },
              { value: '480', label: '480 推荐' },
              { value: '640', label: '640 大' },
              { value: '800', label: '800 更大' },
            ]}
          />
        </Field>
        <Button onClick={run} disabled={busy || !file}>
          {busy ? '生成中…' : '生成 GIF'}
        </Button>
        {(busy || progress > 0) && <Progress value={progress} text={status || '处理中…'} />}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>GIF 最多 256 色，画面渐变会有色带。对体积敏感的话优先降低宽度和帧率。</Note>
    </div>
  );
}
