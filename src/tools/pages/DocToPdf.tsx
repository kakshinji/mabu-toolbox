import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Dropzone, Button, Alert, Field, Segmented, ResultPanel } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { baseName } from '../../utils/file';

/** 从 docx 的 document.xml 中提取纯文本（按段落分行） */
async function extractDocxText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error('不是有效的 .docx 文件（找不到 word/document.xml）');
  const xml = await doc.async('string');
  const paragraphs: string[] = [];
  const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const matches = xml.match(pRegex) ?? [];
  for (const p of matches) {
    const texts = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) =>
      m[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    );
    paragraphs.push(texts.join(''));
  }
  return paragraphs.join('\n');
}

export default function DocToPdf() {
  const { files, add, clear } = useFiles('.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fontSize, setFontSize] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<{ name: string; blob: Blob }[]>([]);
  const [dropped, setDropped] = useState(0);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    setDropped(0);
    try {
      const text = await extractDocxText(file);
      setPreview(text.slice(0, 400));
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const [pw, ph] = pageSize === 'a4' ? [595.28, 841.89] : [612, 792];
      const margin = 56;
      const maxWidth = pw - margin * 2;
      const lineHeight = fontSize * 1.6;

      // 内置 Helvetica 使用 WinAnsi 编码，无法写入中文等字符。
      // 这里把不可编码字符替换为占位符并计数，避免整个转换直接抛错中断。
      let droppedChars = 0;
      const sanitize = (s: string): string => {
        let out = '';
        for (const ch of s) {
          try {
            font.widthOfTextAtSize(ch, fontSize);
            out += ch;
          } catch {
            droppedChars += 1;
            out += '·';
          }
        }
        return out;
      };

      // 简易折行：按字符宽度计算
      const wrap = (raw: string): string[] => {
        const s = sanitize(raw);
        const lines: string[] = [];
        let cur = '';
        for (const ch of s) {
          const test = cur + ch;
          let w = 0;
          try {
            w = font.widthOfTextAtSize(test, fontSize);
          } catch {
            w = test.length * fontSize * 0.5;
          }
          if (w > maxWidth && cur) {
            lines.push(cur);
            cur = ch;
          } else {
            cur = test;
          }
        }
        if (cur) lines.push(cur);
        return lines;
      };

      let page = doc.addPage([pw, ph]);
      let y = ph - margin;
      for (const para of text.split('\n')) {
        const isHeading = /^#{1,3}\s/.test(para);
        const clean = para.replace(/^#{1,3}\s/, '');
        const size = isHeading ? fontSize + 4 : fontSize;
        const lines = wrap(clean || ' ');
        for (const line of lines) {
          if (y < margin + lineHeight) {
            page = doc.addPage([pw, ph]);
            y = ph - margin;
          }
          page.drawText(line, {
            x: margin,
            y,
            size,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight;
        }
        y -= lineHeight * 0.3;
      }

      setDropped(droppedChars);
      const bytes = await doc.save();
      setResult([{ name: baseName(file.name) + '.pdf', blob: bytesToBlob(bytes, 'application/pdf') }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '转换失败');
    } finally {
      setBusy(false);
    }
  };

  const hasChinese = /[\u4e00-\u9fa5]/.test(preview);

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept=".docx" multiple={false} title="选择 .docx 文件" subtitle="读取文字内容并重新排版为 PDF" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{file.name}</span>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setPreview(''); setResult([]); }}>
            换文件
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Field label="页面尺寸">
          <Segmented
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'Letter' },
            ]}
          />
        </Field>
        <Field label="正文字号">
          <input type="number" min={8} max={20} className="input w-24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
        </Field>
        <Button onClick={run} disabled={busy || !file}>
          {busy ? '转换中…' : '转换为 PDF'}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {dropped > 0 && (
        <Alert tone="warn" title={`已跳过 ${dropped} 个字符`}>
          内置 PDF 字体使用 WinAnsi 编码，无法写入中文等非西文字符，这些字符在输出中被替换为「·」。
          转换本身可以完成，但中文内容会丢失；需要保真请用桌面版 LibreOffice / WPS 导出 PDF。
        </Alert>
      )}

      {hasChinese && dropped === 0 && (
        <Alert tone="warn" title="中文字体限制">
          浏览器内置 PDF 字体库不含中文字形，中文可能显示为空白。这个工具更适合纯英文文档的内容重排；
          需要保真转换中文 Word，请用桌面版 LibreOffice 或 WPS 导出 PDF。
        </Alert>
      )}

      {preview && (
        <div>
          <span className="label">提取到的文字预览</span>
          <pre className="mono max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-ink-900/[0.08] bg-paper-100 p-4 text-xs text-ink-600">
            {preview}
            {preview.length >= 400 && '…'}
          </pre>
        </div>
      )}

      {result.length > 0 && (
        <div className="rounded-xl border border-jade-200 bg-jade-50 p-4 text-sm text-jade-800">
          已生成 PDF，点击下方按钮下载。
        </div>
      )}
      <ResultPanel items={result} />
      <Note>
        这个工具做的是「提取文字 + 重新排版」，会丢失原文档的表格、图片、字体和精确版式。要保真请用桌面软件。
      </Note>
    </div>
  );
}
