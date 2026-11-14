import { canvasToBlob, loadImage } from './file';
import { decodeHeic, isHeic } from './heic';

export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'ico';

/** 单张图片的最大像素数，超过则拒绝，避免浏览器内存耗尽 */
export const MAX_PIXELS = 80_000_000; // 8000 万像素

export const formatMime = (f: OutputFormat): string => {
  switch (f) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'image/png';
  }
};

export interface BitmapResult {
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
}

/** 统一把任意图片文件转成可绘制的位图，带完整性校验 */
export async function toBitmap(file: File): Promise<BitmapResult> {
  if (file.size === 0) throw new Error('文件为空（0 字节），无法读取图片');

  if (isHeic(file)) {
    const bmp = await decodeHeic(file);
    validateSize(bmp.width, bmp.height);
    return { bitmap: bmp, width: bmp.width, height: bmp.height };
  }

  // 优先用 createImageBitmap（支持 EXIF 方向）
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    validateSize(bmp.width, bmp.height);
    return { bitmap: bmp, width: bmp.width, height: bmp.height };
  } catch {
    // 回退到 <img> 解码（部分格式 createImageBitmap 不支持）
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      if (!img.naturalWidth || !img.naturalHeight) {
        throw new Error('图片数据损坏或格式不受支持，无法解码');
      }
      validateSize(img.naturalWidth, img.naturalHeight);
      return { bitmap: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }
}

function validateSize(w: number, h: number) {
  if (!w || !h) throw new Error('图片尺寸无效（宽或高为 0），文件可能已损坏');
  if (w * h > MAX_PIXELS) {
    throw new Error(
      `图片尺寸过大（${w}×${h}，约 ${Math.round((w * h) / 1_000_000)} 百万像素），超出浏览器处理上限，请先缩小后再试`,
    );
  }
}

