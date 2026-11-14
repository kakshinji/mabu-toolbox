import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { protectPdf, decryptPdf, describePdfError } from '../../utils/pdf';

export default function PdfProtect() {
  const { files, add, remove, clear } = useFiles('application/pdf,.pdf');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [password, setPassword] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ blob: Blob; name: string }[]>([]);

  const file = files[0]?.file;
  const canRun = !!file && (mode === 'encrypt' ? password.length >= 4 : password.length > 0);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const data =
        mode === 'encrypt'
          ? await protectPdf(file, { userPassword: password, allowPrinting, allowCopying })
          : await decryptPdf(file, password);
      const suffix = mode === 'encrypt' ? '-加密' : '-解密';
      setResult([
        { blob: bytesToBlob(data, 'application/pdf'), name: file.name.replace(/\.pdf$/i, '') + suffix + '.pdf' },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        mode === 'decrypt'
          ? `解密失败：密码可能不正确，或该文件本身没有加密。`
          : describePdfError(e, '加密'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone onFiles={add} accept="application/pdf,.pdf" multiple={false} title="选择 PDF 文件" subtitle="设置打开密码，或移除已有密码" />
      ) : (
        <FileList files={files} onRemove={() => { clear(); setResult([]); }} />
      )}

      {file && (
        <div className="space-y-4">
          <Field label="操作">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'encrypt', label: '设置密码' },
                { value: 'decrypt', label: '移除密码' },
              ]}
            />
          </Field>
          <Field label={mode === 'encrypt' ? '打开密码（至少 4 位）' : '当前打开密码'}>
            <input
              type="password"
              className="input"
              placeholder={mode === 'encrypt' ? '设置一个密码' : '输入原密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {mode === 'encrypt' && (
            <div className="flex flex-wrap gap-5 text-sm text-ink-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={allowPrinting} onChange={(e) => setAllowPrinting(e.target.checked)} />
                允许打印
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={allowCopying} onChange={(e) => setAllowCopying(e.target.checked)} />
                允许复制文字
              </label>
            </div>
          )}
          <Button onClick={run} disabled={busy || !canRun}>
            {busy ? '处理中…' : mode === 'encrypt' ? '加密并下载' : '移除密码并下载'}
          </Button>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      <ResultPanel items={result} />
      <Note>
        加密使用 AES-256，密码只在你本地参与运算，不会发送到任何地方。请务必记住密码，忘记后无法恢复。
      </Note>
    </div>
  );
}
