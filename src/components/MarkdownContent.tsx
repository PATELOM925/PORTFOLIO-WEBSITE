import { marked, Renderer, Tokens } from "marked";
import { memo } from "react";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    // Wide tables scroll inside their own box, so the page never scrolls sideways.
    table(this: Renderer, token: Tokens.Table) {
      return `<div class="table-scroll" role="region" aria-label="Scrollable table" tabindex="0">${Renderer.prototype.table.call(this, token)}</div>\n`;
    },
    code({ text, lang, escaped }: Tokens.Code) {
      const language = (lang || "").match(/^\S*/)?.[0] ?? "";
      const body = escaped ? text : escapeHtml(text);
      const label = language ? `<span class="code-lang">${escapeHtml(language)}</span>` : "";
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      return `<div class="code-block">${label}<pre tabindex="0"><code${className}>${body.replace(/\n$/, "")}\n</code></pre></div>\n`;
    }
  }
});

interface MarkdownContentProps {
  content: string;
}

function MarkdownContentBase({ content }: MarkdownContentProps) {
  const html = marked.parse(content) as string;
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MarkdownContent = memo(MarkdownContentBase);
