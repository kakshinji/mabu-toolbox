import { bytesToBlob } from './bytes';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type FfmpegProgress = (ratio: number, message?: string) => void;

const CORES = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
];

let ffmpegPromise: Promise<FFmpeg> | null = null;
let coreUrlUsed = '';

/** 加载 ffmpeg.wasm（单线程版，约 30MB，首次较慢） */
export async function getFFmpeg(onStatus?: (s: string) => void): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;

  ffmpegPromise = (async () => {
    const ffmpeg = new FFmpeg();
    let lastErr: unknown;
    for (const base of CORES) {
      try {
        onStatus?.('正在下载转码引擎（约 30MB，首次较慢）…');
        const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
        onStatus?.('正在初始化引擎…');
        await ffmpeg.load({ coreURL, wasmURL });
        coreUrlUsed = base;
        return ffmpeg;
      } catch (e) {
        lastErr = e;
        ffmpegPromise = null;
      }
    }
    ffmpegPromise = null;
    throw new Error(
      `无法加载 ffmpeg 引擎（${lastErr instanceof Error ? lastErr.message : '网络错误'}）。` +
        '该工具需要从 CDN 下载转码核心，请检查网络或稍后重试。',
    );
  })();

  return ffmpegPromise;
}

export async function resetFFmpeg() {
  if (ffmpegPromise) {
    const f = await ffmpegPromise.catch(() => null);
    f?.terminate();
    ffmpegPromise = null;
  }
}

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin';
}

export interface RunOptions {
  input: File;
  args: string[];
  outputName: string;
  onProgress?: FfmpegProgress;
  onStatus?: (s: string) => void;
}

/** 写文件 → 执行 → 读回结果 */
export async function runFfmpeg({ input, args, outputName, onProgress, onStatus }: RunOptions): Promise<Blob> {
  const ffmpeg = await getFFmpeg(onStatus);
  const inputName = `input.${ext(input.name)}`;

  const progressCb = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on('progress', progressCb);
  try {
    await ffmpeg.writeFile(inputName, await fetchFile(input));
    onStatus?.('正在处理…');
    const code = await ffmpeg.exec([...args, '-y', outputName]);
    if (code !== 0) throw new Error(`转码失败（退出码 ${code}），可能是文件过大或参数不被支持`);
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    // 清理临时文件，释放内存
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
    return bytesToBlob(bytes, 'application/octet-stream');
  } finally {
    ffmpeg.off('progress', progressCb);
  }
}

export function mimeFor(extName: string): string {
  const e = extName.toLowerCase();
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
  };
  return map[e] ?? 'application/octet-stream';
}
