import { useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented, Progress } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { InfoNotes } from '../../components/InfoNote';
import { useFiles } from '../../components/useFiles';
import { runFfmpeg, mimeFor } from '../../utils/media';
import { baseName, formatBytes } from '../../utils/file';

type Preset = 'mp4' | 'webm' | 'mp3' | 'wav' | 'm4a' | 'gif' | 'extract-mp3';

const presets: { value: Preset; label: string; desc: string }[] = [
  { value: 'mp4', label: '转 MP4', desc: '兼容性最好的视频格式，H.264' },
  { value: 'webm', label: '转 WebM', desc: '网页友好，体积极小' },
  { value: 'mp3', label: '转 MP3', desc: '音频转 MP3，128kbps' },
  { value: 'wav', label: '转 WAV', desc: '无损未压缩音频，体积大' },
  { value: 'm4a', label: '转 M4A', desc: 'AAC 音频，苹果设备友好' },
  { value: 'extract-mp3', label: '视频提取音轨（MP3）', desc: '从视频里把声音单独拿出来' },
  { value: 'gif', label: '转 GIF', desc: '整段转换成 GIF，适合短片段' },
];

function argsFor(preset: Preset, quality: number): { args: string[]; ext: string } {
  switch (preset) {
    case 'mp4':
      return {
        args: ['-i', 'input', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(quality), '-c:a', 'aac', '-b:a', '128k'],
        ext: 'mp4',
      };
    case 'webm':
      return {
        args: ['-i', 'input', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(quality), '-c:a', 'libopus', '-b:a', '96k'],
        ext: 'webm',
      };
    case 'mp3':
      return { args: ['-i', 'input', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k'], ext: 'mp3' };
    case 'wav':
      return { args: ['-i', 'input', '-vn', '-c:a', 'pcm_s16le', '-ar', '44100'], ext: 'wav' };
    case 'm4a':
      return { args: ['-i', 'input', '-vn', '-c:a', 'aac', '-b:a', '192k'], ext: 'm4a' };
    case 'extract-mp3':
      return { args: ['-i', 'input', '-vn', '-c:a', 'libmp3lame', '-q:a', '2'], ext: 'mp3' };
    case 'gif':
      return { args: ['-i', 'input', '-vf', 'fps=12,scale=480:-1:flags=lanczos', '-loop', '0'], ext: 'gif' };
    default: {
      const exhaustive: never = preset;
      throw new Error(`未知的转换目标：${String(exhaustive)}`);
    }
  }
}

export default function MediaConvert() {
  const { files, add, clear } = useFiles('video/*,audio/*');
  const [preset, setPreset] = useState<Preset>('mp4');
  const [quality, setQuality] = useState(23);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ name: string; blob: Blob; meta?: string }[]>([]);

  const file = files[0]?.file;
  const current = presets.find((p) => p.value === preset)!;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    setProgress(0);
    try {
      const { args, ext } = argsFor(preset, quality);
      const inputName = `input.${file.name.split('.').pop()?.toLowerCase() ?? 'bin'}`;
      const fixedArgs = args.map((a) => (a === 'input' ? inputName : a));
      const outputName = `output.${ext}`;
      const blob = await runFfmpeg({
        input: file,
        args: fixedArgs,
        outputName,
        onProgress: (r) => setProgress(r * 100),
        onStatus: setStatus,
      });
      const typed = new Blob([blob], { type: mimeFor(ext) });
      setResult([
        {
          name: `${baseName(file.name)}.${ext}`,
          blob: typed,
          meta: `${formatBytes(file.size)} → ${formatBytes(typed.size)}`,
        },
      ]);
      setStatus('完成');
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          onFiles={add}
          accept="video/*,audio/*"
          multiple={false}
          icon="film"
          title="选择视频或音频文件"
          subtitle="MP4 / MOV / MKV / WebM / MP3 / WAV / M4A 等"
          hint="首次使用需下载约 30MB 转码引擎"
        />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-700">
            {file.name} · {formatBytes(file.size)}
          </span>
          <Button
            variant="ghost"
            className="!py-1.5 !text-xs"
            onClick={() => {
              clear();
              setResult([]);
            }}
          >
            换文件
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Field label="转换目标">
          <Segmented
            value={preset}
            onChange={setPreset}
            options={presets.map((p) => ({ value: p.value, label: p.label }))}
          />
          <p className="hint">{current.desc}</p>
        </Field>
        {(preset === 'mp4' || preset === 'webm') && (
          <Field label={`画质参数 CRF：${quality}`} hint="数值越小画质越好、体积越大，常用 18~28">
            <input
              type="range"
              min={16}
              max={32}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-jade-600"
            />
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || !file}>
            {busy ? '转换中…' : '开始转换'}
          </Button>
          <span className="text-xs text-ink-400">建议视频小于 200MB / 5 分钟</span>
        </div>
        {(busy || progress > 0) && <Progress value={progress} text={status || '处理中…'} />}
      </div>

      {error && <Alert tone="error" title="转换失败">{error}</Alert>}
      <ResultPanel items={result} />
      <InfoNotes
        items={[
          {
            icon: 'gauge',
            title: '为什么慢？',
            body: '浏览器里跑的是 WebAssembly 版 FFmpeg，速度大约是原生的一半到五分之一，而且受内存限制。',
          },
          {
            icon: 'scissors',
            title: '大文件怎么办',
            body: '先用「视频截取」剪出需要的片段，再转换；或者用桌面版 HandBrake / LosslessCut。',
          },
        ]}
      />
    </div>
  );
}
