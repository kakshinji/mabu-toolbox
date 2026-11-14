import { bytesToBlob } from '../../utils/bytes';
import { useState } from 'react';
import { Dropzone, FileList, Button, Alert, ResultPanel } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { InfoNotes } from '../../components/InfoNote';
import { useFiles } from '../../components/useFiles';
import { mergePdfs, describePdfError } from '../../utils/pdf';
import { formatBytes } from '../../utils/file';

export default function PdfMerge() {
  const { files, add, remove, move, clear, inputProps } = useFiles('application/pdf,.pdf');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ blob: Blob; name: string }[]>([]);

  const total = files.reduce((s, f) => s + f.file.size, 0);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult([]);
    try {
      const data = await mergePdfs(files.map((f) => f.file));
      const blob = bytesToBlob(data, 'application/pdf');
      setResult([{ blob, name: '合并结果.pdf' }]);
    } catch (e) {
      setError(describePdfError(e, '合并'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone
          onFiles={add}
          accept="application/pdf,.pdf"
          title="把 PDF 拖到这里，或点击选择"
          subtitle="支持一次选择多个文件，按列表顺序合并"
          hint="文件不会上传，合并完全在你的浏览器里完成"
        />
      ) : (
        <>
          <input {...inputProps} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              共 <b className="text-ink-800">{files.length}</b> 个文件，合计 {formatBytes(total)}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => inputProps.ref.current?.click()}>
                继续添加
              </Button>
              <Button variant="ghost" className="!py-1.5 !text-xs" onClick={clear}>
                清空
              </Button>
            </div>
          </div>
          <FileList files={files} onRemove={remove} onMove={move} />
        </>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={busy || files.length < 2}>
            {busy ? '合并中…' : `合并 ${files.length} 个 PDF`}
          </Button>
          {files.length < 2 && <span className="text-xs text-ink-400">至少需要 2 个文件</span>}
        </div>
      )}

      {error && <Alert tone="error" title="出错了">{error}</Alert>}
      <ResultPanel items={result} zipName="merged.pdf" />

      <InfoNotes
        items={[
          { icon: 'list', title: '怎么调整顺序？', body: '用每行右侧的上下箭头调整，合并结果按列表从上到下排列。' },
          { icon: 'lock', title: '加密的 PDF？', body: '带打开密码的 PDF 无法直接合并，请先用「PDF 加密/解密」移除密码。' },
        ]}
      />
      <Note>提示：合并只改变页面组织方式，不会重新压缩内容，文字与矢量图保持原样。</Note>
    </div>
  );
}
