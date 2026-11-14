/** 读取文件为 ArrayBuffer */
export function readArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

/** 读取文件为文本 */
export function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

/** 读取文件为 DataURL */
export function readDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/** 触发浏览器下载 */
export function download(blob: Blob | string, filename: string, mime = 'application/octet-stream') {
  const data = typeof blob === 'string' ? new Blob([blob], { type: mime }) : blob;
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function formatBytes(n: number, digits = 1): string {
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(digits)} ${units[i]}`;
}

export function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function baseName(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

/** 判断是否图片文件 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|avif|gif|bmp|heic|heif|tiff?|svg)$/i.test(file.name);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败，可能是浏览器不支持的格式'));
    img.src = src;
  });
}

export async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/** 把 canvas 转成 blob */
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出图片失败'))),
      type,
      quality,
    );
  });
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 兼容旧版浏览器的 copy */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** 解析逗号/空格分隔的页码范围，例如 "1-3,5,8-"；"-5" 这类无效写法会被忽略 */
export function parsePageRanges(input: string, total: number): number[] {
  const out = new Set<number>();
  const parts = input
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    // 只写了 "-5"：语义不明确（可能是想写 1-5），直接判为无效，避免误操作
    if (/^-\d+$/.test(p)) continue;
    if (p === '-' || p === '') continue;
    const m = p.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 1;
      const end = m[2] ? parseInt(m[2], 10) : total;
      for (let i = Math.max(1, start); i <= Math.min(total, end); i += 1) out.add(i);
    } else if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 1 && n <= total) out.add(n);
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

/** 安全文件名 */
export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
