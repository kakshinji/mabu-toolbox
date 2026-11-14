import { useMemo, useState } from 'react';
import { Button, Field } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const styles = [
  { key: 'camel', label: 'camelCase' },
  { key: 'pascal', label: 'PascalCase' },
  { key: 'snake', label: 'snake_case' },
  { key: 'kebab', label: 'kebab-case' },
  { key: 'constant', label: 'CONSTANT_CASE' },
  { key: 'title', label: 'Title Case' },
  { key: 'upper', label: 'UPPER CASE' },
  { key: 'lower', label: 'lower case' },
] as const;

type Key = (typeof styles)[number]['key'];

function convert(input: string, key: Key): string {
  const w = words(input);
  if (!w.length) return '';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  switch (key) {
    case 'camel':
      return w[0].toLowerCase() + w.slice(1).map(cap).join('');
    case 'pascal':
      return w.map(cap).join('');
    case 'snake':
      return w.map((x) => x.toLowerCase()).join('_');
    case 'kebab':
      return w.map((x) => x.toLowerCase()).join('-');
    case 'constant':
      return w.map((x) => x.toUpperCase()).join('_');
    case 'title':
      return w.map(cap).join(' ');
    case 'upper':
      return w.join(' ').toUpperCase();
    case 'lower':
      return w.join(' ').toLowerCase();
  }
}

export default function CaseConvert() {
  const [input, setInput] = useState('user profile image url');
  const [copiedKey, setCopiedKey] = useState<string>();

  const results = useMemo(() => styles.map((s) => ({ ...s, value: convert(input, s.key) })), [input]);

  const copy = async (key: string, value: string) => {
    if (await copyText(value)) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(undefined), 1200);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="输入（任意命名风格都可以，会自动切词）">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="例如 user_profile_image 或 userProfileImage" />
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        {results.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => copy(r.key, r.value)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-ink-900/[0.08] bg-white px-4 py-3 text-left transition hover:border-jade-200 hover:shadow-sm"
          >
            <div className="min-w-0">
              <div className="text-xs text-ink-400">{r.label}</div>
              <div className="mono truncate text-ink-800">{r.value || '—'}</div>
            </div>
            <span className="shrink-0 text-xs text-jade-700 opacity-0 transition group-hover:opacity-100">
              {copiedKey === r.key ? '已复制 ✓' : '点击复制'}
            </span>
          </button>
        ))}
      </div>

      <Button
        variant="secondary"
        onClick={() => copy('all', results.map((r) => `${r.label}: ${r.value}`).join('\n'))}
      >
        复制全部结果
      </Button>

      <Note>写代码时把中文需求里的字段名在几种风格间转换，避免手改出错。</Note>
    </div>
  );
}
