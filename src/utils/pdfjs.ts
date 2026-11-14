import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPageImage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

export async function openPdf(file: File | ArrayBuffer, password?: string) {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const doc = await pdfjsLib.getDocument({
    data,
    password,
    // 关掉不必要的字体/图像资源以加速，仅用于渲染与取文本
    isEvalSupported: false,
  }).promise;
  return doc;
}

/** 渲染指定页为 canvas */
export async function renderPageToCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('无法创建画布');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, width: canvas.width, height: canvas.height };
}

export async function pdfToImages(
  file: File,
  opts: { scale: number; format: 'png' | 'jpeg'; quality: number; pages?: string },
  onProgress?: (done: number, total: number) => void,
): Promise<PdfPageImage[]> {
  const doc = await openPdf(file);
  const total = doc.numPages;
  const out: PdfPageImage[] = [];
  for (let i = 1; i <= total; i += 1) {
    const { canvas } = await renderPageToCanvas(doc, i, opts.scale);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, `image/${opts.format}`, opts.format === 'jpeg' ? opts.quality : undefined),
    );
    if (blob) out.push({ pageNumber: i, blob, width: canvas.width, height: canvas.height });
    canvas.width = 0;
    canvas.height = 0;
    onProgress?.(i, total);
  }
  await doc.destroy();
  return out;
}

export interface PdfTextPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfText(file: File): Promise<PdfTextPage[]> {
  const doc = await openPdf(file);
  const pages: PdfTextPage[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    pages.push({ pageNumber: i, text });
  }
  await doc.destroy();
  return pages;
}

/** 用于预览第一页缩略图 */
export async function renderThumbnail(file: File, maxWidth = 220): Promise<string> {
  const doc = await openPdf(file);
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL('image/jpeg', 0.7);
  await doc.destroy();
  return url;
}
