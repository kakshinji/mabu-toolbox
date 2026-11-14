import { useMemo, useState } from 'react';
import { Button, Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

function toCsv(value: unknown): string {
  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      return [keys.join(','), keys.map((k) => JSON.stringify((value as any)[k] ?? '')).join(',')].join('\n');
    }
    return String(value);
  }
  const rows = value.map((row) => (Array.isArray(row) ? row : [row]));
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === 'object') return `${pad}-\n${toYaml(v, indent + 1)}`;
        return `${pad}- ${String(v)}`;
      })
      .join('\n');
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => {
      if (v && typeof v === 'object') return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      return `${pad}${k}: ${typeof v === 'string' ? JSON.stringify(v) : String(v)}`;
    })
    .join('\n');
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

function toXml(value: unknown, tag = 'root', indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) return `${pad}<${tag}>\n${value.map((v) => toXml(v, 'item', indent + 1)).join('\n')}\n${pad}</${tag}>`;
  if (value && typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => toXml(v, k.replace(/[^\w.-]/g, '_'), indent + 1))
      .join('\n');
    return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`;
  }
  return `${pad}<${tag}>${escapeXml(String(value ?? ''))}</${tag}>`;
}

export default function JsonFormat() {
  const [input, setInput] = useState('{\n  "name": "抹布工具箱",\n  "tools": 41,\n  "free": true\n}');
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2');
  const [target, setTarget] = useState<'json' | 'csv' | 'yaml' | 'xml'>('json');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    try {
      const v = JSON.parse(input);
      const count = (x: unknown): number => {
        if (Array.isArray(x)) return x.reduce<number>((s, i) => s + count(i), 1);
        if (x && typeof x === 'object') return Object.values(x as object).reduce<number>((s, i) => s + count(i), 1);
        return 1;
      };
      return { valid: true as const, nodes: count(v) };
    } catch {
      return { valid: false as const, nodes: 0 };
    }
  }, [input]);

  const format = () => {
    setError(undefined);
    try {
      const v = JSON.parse(input);
      const pad = indent === 'tab' ? '\t' : Number(indent);
      if (target === 'json') setOutput(JSON.stringify(v, null, pad));
      else if (target === 'csv') setOutput(toCsv(v));
      else if (target === 'yaml') setOutput(toYaml(v));
      else setOutput(toXml(v));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 解析失败');
      setOutput('');
    }
  };

  const minify = () => {
    setError(undefined);
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 解析失败');
    }
  };

  const escape = () => {
    setOutput(JSON.stringify(input));
  };

  const unescape = () => {
    try {
      setOutput(JSON.parse(`"${input.replace(/^"|"$/g, '').replace(/"/g, '\\"')}"`));
    } catch {
      setError('无法反转义，请检查字符串是否合法');
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
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">输入 JSON</span>
            <span className={`text-xs ${stats.valid ? 'text-jade-700' : 'text-clay-500'}`}>
              {stats.valid ? `✓ 格式正确 · ${stats.nodes} 个值` : '✕ 格式有误'}
            </span>
          </div>
          <textarea
            className="input mono h-72 resize-y"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴 JSON…"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">输出</span>
            {output && (
              <button type="button" onClick={copy} className="text-xs text-jade-700 hover:underline">
                {copied ? '已复制 ✓' : '复制'}
              </button>
            )}
          </div>
          <textarea className="input mono h-72 resize-y" spellCheck={false} readOnly value={output} placeholder="结果会显示在这里" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="缩进">
          <Segmented
            value={indent}
            onChange={setIndent}
            options={[
              { value: '2', label: '2 空格' },
              { value: '4', label: '4 空格' },
              { value: 'tab', label: 'Tab' },
            ]}
          />
        </Field>
        <Field label="输出格式">
          <Segmented
            value={target}
            onChange={setTarget}
            options={[
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
              { value: 'yaml', label: 'YAML' },
              { value: 'xml', label: 'XML' },
            ]}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={format}>格式化 / 转换</Button>
        <Button variant="secondary" onClick={minify}>
          压缩成一行
        </Button>
        <Button variant="secondary" onClick={escape}>
          转义为字符串
        </Button>
        <Button variant="secondary" onClick={unescape}>
          反转义
        </Button>
        <Button variant="ghost" onClick={() => { setInput(''); setOutput(''); setError(undefined); }}>
          清空
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Note>所有解析都在本地完成，适合处理包含敏感字段的接口返回数据。CSV 转换要求顶层是数组或对象。</Note>
    </div>
  );
}
