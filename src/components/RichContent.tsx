import { InteractiveChart, ChartSpec } from "@/components/InteractiveChart";
import { MarkdownContent } from "@/components/MarkdownContent";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { VideoEmbed } from "@/components/VideoEmbed";

// Markdown plus interactive fences:
//   ```chart     {"title": "...", "unit": "h", "data": [{"label": "...", "value": 1}]}
//   ```pipeline  {"title": "...", "steps": ["A", "B"]}
//   ```video     {"url": "https://youtu.be/...", "title": "..."}
const FENCE = /```(chart|pipeline|video)\n([\s\S]*?)```/g;

type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "chart"; spec: ChartSpec }
  | { kind: "pipeline"; steps: string[]; title?: string }
  | { kind: "video"; url: string; title?: string };

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(FENCE)) {
    const [raw, kind, body] = match;
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ kind: "markdown", text: content.slice(cursor, start) });
    cursor = start + raw.length;

    try {
      const data = JSON.parse(body);
      if (kind === "chart") segments.push({ kind, spec: data });
      if (kind === "pipeline") segments.push({ kind, steps: data.steps, title: data.title });
      if (kind === "video") segments.push({ kind, url: data.url, title: data.title });
    } catch {
      segments.push({ kind: "markdown", text: raw });
    }
  }

  if (cursor < content.length) segments.push({ kind: "markdown", text: content.slice(cursor) });
  return segments;
}

export function RichContent({ content }: { content: string }) {
  return (
    <div className="rich-content">
      {parseSegments(content).map((segment, index) => {
        switch (segment.kind) {
          case "chart":
            return <InteractiveChart key={index} spec={segment.spec} />;
          case "pipeline":
            return <PipelineDiagram key={index} steps={segment.steps} title={segment.title} />;
          case "video":
            return <VideoEmbed key={index} url={segment.url} title={segment.title} />;
          default:
            return segment.text.trim() ? <MarkdownContent key={index} content={segment.text} /> : null;
        }
      })}
    </div>
  );
}
