import { useMemo, useState } from 'react';
import { Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

export default function UrlCodec() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [component, setComponent] = useState<'component' | 'uri'>('component');
  const [input, setInput] = useState('https://example.com/search?q=抹布工具箱&page=1');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    try {
      if (mode === 'encode') {
        return component === 'component' ? encodeURIComponent(input) : encodeURI(input);
      }
      return component === 'component' ? decodeURIComponent(input) : decodeURI(input);
    } catch {
      return '';
    }
  }, [input, mode, component]);

  const params = useMemo(() => {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://placeholder.local?${input.replace(/^\?/, '')}`);
      return Array.from(url.searchParams.entries());
    } catch {
      return [];
    }
  }, [input]);

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
            { value: 'encode', label: '编码' },
            { value: 'decode', label: '解码' },
          ]}
        />
        <Segmented
          value={component}
          onChange={setComponent}
          options={[
            { value: 'component', label: 'encodeURIComponent（推荐）' },
            { value: 'uri', label: 'encodeURI' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="输入">
          <textarea className="input mono h-48 resize-y" value={input} onChange={(e) => setInput(e.target.value)} />
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
          <textarea className="input mono h-48 resize-y" readOnly value={output} />
        </div>
      </div>

      {params.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ink-900/[0.08]">
          <div className="border-b border-ink-900/[0.06] bg-paper-100 px-4 py-2 text-xs font-medium text-ink-600">
            查询参数解析（{params.length} 个）
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ink-900/[0.06]">
              {params.map(([k, v], i) => (
                <tr key={`${k}-${i}`}>
                  <td className="w-1/3 px-4 py-2 font-mono text-xs text-ink-500">{k}</td>
                  <td className="break-all px-4 py-2 text-ink-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!output && <Alert tone="warn">输入可能包含非法的百分号编码（例如单独的 %），无法解码。</Alert>}
      <Note>拼接口令、处理带中文的链接参数时用 encodeURIComponent 更安全。</Note>
    </div>
  );
}
