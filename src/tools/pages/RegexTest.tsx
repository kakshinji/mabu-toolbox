import { useEffect, useMemo, useState } from 'react';
import { Alert, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { runRegex } from '../../utils/regexWorker';
import type { RegexResult } from '../../utils/regexWorker';

const cheatsheet = [
  { p: '\\d+', d: '一个或多个数字' },
  { p: '[a-zA-Z]+', d: '连续英文字母' },
  { p: '^\\s*$', d: '空行' },
  { p: '\\S+@\\S+\\.\\S+', d: '粗略匹配邮箱' },
  { p: '1[3-9]\\d{9}', d: '中国大陆手机号' },
  { p: '[\\u4e00-\\u9fa5]+', d: '连续中文' },
  { p: 'https?://\\S+', d: '网址' },
  { p: '(?<=@)\\w+', d: '后行断言：@ 后面的词' },
];

const EMPTY: RegexResult = { error: '', parts: [], matches: [] };

export default function RegexTest() {
  const [pattern, setPattern] = useState('\\d+');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('订单号 20241114，数量 3 件，金额 128.5 元。');
  const [replacement, setReplacement] = useState('');
  const [tab, setTab] = useState<'match' | 'replace'>('match');
  const [result, setResult] = useState<RegexResult>(EMPTY);
  const [busy, setBusy] = useState(false);

  // 正则放到 Worker 里跑：灾难性回溯只会超时，不会冻结页面
  useEffect(() => {
    let cancelled = false;
    if (!pattern) {
      setResult({ error: '请输入正则', parts: [], matches: [] });
      return;
    }
    setBusy(true);
    runRegex(pattern, flags, text, replacement, tab === 'replace' ? 'replace' : 'match')
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pattern, flags, text, replacement, tab]);

  const parts = result.parts;
  const matches = result.matches;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="正则表达式">
          <div className="flex items-center gap-2">
            <span className="text-ink-400">/</span>
            <input className="input mono" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} />
            <span className="text-ink-400">/</span>
            <input
              className="input mono w-24"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              placeholder="gim"
              spellCheck={false}
            />
          </div>
        </Field>
        <Field label="模式">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'match', label: '匹配预览' },
              { value: 'replace', label: '替换' },
            ]}
          />
        </Field>
      </div>

      <Field label="测试文本">
        <textarea className="input h-28 resize-y" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </Field>

      {result.error && <Alert tone="error">{result.error}</Alert>}

      {!result.error && (
        <>
          <div className="rounded-xl border border-ink-900/[0.08] bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-ink-400">
              <span>
                匹配到 <b className="text-ink-700">{matches.length}</b> 处
                {result.truncated && <span className="ml-1 text-[#8a6420]">（结果过多，已截断）</span>}
              </span>
              {busy && <span className="animate-pulse">计算中…</span>}
            </div>
            <div className="mono whitespace-pre-wrap break-words leading-relaxed text-ink-700">
              {parts.length === 0 && <span className="text-ink-300">没有匹配</span>}
              {parts.map((p, i) =>
                p.hit ? (
                  <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-ink-900">
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </div>
          </div>

          {matches.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-xl bg-paper-50 p-3 scrollbar-thin">
              <div className="mb-1 text-xs text-ink-400">匹配结果列表</div>
              <ol className="mono space-y-0.5 text-ink-600">
                {matches.slice(0, 100).map((m, i) => (
                  <li key={i}>
                    {i + 1}. {m || '（空）'}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tab === 'replace' && (
            <Field label="替换为（支持 $1 $2 分组引用）">
              <input className="input mono" value={replacement} onChange={(e) => setReplacement(e.target.value)} spellCheck={false} />
              <textarea className="input mono mt-2 h-28 resize-y" readOnly value={result.replaced ?? ''} />
            </Field>
          )}
        </>
      )}

      <div>
        <span className="label">速查</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {cheatsheet.map((c) => (
            <button
              key={c.p}
              type="button"
              onClick={() => setPattern(c.p)}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/[0.08] px-3 py-2 text-left transition hover:border-jade-200 hover:bg-jade-50/40"
            >
              <code className="mono text-ink-700">{c.p}</code>
              <span className="shrink-0 text-xs text-ink-400">{c.d}</span>
            </button>
          ))}
        </div>
      </div>
      <Note>
        匹配使用 JavaScript 正则语法，与 Python / Java 略有差异。正则运行在独立的 Worker 中，复杂表达式超时会自动中止，不会卡住页面。
      </Note>
    </div>
  );
}
