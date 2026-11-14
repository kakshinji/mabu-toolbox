import { useState } from 'react';
import { Dropzone, Button, Alert, Field, Segmented, Progress } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { recognize } from '../../utils/ocr';
import type { OcrLang } from '../../utils/ocr';
import { formatBytes, copyText } from '../../utils/file';
import { FileThumb } from '../../components/FileThumb';

export default function Ocr() {
  const [file, setFile] = useState<File>();
  const [lang, setLang] = useState<OcrLang>('chi_sim+eng');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ p: number; status: string }>();
  const [confidence, setConfidence] = useState<number>();
  const [copied, setCopied] = useState(false);

  const run = async (f = file) => {
    if (!f) return;
    setBusy(true);
    setError(undefined);
    setText('');
    setConfidence(undefined);
    setProgress({ p: 0, status: '准备中' });
    try {
      const res = await recognize(f, lang, (p, status) => setProgress({ p: p * 100, status }));
      setText(res.data.text.trim());
      setConfidence(Math.round(res.data.confidence));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        `识别失败：${msg}。如果是网络问题，请确认能访问 cdn.jsdelivr.net（语言模型从这里下载），或稍后重试。`,
      );
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone
          onFiles={(list) => {
            const f = Array.from(list)[0];
            if (f) {
              setFile(f);
              run(f);
            }
          }}
          accept="image/*"
          multiple={false}
          title="选择要识别的图片"
          subtitle="支持 JPG / PNG / WebP / BMP，中英文混排"
          hint="首次使用需下载约 15MB 语言模型"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <FileThumb file={file} size={56} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-ink-700">{file.name}</div>
            <div className="text-xs text-ink-400">{formatBytes(file.size)}</div>
          </div>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { setFile(undefined); setText(''); }}>
            换一张
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Field label="识别语言" hint="中英混排选第一个；语言模型会分别下载">
          <Segmented
            value={lang}
            onChange={(v) => setLang(v)}
            options={[
              { value: 'chi_sim+eng', label: '中文 + 英文' },
              { value: 'chi_sim', label: '仅中文' },
              { value: 'eng', label: '仅英文' },
            ]}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => run()} disabled={busy || !file}>
            {busy ? '识别中…' : '开始识别'}
          </Button>
          {text && (
            <>
              <Button variant="secondary" onClick={copy}>
                {copied ? '已复制 ✓' : '复制文字'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'ocr-result.txt';
                  a.click();
                }}
              >
                下载 TXT
              </Button>
            </>
          )}
          {confidence !== undefined && <span className="text-xs text-ink-400">置信度 {confidence}%</span>}
        </div>
        {progress && <Progress value={progress.p} text={progress.status} />}
      </div>

      {error && <Alert tone="error" title="识别失败">{error}</Alert>}

      {text && (
        <Field label="识别结果">
          <textarea
            className="input h-64 resize-y leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
      )}

      <Note>
        OCR 采用 Tesseract 引擎，印刷体效果较好，手写体准确率有限。识别全程在本地进行，图片不会上传。
      </Note>
    </div>
  );
}
