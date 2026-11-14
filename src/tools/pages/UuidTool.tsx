import { useState } from 'react';
import { Button, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

function uuidv4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUID v7：时间有序，适合做数据库主键 */
function uuidv7(): string {
  const ms = BigInt(Date.now());
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const bytes = new Uint8Array(16);
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  bytes.set(rand.subarray(0, 10), 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function shortId(len = 10): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

export default function UuidTool() {
  const [version, setVersion] = useState<'v4' | 'v7' | 'short' | 'nano'>('v4');
  const [count, setCount] = useState(10);
  const [dash, setDash] = useState(true);
  const [upper, setUpper] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const gen = (n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i += 1) {
      let id: string;
      if (version === 'v4') id = uuidv4();
      else if (version === 'v7') id = uuidv7();
      else if (version === 'short') id = shortId(12);
      else id = crypto.randomUUID().replace(/-/g, '');
      if (!dash) id = id.replace(/-/g, '');
      if (upper) id = id.toUpperCase();
      out.push(id);
    }
    setList(out);
  };

  const copyAll = async () => {
    if (await copyText(list.join('\n'))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="类型">
          <Segmented
            value={version}
            onChange={setVersion}
            options={[
              { value: 'v4', label: 'UUID v4' },
              { value: 'v7', label: 'UUID v7' },
              { value: 'short', label: '短 ID' },
              { value: 'nano', label: '无横线 32 位' },
            ]}
          />
        </Field>
        <Field label="数量">
          <input type="number" min={1} max={500} className="input w-24" value={count} onChange={(e) => setCount(Math.min(500, Math.max(1, Number(e.target.value))))} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-5 text-sm text-ink-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={dash} onChange={(e) => setDash(e.target.checked)} />
          保留中划线
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-jade-600" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
          转大写
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => gen(count)}>生成 {count} 个</Button>
        {list.length > 0 && (
          <>
            <Button variant="secondary" onClick={copyAll}>
              {copied ? '已复制 ✓' : '复制全部'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob([list.join('\n')], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'uuids.txt';
                a.click();
              }}
            >
              下载 TXT
            </Button>
            <Button variant="ghost" onClick={() => setList([])}>
              清空
            </Button>
          </>
        )}
      </div>

      {list.length > 0 && (
        <pre className="mono max-h-96 overflow-auto rounded-xl border border-ink-900/[0.08] bg-paper-100 p-4 text-xs leading-relaxed text-ink-700 scrollbar-thin">
          {list.join('\n')}
        </pre>
      )}

      <Note>
        v4 完全随机；v7 带时间戳前缀，按生成顺序有序，适合做数据库主键。生成使用加密安全的随机源。
      </Note>
    </div>
  );
}
