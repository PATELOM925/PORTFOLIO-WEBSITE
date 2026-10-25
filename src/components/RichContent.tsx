import { FlowDiagram } from "@/components/FlowDiagram";
import { InteractiveChart, ChartSpec } from "@/components/InteractiveChart";
import { MarkdownContent } from "@/components/MarkdownContent";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { VideoEmbed } from "@/components/VideoEmbed";
import type { FlowSpec } from "@/lib/flow-layout";

// Markdown plus interactive fences:
//   ```chart     {"title": "...", "unit": "h", "data": [{"label": "...", "value": 1}]}
//   ```pipeline  {"title": "...", "steps": ["A", "B"]}
//   ```diagram   {"title": "...", "description": "...", "nodes": [...], "edges": [...]}  (see src/lib/flow-layout.ts)
//   ```video     {"url": "https://youtu.be/...", "title": "..."}
// And a collapsed section, closed by default. Its body can hold markdown and fences:
//   :::details Title | optional note on the right
//   ...
//   :::
const FENCE = /```(chart|pipeline|diagram|video)\n([\s\S]*?)```/g;
const DETAILS = /^:::details[ \t]+([^\n]+)\n([\s\S]*?)\n:::[ \t]*$/gm;

type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "chart"; spec: ChartSpec }
  | { kind: "pipeline"; steps: string[]; title?: string }
  | { kind: "diagram"; spec: FlowSpec }
  | { kind: "video"; url: string; title?: string }
  | { kind: "details"; title: string; note?: string; body: string };

function isFlowSpec(data: unknown): data is FlowSpec {
  const spec = data as FlowSpec;
  return Boolean(spec && typeof spec.title === "string" && typeof spec.description === "string" && Array.isArray(spec.nodes));
}

// Collapsed sections first, so a fence inside a section stays inside it.
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of content.matchAll(DETAILS)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push(...parseFences(content.slice(cursor, start)));
    const [title, note] = match[1].split("|").map((part) => part.trim());
    segments.push({ kind: "details", title, note: note || undefined, body: match[2] });
    cursor = start + match[0].length;
  }
  if (cursor < content.length) segments.push(...parseFences(content.slice(cursor)));
  return segments;
}

function parseFences(content: string): Segment[] {
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
      if (kind === "diagram") {
        if (!isFlowSpec(data)) throw new Error("diagram spec needs title, description and nodes");
        segments.push({ kind, spec: data });
      }
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
          case "diagram":
            return <FlowDiagram key={index} spec={segment.spec} />;
          case "video":
            return <VideoEmbed key={index} url={segment.url} title={segment.title} />;
          case "details":
            return (
              <details key={index} className="rich-details">
                <summary>
                  <span className="rich-details-chevron" aria-hidden="true" />
                  <span className="rich-details-title">{segment.title}</span>
                  {segment.note ? <span className="rich-details-note">{segment.note}</span> : null}
                </summary>
                <div className="rich-details-body">
                  <RichContent content={segment.body} />
                </div>
              </details>
            );
          default:
            return segment.text.trim() ? <MarkdownContent key={index} content={segment.text} /> : null;
        }
      })}
    </div>
  );
}
