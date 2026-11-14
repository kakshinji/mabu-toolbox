import { useState } from 'react';
import { Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText, formatBytes } from '../../utils/file';
import { hashBytes, hashText } from '../../utils/hash';
import type { HashAlgo } from '../../utils/hash';

const algos: HashAlgo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export default function HashTool() {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [algo, setAlgo] = useState<HashAlgo>('SHA-256');
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File>();
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const runText = async () => {
    setError(undefined);
    try {
      setOutput(await hashText(algo, input));
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
    }
  };

  const runFile = async (f: File) => {
    setBusy(true);
    setError(undefined);
    setOutput('');
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      setOutput(await hashBytes(algo, bytes));
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
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
        <Segmented value={algo} onChange={setAlgo} options={algos.map((a) => ({ value: a, label: a }))} />
      </div>

      {mode === 'text' ? (
        <Field label="输入文本">
          <textarea className="input mono h-32 resize-y" value={input} onChange={(e) => setInput(e.target.value)} />
        </Field>
      ) : (
        <Field label="选择文件" hint="大文件会整块读入内存计算，建议不超过 500MB">
          <input
            type="file"
            className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-jade-50 file:px-3 file:py-2 file:text-sm file:text-jade-700"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                runFile(f);
              }
            }}
          />
          {file && (
            <p className="mt-2 text-xs text-ink-400">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        {mode === 'text' && (
          <Button onClick={runText} disabled={!input}>
            计算哈希
          </Button>
        )}
        {output && (
          <Button variant="secondary" onClick={copy}>
            {copied ? '已复制 ✓' : '复制结果'}
          </Button>
        )}
      </div>

      {busy && <Alert tone="info">正在计算文件哈希…</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {output && (
        <div className="rounded-xl border border-ink-900/[0.08] bg-paper-100 p-4">
          <div className="mb-1 text-xs text-ink-400">{algo} 摘要</div>
          <div className="break-all font-mono text-sm text-ink-800">{output}</div>
        </div>
      )}

      <Note>
        SHA 系列使用浏览器原生 Web Crypto 实现。MD5 已不适合安全场景，但用于校验文件完整性仍然常见。计算全在本地进行。
      </Note>
    </div>
  );
}
