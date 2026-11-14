import { useState } from 'react';
import { Dropzone, Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { readDataURL, formatBytes } from '../../utils/file';
import { copyText } from '../../utils/file';

export default function ImageBase64() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [mode, setMode] = useState<'datauri' | 'raw'>('datauri');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const file = files[0]?.file;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setOutput('');
    try {
      const dataUrl = await readDataURL(file);
      if (mode === 'datauri') {
        setOutput(dataUrl);
      } else {
        setOutput(dataUrl.split(',')[1] ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (await copyText(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="image/*" multiple={false} title="选择图片" subtitle="转成 Base64 字符串" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-700">
            {file.name} · {formatBytes(file.size)}
          </span>
          <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => { clear(); setOutput(''); }}>
            换一张
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <Field label="输出形式">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'datauri', label: 'Data URI（带前缀）' },
              { value: 'raw', label: '纯 Base64' },
            ]}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={busy || !file}>
            {busy ? '转换中…' : '生成 Base64'}
          </Button>
          {output && (
            <Button variant="secondary" onClick={copy}>
              {copied ? '已复制 ✓' : '复制结果'}
            </Button>
          )}
        </div>
        {output && (
          <textarea
            className="input mono h-48 resize-y"
            readOnly
            value={output}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        {output && <p className="text-xs text-ink-400">长度 {output.length.toLocaleString()} 字符</p>}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Note>Base64 会让体积增加约 33%，只适合小图标，大图建议直接用文件引用。</Note>
    </div>
  );
}
