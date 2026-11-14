import { bytesToBlob } from '../../utils/bytes';
import { useMemo, useState } from 'react';
import { Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText, readArrayBuffer, formatBytes } from '../../utils/file';

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeAsText(b64: string): string | null {
  try {
    const bytes = fromBase64(b64);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // 简单判断是否可打印
    const printable = [...text].every((c) => c === '\n' || c === '\r' || c === '\t' || c.charCodeAt(0) >= 32);
    return printable ? text : null;
  } catch {
    return null;
  }
}

export default function Base64Tool() {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('你好，抹布工具箱');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; blob?: Blob }>();

  const result = useMemo(() => {
    try {
      if (direction === 'encode') {
        return toBase64(new TextEncoder().encode(input));
      }
      const clean = input.trim().replace(/^data:[^,]+,/, '').replace(/\s/g, '');
      const text = decodeAsText(clean);
      return text ?? '（解码成功，但内容不是文本，可切换「文件」模式保存为文件）';
    } catch {
      return '';
    }
  }, [input, direction]);

  const run = () => {
    setError(undefined);
    if (direction === 'decode' && !input.trim()) {
      setError('请先粘贴要解码的 Base64');
      return;
    }
    setOutput(result);
  };

  const downloadDecoded = async () => {
    try {
      const clean = input.trim().replace(/^data:[^,]+,/, '').replace(/\s/g, '');
      const bytes = fromBase64(clean);
      const blob = bytesToBlob(bytes, 'application/octet-stream');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'decoded.bin';
      a.click();
    } catch {
      setError('解码失败：不是有效的 Base64');
    }
  };

  const onFile = async (f: File) => {
    setError(undefined);
    try {
      const buf = await readArrayBuffer(f);
      const b64 = toBase64(new Uint8Array(buf));
      setFileInfo({ name: f.name, size: f.size, blob: f });
      setOutput(b64);
    } catch {
      setError('读取文件失败');
    }
  };

  const copy = async () => {
    if (await copyText(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'base64.txt';
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'text', label: '文本' },
            { value: 'file', label: '文件' },
          ]}
        />
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'encode', label: '编码 → Base64' },
            { value: 'decode', label: 'Base64 → 原文' },
          ]}
        />
      </div>

      {mode === 'text' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="输入">
            <textarea className="input mono h-56 resize-y" value={input} onChange={(e) => setInput(e.target.value)} />
          </Field>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label !mb-0">结果</span>
              {output && (
                <button type="button" onClick={copy} className="text-xs text-jade-700 hover:underline">
                  {copied ? '已复制 ✓' : '复制'}
                </button>
              )}
            </div>
            <textarea className="input mono h-56 resize-y" readOnly value={output} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="选择文件（自动编码为 Base64）">
            <input
              type="file"
              className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-jade-50 file:px-3 file:py-2 file:text-sm file:text-jade-700"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </Field>
          {fileInfo && (
            <p className="text-sm text-ink-500">
              {fileInfo.name} · {formatBytes(fileInfo.size)}
            </p>
          )}
          {output && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label !mb-0">Base64 结果（{output.length.toLocaleString()} 字符）</span>
                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={copy} className="text-jade-700 hover:underline">
                    {copied ? '已复制 ✓' : '复制'}
                  </button>
                  <button type="button" onClick={downloadOutput} className="text-jade-700 hover:underline">
                    下载 .txt
                  </button>
                </div>
              </div>
              <textarea className="input mono h-48 resize-y" readOnly value={output} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {mode === 'text' && <Button onClick={run}>转换</Button>}
        {mode === 'text' && direction === 'decode' && (
          <Button variant="secondary" onClick={downloadDecoded}>
            解码为文件下载
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setInput('');
            setOutput('');
            setFileInfo(undefined);
            setError(undefined);
          }}
        >
          清空
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Note>Base64 是编码不是加密，任何人都能还原，不要用它保存密码等敏感信息。</Note>
    </div>
  );
}
