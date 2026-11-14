/**
 * 正则匹配 Worker：在主线程之外执行，避免灾难性回溯把页面卡死。
 * 主线程侧负责超时；超时后直接 terminate 掉 worker。
 */

export interface RegexPart {
  text: string;
  hit: boolean;
  index: number;
}

export interface RegexResult {
  error: string;
  parts: RegexPart[];
  matches: string[];
  truncated?: boolean;
  replaced?: string;
}

const WORKER_SOURCE = `
self.onmessage = (e) => {
  const { pattern, flags, text, replacement, mode } = e.data;
  const out = { error: '', parts: [], matches: [], replaced: undefined, truncated: false };
  let re;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (err) {
    out.error = err && err.message ? err.message : '正则无效';
    self.postMessage(out);
    return;
  }

  const parts = [];
  const matches = [];
  let last = 0;
  let guard = 0;
  try {
    let m;
    while ((m = re.exec(text)) !== null) {
      guard += 1;
      if (guard > 2000) { out.truncated = true; break; }
      if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false, index: last });
      parts.push({ text: m[0] || '（空匹配）', hit: true, index: m.index });
      matches.push(m[0]);
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex += 1;
    }
    if (last < text.length) parts.push({ text: text.slice(last), hit: false, index: last });
    out.parts = parts;
    out.matches = matches;
    if (mode === 'replace') {
      out.replaced = text.replace(new RegExp(pattern, flags), replacement);
    }
  } catch (err) {
    out.error = err && err.message ? err.message : '匹配失败';
  }
  self.postMessage(out);
};
`;

let worker: Worker | null = null;
let seq = 0;

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
  }
  return worker;
}

/** 带超时的正则执行；超时返回错误而不是卡死 */
export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
  mode: 'match' | 'replace',
  timeoutMs = 1500,
): Promise<RegexResult> {
  return new Promise((resolve) => {
    const w = getWorker();
    const id = ++seq;
    let done = false;

    const onMessage = (e: MessageEvent) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve(e.data as RegexResult);
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      w.removeEventListener('message', onMessage);
      // 这条正则太危险，直接丢弃 worker，下次重建
      w.terminate();
      worker = null;
      resolve({
        error: '表达式过于复杂或存在灾难性回溯，已中止计算。请简化正则，或缩小测试文本。',
        parts: [],
        matches: [],
      });
    }, timeoutMs);

    w.addEventListener('message', onMessage);
    w.postMessage({ id, pattern, flags, text, replacement, mode });
  });
}
