import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { Button, Field, Segmented } from '../../components/ui';
import { Note } from '../../components/ToolBody';
import { copyText } from '../../utils/file';

const sample = `# 标题

这是一段 **加粗** 和 *斜体* 文字，还有 \`行内代码\`。

## 列表

- 第一项
- 第二项
  - 嵌套项

## 表格

| 工具 | 用途 |
| --- | --- |
| PDF 合并 | 合成文件 |

## 代码块

\`\`\`js
console.log('hello');
\`\`\`

> 引用一段话。

[链接示例](https://example.com)
`;

function mdToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

export default function MarkdownPreview() {
  const [md, setMd] = useState(sample);
  const [view, setView] = useState<'split' | 'preview'>('split');

  const html = useMemo(() => mdToHtml(md), [md]);

  const exportHtml = () => {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Markdown 导出</title>
<style>body{max-width:760px;margin:40px auto;padding:0 20px;font-family:-apple-system,"Segoe UI","PingFang SC",sans-serif;line-height:1.75;color:#1e293b}
pre{background:#f1f5f9;padding:14px;border-radius:10px;overflow:auto}code{background:#f1f5f9;padding:2px 5px;border-radius:4px}
table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:6px 12px}blockquote{border-left:3px solid #cbd5e1;margin:0;padding-left:16px;color:#64748b}</style>
</head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'markdown.html';
    a.click();
  };

  const exportMd = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'document.md';
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'split', label: '左右分栏' },
            { value: 'preview', label: '只看预览' },
          ]}
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => copyText(md)}>
            复制 Markdown
          </Button>
          <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => copyText(html)}>
            复制 HTML
          </Button>
          <Button variant="secondary" className="!py-1.5 !text-xs" onClick={exportMd}>
            导出 .md
          </Button>
          <Button className="!py-1.5 !text-xs" onClick={exportHtml}>
            导出 HTML
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${view === 'split' ? 'lg:grid-cols-2' : ''}`}>
        {view === 'split' && (
          <Field label="Markdown">
            <textarea className="input mono h-[32rem] resize-y" spellCheck={false} value={md} onChange={(e) => setMd(e.target.value)} />
          </Field>
        )}
        <div>
          <span className="label">预览</span>
          <div
            className="prose-tool h-[32rem] overflow-auto rounded-xl border border-ink-900/[0.08] bg-white p-6 scrollbar-thin"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <Note>
        预览使用本地渲染，图片外链会在预览时加载。导出 HTML 是自包含的静态文件，可直接发布。
      </Note>
    </div>
  );
}
