import { marked } from "marked";
import { memo } from "react";

marked.setOptions({ gfm: true, breaks: false });

interface MarkdownContentProps {
  content: string;
}

function MarkdownContentBase({ content }: MarkdownContentProps) {
  const html = marked.parse(content) as string;
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MarkdownContent = memo(MarkdownContentBase);
