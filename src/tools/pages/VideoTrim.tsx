import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Progress, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { runFfmpeg, mimeFor } from '../../utils/media';
import { baseName, formatBytes } from '../../utils/file';

function toSec(t: string): number {
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}

export default function VideoTrim() {
  const { files, add, clear } = useFiles('video/*');
  const [start, setStart] = useState('00:00:00');
  const [end, setEnd] = useState('00:00:30');
  const [mode, setMode] = useState<'reencode' | 'copy'>('reencode');
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
      const startSec = toSec(start);
      const endSec = toSec(end);
      if (endSec <= startSec) throw new Error('结束时间必须大于开始时间');
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
      const inputName = `input.${ext}`;
      const outputName = `out.${ext === 'mov' ? 'mp4' : ext}`;
      const args = [
        '-ss',
        String(startSec),
        '-to',
        String(endSec),
        '-i',
        inputName,
        ...(mode === 'copy'
          ? ['-c', 'copy']
          : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k']),
      ];
      const blob = await runFfmpeg({
        input: file,
        args,
        outputName,
        onProgress: (r) => setProgress(r * 100),
        onStatus: setStatus,
      });
      const typed = new Blob([blob], { type: mimeFor(outputName.split('.').pop() ?? 'mp4') });
      setResult([{ name: `${baseName(file.name)}-剪辑.${outputName.split('.').pop()}`, blob: typed, meta: formatBytes(typed.size) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '裁剪失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="video/*" multiple={false} title="选择视频" subtitle="按时间点裁出需要的片段" hint="首次使用需下载约 30MB 转码引擎" />
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
          <Field label="开始时间" hint="00:00:10 或 10">
            <input className="input mono" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="结束时间">
            <input className="input mono" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="裁剪方式" hint="「快速复制」几乎瞬间完成但不精确；「重新编码」精度到帧，耗时较长">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'reencode', label: '重新编码（精确）' },
              { value: 'copy', label: '快速复制（不精确）' },
            ]}
          />
        </Field>
        <Button onClick={run} disabled={busy || !file}>
          {busy ? '处理中…' : '裁剪并下载'}
        </Button>
        {(busy || progress > 0) && <Progress value={progress} text={status || '处理中…'} />}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>需要无损、精确到关键帧的剪辑，请用桌面版 LosslessCut；浏览器版只适合快速片段处理。</Note>
    </div>
  );
}
