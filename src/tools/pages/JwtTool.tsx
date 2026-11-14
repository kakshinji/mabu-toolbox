import { useMemo, useState } from 'react';
import { Alert, Field } from '../../components/ui';
import { Note } from '../../components/ToolBody';

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export default function JwtTool() {
  const [token, setToken] = useState('');

  const parsed = useMemo(() => {
    const parts = token.trim().split('.');
    if (parts.length < 2) return { error: token.trim() ? '不是有效的 JWT（应为三段用 . 分隔）' : '' };
    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      return { header, payload, signature: parts[2] ?? '', error: '' };
    } catch (e) {
      return { error: `解析失败：${e instanceof Error ? e.message : '格式错误'}` };
    }
  }, [token]);

  const exp = parsed.payload?.exp as number | undefined;
  const iat = parsed.payload?.iat as number | undefined;
  const now = Math.floor(Date.now() / 1000);
  const expired = exp ? exp < now : undefined;
  const fmt = (s?: number) => (s ? new Date(s * 1000).toLocaleString('zh-CN', { hour12: false }) : '—');

  return (
    <div className="space-y-5">
      <Field label="JWT Token" hint="粘贴后自动解析，不需要密钥">
        <textarea
          className="input mono h-32 resize-y break-all"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </Field>

      {parsed.error && <Alert tone="error">{parsed.error}</Alert>}

      {parsed.payload && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            {exp !== undefined && (
              <span className={`chip ${expired ? '!bg-clay-50 !text-clay-500' : '!bg-jade-50 !text-jade-700'}`}>
                {expired ? '已过期' : '未过期'}
              </span>
            )}
            {exp && <span className="chip">过期时间：{fmt(exp)}</span>}
            {iat && <span className="chip">签发时间：{fmt(iat)}</span>}
            {parsed.header?.alg && <span className="chip">算法：{parsed.header.alg}</span>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="label">Header</div>
              <pre className="mono max-h-64 overflow-auto rounded-xl bg-ink-900 p-4 text-xs leading-relaxed text-paper-100 scrollbar-thin">
                {JSON.stringify(parsed.header, null, 2)}
              </pre>
            </div>
            <div>
              <div className="label">Payload</div>
              <pre className="mono max-h-64 overflow-auto rounded-xl bg-ink-900 p-4 text-xs leading-relaxed text-paper-100 scrollbar-thin">
                {JSON.stringify(parsed.payload, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <div className="label">Signature（Base64URL）</div>
            <div className="break-all rounded-xl border border-ink-900/[0.08] bg-paper-100 p-3 font-mono text-xs text-ink-600">
              {parsed.signature || '（无）'}
            </div>
          </div>
        </>
      )}

      <Note>
        解析只读取 Token 内容，不验证签名有效性——签名验证需要服务端密钥。请勿把真实生产环境的 Token 粘贴到不可信的网站。
      </Note>
    </div>
  );
}
