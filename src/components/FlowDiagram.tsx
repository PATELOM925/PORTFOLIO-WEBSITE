import { FlowLayout, FlowSpec, Orientation, PlacedNode, TEXT, layoutFlow } from "@/lib/flow-layout";

// A static diagram from a ```diagram fence. The server renders two SVGs from one spec:
// a wide layout for desktop and a tall layout for phones. CSS shows one of them.

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "diagram";
}

function NodeText({ node }: { node: PlacedNode }) {
  const left = node.x + TEXT.padX;
  const right = node.x + node.w - TEXT.padX;
  let y = node.y + TEXT.padTop + 13;
  const parts = [
    <text key="label" x={left} y={y} className="flow-label">
      {node.label}
    </text>
  ];
  y += TEXT.labelLine - 13;

  (node.lines ?? []).forEach((line, index) => {
    y += TEXT.line;
    const mono = line.startsWith("`") && line.endsWith("`");
    parts.push(
      <text key={`line-${index}`} x={left} y={y - 4} className={mono ? "flow-line flow-mono" : "flow-line"}>
        {mono ? line.slice(1, -1) : line}
      </text>
    );
  });

  (node.rows ?? []).forEach((row, index) => {
    if (row.length === 1) {
      y += TEXT.subhead;
      parts.push(
        <text key={`row-${index}`} x={left} y={y - 5} className="flow-subhead">
          {row[0]}
        </text>
      );
      return;
    }
    y += TEXT.row;
    parts.push(
      <text key={`row-${index}`} x={left} y={y - 4} className="flow-row-name">
        {row[0]}
      </text>
    );
    if (row[1]) {
      parts.push(
        <text key={`value-${index}`} x={right} y={y - 4} className="flow-row-value" textAnchor="end">
          {row[1]}
        </text>
      );
    }
  });
  return <>{parts}</>;
}

function DiagramSvg({ spec, layout, id }: { spec: FlowSpec; layout: FlowLayout; id: string }) {
  const arrow = `${id}-arrow`;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      height={layout.height}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="flow-svg"
    >
      <title id={`${id}-title`}>{spec.title}</title>
      <desc id={`${id}-desc`}>{spec.description}</desc>
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="flow-arrow-head" />
        </marker>
      </defs>
      {layout.bands.map((band) => (
        <g key={band.label} className="flow-band">
          <rect x={band.x} y={band.y} width={band.w} height={band.h} rx="14" />
          <text x={band.x + 12} y={band.y + 19}>
            {band.label}
          </text>
        </g>
      ))}
      {layout.edges.map((edge, index) => (
        <path key={`edge-${index}`} d={edge.d} className={edge.dashed ? "flow-edge flow-edge-dashed" : "flow-edge"} markerEnd={`url(#${arrow})`} />
      ))}
      {layout.nodes.map((node) => (
        <g key={node.id} className={`flow-node flow-tone-${node.tone ?? "default"}`}>
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="10" />
          <NodeText node={node} />
        </g>
      ))}
      {layout.edges.map((edge, index) =>
        edge.label ? (
          <g key={`label-${index}`} className="flow-edge-label">
            <rect x={edge.label.x - edge.label.w / 2} y={edge.label.y - 9} width={edge.label.w} height="18" rx="9" />
            <text x={edge.label.x} y={edge.label.y + 4} textAnchor="middle">
              {edge.label.text}
            </text>
          </g>
        ) : null
      )}
    </svg>
  );
}

export function FlowDiagram({ spec }: { spec: FlowSpec }) {
  const id = `flow-${slug(spec.title)}`;
  const views: Orientation[] = ["wide", "tall"];
  return (
    <figure className="flow-diagram">
      {views.map((orientation) => (
        <div key={orientation} className={`flow-view flow-view-${orientation}`}>
          <DiagramSvg spec={spec} layout={layoutFlow(spec, orientation)} id={`${id}-${orientation}`} />
        </div>
      ))}
      {spec.legend?.length ? (
        <ul className="flow-legend" aria-label="Colour key">
          {spec.legend.map(([tone, label]) => (
            <li key={tone}>
              <span className={`flow-swatch flow-tone-${tone}`} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption>{spec.caption ?? spec.title}</figcaption>
    </figure>
  );
}
