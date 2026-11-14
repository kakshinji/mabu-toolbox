import { useState } from 'react';
import { Dropzone, Button, Alert, Field, Segmented, Progress } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { extractPdfText } from '../../utils/pdfjs';
import { describePdfError } from '../../utils/pdf';
import { baseName, copyText } from '../../utils/file';

export default function PdfToText() {
  const { files, add, clear } = useFiles('application/pdf,.pdf');
  const [mode, setMode] = useState<'joined' | 'pages'>('joined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setOutput('');
    try {
      const pages = await extractPdfText(file);
      const text =
        mode === 'joined'
          ? pages.map((p) => p.text).join('\n\n')
          : pages.map((p) => `===== 第 ${p.pageNumber} 页 =====\n${p.text}`).join('\n\n');
      if (!text.replace(/=/g, '').trim()) {
        setError('这份 PDF 没有可提取的文字，可能是扫描件。请改用「图片文字识别 OCR」。');
      }
      setOutput(text);
    } catch (e) {
      setError(describePdfError(e, '提取文字'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (await copyText(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${file ? baseName(file.name) : 'pdf'}.txt`;
    a.click();
  };

  const chars = output.length;

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="提取其中的文字，导出为 TXT" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{file.name}</span>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setOutput(''); }}>
            换文件
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Field label="输出方式">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'joined', label: '连续文本' },
              { value: 'pages', label: '按页分隔' },
            ]}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={busy || !file}>
            {busy ? '提取中…' : '提取文字'}
          </Button>
          {output && (
            <>
              <Button variant="secondary" onClick={copy}>
                {copied ? '已复制 ✓' : '复制'}
              </Button>
              <Button variant="secondary" onClick={download}>
                下载 TXT
              </Button>
            </>
          )}
        </div>
        {busy && <Progress value={60} text="正在解析页面…" />}
      </div>

      {error && <Alert tone="warn">{error}</Alert>}

      {output && (
        <>
          <Field label={`提取结果（${chars.toLocaleString()} 字符）`}>
            <textarea className="input mono h-80 resize-y leading-relaxed" readOnly value={output} />
          </Field>
          <Note>提取的是 PDF 内嵌文本层，扫描图片型 PDF 需要先做 OCR。</Note>
        </>
      )}
    </div>
  );
}
