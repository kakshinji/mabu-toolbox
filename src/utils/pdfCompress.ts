import { bytesToBlob } from './bytes';
import { PDFDocument } from 'pdf-lib';
import { openPdf, renderPageToCanvas } from './pdfjs';

/**
 * PDF 压缩：把每页按比例渲染为 JPEG 后重新组装为 PDF。
 * 对扫描件/图片型 PDF 效果明显；纯文字 PDF 会失去可选中的文字。
 */
export async function compressPdf(
  file: File,
  scale: number,
  quality: number,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const src = await openPdf(file);
  const out = await PDFDocument.create();
  const total = src.numPages;
  for (let i = 1; i <= total; i += 1) {
    const { canvas, width, height } = await renderPageToCanvas(src, i, scale);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const img = await out.embedJpg(bytes);
      const page = out.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    }
    canvas.width = 0;
    canvas.height = 0;
    onProgress?.(i, total);
  }
  await src.destroy();
  out.setProducer('抹布工具箱');
  const bytes = await out.save();
  return bytesToBlob(bytes, 'application/pdf');
}
