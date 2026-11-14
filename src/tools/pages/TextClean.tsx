import { useMemo, useState } from 'react';
import { Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

type Op = 'trim' | 'emptyLines' | 'dedupe' | 'sort' | 'lineNo' | 'removeSpaces' | 'chinesePunct';

export default function TextClean() {
  const [input, setInput] = useState('');
  const [ops, setOps] = useState<Op[]>(['trim', 'emptyLines']);
  const [sortMode, setSortMode] = useState<'asc' | 'desc'>('asc');

  const output = useMemo(() => {
    let lines = input.split(/\r?\n/);
    if (ops.includes('trim')) lines = lines.map((l) => l.trim());
    if (ops.includes('removeSpaces')) lines = lines.map((l) => l.replace(/\s+/g, ' ').trim());
    if (ops.includes('emptyLines')) lines = lines.filter((l) => l.trim() !== '');
    if (ops.includes('dedupe')) {
      const seen = new Set<string>();
      lines = lines.filter((l) => {
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
      });
    }
    if (ops.includes('sort')) lines.sort((a, b) => (sortMode === 'asc' ? a.localeCompare(b, 'zh') : b.localeCompare(a, 'zh')));
    if (ops.includes('lineNo')) lines = lines.map((l, i) => `${i + 1}. ${l}`);
    if (ops.includes('chinesePunct')) {
      lines = lines.map((l) => l.replace(/，/g, ',').replace(/。/g, '.').replace(/；/g, ';').replace(/：/g, ':'));
    }
    return lines.join('\n');
  }, [input, ops, sortMode]);

  const toggle = (op: Op) => setOps((prev) => (prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]));

  const stats = useMemo(() => {
    const chars = input.length;
    const noSpace = input.replace(/\s/g, '').length;
    const lines = input ? input.split(/\r?\n/).length : 0;
    const cn = (input.match(/[\u4e00-\u9fa5]/g) ?? []).length;
    return { chars, noSpace, lines, cn };
  }, [input]);

  const copy = async () => {
    await copyText(output);
  };

  const opList: { key: Op; label: string }[] = [
    { key: 'trim', label: '去掉每行首尾空格' },
    { key: 'emptyLines', label: '删除空行' },
    { key: 'dedupe', label: '删除重复行' },
    { key: 'sort', label: '按字母排序' },
    { key: 'lineNo', label: '添加行号' },
    { key: 'removeSpaces', label: '合并多余空格' },
    { key: 'chinesePunct', label: '中文标点转英文' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="原始文本">
          <textarea className="input mono h-64 resize-y" value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴要处理的文本…" />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">处理结果</span>
            {output && (
              <button type="button" onClick={copy} className="text-xs text-jade-700 hover:underline">
                复制
              </button>
            )}
          </div>
          <textarea className="input mono h-64 resize-y" readOnly value={output} />
        </div>
      </div>

      <div>
        <span className="label">处理动作</span>
        <div className="flex flex-wrap gap-2">
          {opList.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className={`chip !px-3 !py-1.5 transition ${
                ops.includes(o.key) ? '!bg-jade-600 !text-white' : 'hover:!bg-paper-300'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {ops.includes('sort') && (
          <div className="mt-3">
            <Segmented
              value={sortMode}
              onChange={setSortMode}
              options={[
                { value: 'asc', label: '升序 A→Z' },
                { value: 'desc', label: '降序 Z→A' },
              ]}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-ink-500">
        <span>字符：{stats.chars}</span>
        <span>不含空白：{stats.noSpace}</span>
        <span>行数：{stats.lines}</span>
        <span>汉字：{stats.cn}</span>
        <span className="text-ink-400">处理后：{output.length} 字符</span>
      </div>

      {!input && <Alert tone="info">输入文本后，结果会实时显示在右侧。</Alert>}
      <Note>处理在本地完成，文本不会上传。做名单整理、去重、格式统一时很方便。</Note>
    </div>
  );
}
