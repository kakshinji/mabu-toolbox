import { PDFDocument, degrees, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { readArrayBuffer, parsePageRanges } from './file';

/** 把 pdf-lib / pdf.js 的英文错误转成用户能看懂的中文提示 */
export function describePdfError(e: unknown, action = '处理'): string {
  const raw = e instanceof Error ? e.message : String(e);
  const msg = raw.toLowerCase();
  if (/empty|0 bytes|长度为 0/.test(msg)) return '文件为空（0 字节），无法读取 PDF';
  if (/invalid pdf structure|no pdf header|not a pdf|missing pdf|cannot parse/.test(msg)) {
    return '这个文件不是有效的 PDF（可能已损坏，或只是扩展名改成了 .pdf）';
  }
  if (/password|encrypt/.test(msg)) return 'PDF 已加密，请先用「PDF 加密 / 解密」移除密码';
  if (/out of memory|allocation failed|arraybuffer/.test(msg)) {
    return '文件过大，浏览器内存不足，建议拆分后再处理';
  }
  return `${action}失败：${raw}`;
}

export async function loadPdf(file: File): Promise<PDFDocument> {
  if (file.size === 0) throw new Error('文件为空（0 字节），无法读取 PDF');
  const buf = await readArrayBuffer(file);
  // 简单校验文件头，避免把改名的文本文件当 PDF 解析
  const head = new TextDecoder('latin1').decode(new Uint8Array(buf).slice(0, 5));
  if (!head.startsWith('%PDF-')) {
    throw new Error('这个文件不是有效的 PDF（缺少 %PDF 文件头）');
  }
  return PDFDocument.load(buf, { ignoreEncryption: true });
}

/** 合并多个 PDF */
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await loadPdf(f);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  out.setProducer('抹布工具箱');
  out.setCreator('抹布工具箱');
  return out.save();
}

/**
 * 按指定策略拆分 PDF
 */
export async function splitPdf(
  file: File,
  opts: { mode: 'ranges' | 'each' | 'every'; ranges?: string; every?: number },
): Promise<{ name: string; data: Uint8Array }[]> {
  const src = await loadPdf(file);
  const total = src.getPageCount();
  const base = file.name.replace(/\.pdf$/i, '');
  const results: { name: string; data: Uint8Array }[] = [];

  const makeDoc = async (indices: number[]) => {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, indices);
    pages.forEach((p) => doc.addPage(p));
    return doc.save();
  };

  if (opts.mode === 'each') {
    for (let i = 0; i < total; i += 1) {
      results.push({ name: `${base}-第${i + 1}页.pdf`, data: await makeDoc([i]) });
    }
    return results;
  }

  if (opts.mode === 'every') {
    const n = Math.max(1, opts.every ?? 1);
    let part = 1;
    for (let i = 0; i < total; i += n) {
      const idx = Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k);
      results.push({ name: `${base}-第${part}部分.pdf`, data: await makeDoc(idx) });
      part += 1;
    }
    return results;
  }

  const chunks = (opts.ranges ?? '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  if (!chunks.length) chunks.push(`1-${total}`);
  let part = 1;
  for (const c of chunks) {
    const pages = parsePageRanges(c, total);
    if (!pages.length) continue;
    results.push({ name: `${base}-第${part}部分.pdf`, data: await makeDoc(pages.map((p) => p - 1)) });
    part += 1;
  }
  if (!results.length) {
    throw new Error(`没有有效的页码范围（本文件共 ${total} 页），请检查输入，例如 1-2,3-`);
  }
  return results;
}

/** 旋转页面：pagesInput 为空表示全部 */
export async function rotatePdf(file: File, angle: 90 | 180 | 270, pagesInput?: string): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const targets = pagesInput?.trim() ? new Set(parsePageRanges(pagesInput, total)) : null;
  if (targets && targets.size === 0) {
    throw new Error(`页码超出范围（本文件共 ${total} 页）`);
  }
  doc.getPages().forEach((p, i) => {
    if (targets && !targets.has(i + 1)) return;
    p.setRotation(degrees((p.getRotation().angle + angle) % 360));
  });
  return doc.save();
}

/** 加文字水印 */
export async function watermarkPdf(
  file: File,
  opts: { text: string; size: number; opacity: number; angle: number; color: string; tile: boolean },
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const c = hexToRgb(opts.color);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const text = opts.text || 'WATERMARK';
    const tw = font.widthOfTextAtSize(text, opts.size);
    const th = font.heightAtSize(opts.size);
    if (opts.tile) {
      const stepX = tw + opts.size * 3;
      const stepY = th + opts.size * 3;
      for (let y = 0; y < height + stepY; y += stepY) {
        for (let x = -stepX; x < width + stepX; x += stepX) {
          page.drawText(text, {
            x,
            y,
            size: opts.size,
            font,
            color: rgb(c.r, c.g, c.b),
            opacity: opts.opacity,
            rotate: degrees(opts.angle),
          });
        }
      }
    } else {
      page.drawText(text, {
        x: width / 2 - tw / 2,
        y: height / 2 - th / 2,
        size: opts.size,
        font,
        color: rgb(c.r, c.g, c.b),
        opacity: opts.opacity,
        rotate: degrees(opts.angle),
      });
    }
  }
  return doc.save();
}

/** 加页码 */
export async function addPageNumbers(
  file: File,
  opts: { format: string; start: number; size: number; position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right' },
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const label = opts.format
      .replace(/\{n\}/g, String(opts.start + i))
      .replace(/\{total\}/g, String(pages.length));
    const tw = font.widthOfTextAtSize(label, opts.size);
    const isTop = opts.position.startsWith('top');
    const isRight = opts.position.endsWith('right');
    const x = isRight ? width - tw - 36 : width / 2 - tw / 2;
    const y = isTop ? height - opts.size - 24 : 24;
    page.drawText(label, { x, y, size: opts.size, font, color: rgb(0.25, 0.25, 0.25) });
  });
  return doc.save();
}

/** 密码保护：AES-256 加密 PDF */
export async function protectPdf(
  file: File,
  opts: { userPassword: string; ownerPassword?: string; allowPrinting?: boolean; allowCopying?: boolean },
): Promise<Uint8Array> {
  if (file.size === 0) throw new Error('文件为空（0 字节），无法加密');
  const buf = await readArrayBuffer(file);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  doc.encrypt({
    userPassword: opts.userPassword,
    ownerPassword: opts.ownerPassword || opts.userPassword,
    permissions: {
      printing: opts.allowPrinting === false ? undefined : 'highResolution',
      copying: opts.allowCopying !== false,
    },
  } as any);
  return doc.save();
}

/** 解密：已知打开密码时移除密码 */
export async function decryptPdf(file: File, password: string): Promise<Uint8Array> {
  if (file.size === 0) throw new Error('文件为空（0 字节），无法解密');
  const buf = await readArrayBuffer(file);
  const doc = await PDFDocument.load(buf, { password } as any);
  if (!doc.isEncrypted) {
    throw new Error('该 PDF 没有设置打开密码，无需解密');
  }
  // 重新写出一份不带加密的新文档
  const out = await PDFDocument.create();
  const pages = await out.copyPages(doc, doc.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full || '000000', 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export { degrees, rgb, StandardFonts };