export function drawToCanvas(
  bitmap: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法创建 Canvas，请换用 Chrome / Edge');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 格式转换（含 ICO 多尺寸打包） */
export async function convertImage(
  file: File,
  format: OutputFormat,
  quality: number,
  maxSize?: number,
): Promise<Blob> {
  if (format === 'ico') return toIco(file);
  const { bitmap, width, height } = await toBitmap(file);
  let w = width;
  let h = height;
  if (maxSize && Math.max(w, h) > maxSize) {
    const ratio = maxSize / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  // 转 JPEG 时透明区域必须补白底，否则会出现黑底
  const background = format === 'jpeg' ? '#ffffff' : undefined;
  const canvas = drawToCanvas(bitmap, w, h, background);
  if ('close' in bitmap) (bitmap as ImageBitmap).close();

  if (format === 'bmp') return canvasToBlob(canvas, 'image/bmp');

  const blob = await canvasToBlob(canvas, formatMime(format), quality / 100);
  // 某些浏览器不支持 avif 编码时会静默回退 png，做一次类型校验
  if (format === 'avif' && blob.type !== 'image/avif') {
    throw new Error('当前浏览器不支持导出 AVIF，请换用 Chrome/Edge 最新版，或改选 WebP');
  }
  return blob;
}

/** ICO：把图片缩放到多个尺寸并打包成 .ico */
export async function toIco(file: File, sizes = [16, 32, 48, 64, 128, 256]): Promise<Blob> {
  const { bitmap, width, height } = await toBitmap(file);
  const square = Math.min(width, height);
  const pngs: { size: number; data: Uint8Array }[] = [];
  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const sx = (width - square) / 2;
    const sy = (height - square) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap as CanvasImageSource, sx, sy, square, square, 0, 0, size, size);
    const blob = await canvasToBlob(canvas, 'image/png');
    pngs.push({ size, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  if ('close' in bitmap) (bitmap as ImageBitmap).close();
  if (!pngs.length) throw new Error('生成 ICO 失败');
  return buildIco(pngs);
}

function buildIco(images: { size: number; data: Uint8Array }[]): Blob {
  const count = images.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const total = headerSize + images.reduce((s, i) => s + i.data.length, 0);
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);
  images.forEach((img, i) => {
    const p = 6 + i * 16;
    bytes[p] = img.size >= 256 ? 0 : img.size;
    bytes[p + 1] = img.size >= 256 ? 0 : img.size;
    bytes[p + 2] = 0;
    bytes[p + 3] = 0;
    view.setUint16(p + 4, 1, true);
    view.setUint16(p + 6, 32, true);
    view.setUint32(p + 8, img.data.length, true);
    view.setUint32(p + 12, offset, true);
    bytes.set(img.data, offset);
    offset += img.data.length;
  });
  return new Blob([buffer], { type: 'image/x-icon' });
}

/** 压缩：按质量与最大边 */
export async function compressImage(
  file: File,
  opts: { quality: number; maxSize?: number; format?: 'jpeg' | 'webp' | 'keep' },
): Promise<Blob> {
  const { bitmap, width, height } = await toBitmap(file);
  let w = width;
  let h = height;
  if (opts.maxSize && Math.max(w, h) > opts.maxSize) {
    const ratio = opts.maxSize / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = drawToCanvas(bitmap, w, h, '#ffffff');
  if ('close' in bitmap) (bitmap as ImageBitmap).close();
  const fmt = opts.format ?? 'jpeg';
  const mime = fmt === 'keep' ? (file.type === 'image/png' ? 'image/png' : 'image/jpeg') : formatMime(fmt);
  return canvasToBlob(canvas, mime, opts.quality / 100);
}

/** 缩放 */
export async function resizeImage(
  file: File,
  opts: { mode: 'width' | 'height' | 'longest' | 'percent'; value: number; keepRatio: boolean; format?: OutputFormat; quality?: number },
): Promise<Blob> {
  const { bitmap, width, height } = await toBitmap(file);
  let w = width;
  let h = height;
  if (opts.mode === 'width') {
    w = opts.value;
    h = opts.keepRatio ? Math.round((height / width) * w) : height;
  } else if (opts.mode === 'height') {
    h = opts.value;
    w = opts.keepRatio ? Math.round((width / height) * h) : width;
  } else if (opts.mode === 'longest') {
    const ratio = opts.value / Math.max(width, height);
    w = Math.round(width * ratio);
    h = Math.round(height * ratio);
  } else {
    const ratio = opts.value / 100;
    w = Math.round(width * ratio);
    h = Math.round(height * ratio);
  }
  if (w < 1 || h < 1) throw new Error('缩放后的尺寸小于 1 像素，请调整目标值');
  const canvas = drawToCanvas(bitmap, w, h, '#ffffff');
  if ('close' in bitmap) (bitmap as ImageBitmap).close();
  const fmt = opts.format ?? 'jpeg';
  return canvasToBlob(canvas, formatMime(fmt), (opts.quality ?? 90) / 100);
}

/** 文字水印 */
export async function watermarkImage(
  file: File,
  opts: {
    text: string;
    position: 'center' | 'tile' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    size: number;
    opacity: number;
    color: string;
    rotate: number;
    quality?: number;
    format?: OutputFormat;
  },
): Promise<Blob> {
  const { bitmap, width, height } = await toBitmap(file);
  const canvas = drawToCanvas(bitmap, width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.globalAlpha = opts.opacity;
  ctx.fillStyle = opts.color;
  ctx.font = `${opts.size}px -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(opts.text).width;

  const paint = (x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((opts.rotate * Math.PI) / 180);
    ctx.fillText(opts.text, 0, 0);
    ctx.restore();
  };

  if (opts.position === 'tile') {
    const stepX = tw + opts.size * 3;
    const stepY = opts.size * 4;
    for (let y = 0; y < height + stepY; y += stepY) {
      for (let x = -stepX; x < width + stepX; x += stepX) paint(x, y);
    }
  } else {
    const pad = opts.size;
    let x = width / 2 - tw / 2;
    let y = height / 2;
    if (opts.position.includes('left')) x = pad;
    if (opts.position.includes('right')) x = width - tw - pad;
    if (opts.position.includes('bottom')) y = height - pad;
    if (opts.position.includes('top')) y = pad;
    paint(x, y);
  }
  if ('close' in bitmap) (bitmap as ImageBitmap).close();
  const fmt = opts.format ?? 'png';
  return canvasToBlob(canvas, formatMime(fmt), (opts.quality ?? 92) / 100);
}

/** 纯色背景去底 */
export async function removeSolidBackground(
  file: File,
  opts: { color: string; tolerance: number },
): Promise<Blob> {
  const { bitmap, width, height } = await toBitmap(file);
  const canvas = drawToCanvas(bitmap, width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const data = ctx.getImageData(0, 0, width, height);
  const px = data.data;
  const t = opts.color.replace('#', '');
  const tr = parseInt(t.slice(0, 2), 16);
  const tg = parseInt(t.slice(2, 4), 16);
  const tb = parseInt(t.slice(4, 6), 16);
  const tol = (opts.tolerance / 100) * 441.67;
  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - tr;
    const dg = px[i + 1] - tg;
    const db = px[i + 2] - tb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tol) px[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  if ('close' in bitmap) (bitmap as ImageBitmap).close();
  return canvasToBlob(canvas, 'image/png');
}

/** 长图拼接 */
export async function collageImages(
  files: File[],
  opts: { direction: 'vertical' | 'horizontal'; gap: number; background: string; maxWidth?: number; quality?: number },
): Promise<Blob> {
  const items: { bitmap: ImageBitmap | HTMLImageElement; width: number; height: number }[] = [];
  for (const f of files) items.push(await toBitmap(f));
  if (!items.length) throw new Error('没有可拼接的图片');

  if (opts.direction === 'vertical') {
    const target = opts.maxWidth ?? Math.max(...items.map((i) => i.width));
    const scaled = items.map((it) => ({
      canvas: drawToCanvas(it.bitmap, target, Math.round((it.height / it.width) * target)),
    }));
    const totalH = scaled.reduce((s, c) => s + c.canvas.height, 0) + opts.gap * (scaled.length - 1);
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let y = 0;
    for (const s of scaled) {
      ctx.drawImage(s.canvas, 0, y);
      y += s.canvas.height + opts.gap;
    }
    items.forEach((it) => 'close' in it.bitmap && (it.bitmap as ImageBitmap).close());
    return canvasToBlob(canvas, 'image/jpeg', (opts.quality ?? 90) / 100);
  }

  const target = Math.max(...items.map((i) => i.height));
  const scaled = items.map((it) => ({
    canvas: drawToCanvas(it.bitmap, Math.round((it.width / it.height) * target), target),
  }));
  const totalW = scaled.reduce((s, c) => s + c.canvas.width, 0) + opts.gap * (scaled.length - 1);
  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let x = 0;
  for (const s of scaled) {
    ctx.drawImage(s.canvas, x, 0);
    x += s.canvas.width + opts.gap;
  }
  items.forEach((it) => 'close' in it.bitmap && (it.bitmap as ImageBitmap).close());
  return canvasToBlob(canvas, 'image/jpeg', (opts.quality ?? 90) / 100);
}
