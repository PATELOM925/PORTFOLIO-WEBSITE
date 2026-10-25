// Grid layout and orthogonal edge routing for the ```diagram fence.
// The author places each node on a grid, once for the wide layout and once for the tall (phone) layout.
// This module turns that spec into absolute geometry. It has no React code, so it is easy to test.

/** [column, row, columnSpan?, rowSpan?] */
export type GridPos = [number, number, number?, number?];
/** [firstColumn, firstRow, lastColumn, lastRow] */
export type GridArea = [number, number, number, number];
export type Orientation = "wide" | "tall";

export interface FlowNodeSpec {
  id: string;
  label: string;
  /** Short text lines. Wrap a line in backticks to set it in monospace. */
  lines?: string[];
  /** Two-column rows, for example [table name, row count]. A row with one cell is a subheading. */
  rows?: string[][];
  tone?: string;
  wide?: GridPos | null;
  tall?: GridPos | null;
}

export interface FlowEdgeSpec {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface FlowBandSpec {
  label: string;
  wide?: GridArea | null;
  tall?: GridArea | null;
}

export interface FlowSpec {
  title: string;
  description: string;
  caption?: string;
  legend?: [string, string][];
  nodes: FlowNodeSpec[];
  edges?: FlowEdgeSpec[];
  bands?: FlowBandSpec[];
}

export interface PlacedNode extends FlowNodeSpec {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedEdge {
  d: string;
  dashed: boolean;
  label?: { text: string; x: number; y: number; w: number };
}

export interface PlacedBand {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowLayout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  bands: PlacedBand[];
}

interface Metrics {
  width: number;
  pad: number;
  colGap: number;
  rowGap: number;
}

const METRICS: Record<Orientation, Metrics> = {
  wide: { width: 1120, pad: 14, colGap: 22, rowGap: 30 },
  tall: { width: 340, pad: 10, colGap: 14, rowGap: 30 }
};

export const TEXT = {
  padX: 11,
  padTop: 12,
  labelLine: 19,
  line: 17,
  row: 17,
  subhead: 21,
  padBottom: 10
};

const BAND_HEADER = 30;
const BAND_INSET = 10;
const CORNER = 8;
const LABEL_CHAR = 6.2;

export function nodeHeight(node: FlowNodeSpec): number {
  const rows = (node.rows ?? []).reduce((sum, row) => sum + (row.length === 1 ? TEXT.subhead : TEXT.row), 0);
  return TEXT.padTop + TEXT.labelLine + (node.lines?.length ?? 0) * TEXT.line + rows + TEXT.padBottom;
}

type Side = "left" | "right" | "top" | "bottom";
type Point = [number, number];

function sidesFor(s: PlacedNode, t: PlacedNode): [Side, Side] {
  if (t.x >= s.x + s.w) return ["right", "left"];
  if (t.x + t.w <= s.x) return ["left", "right"];
  if (t.y >= s.y + s.h) return ["bottom", "top"];
  return ["top", "bottom"];
}

function overlap(a0: number, a1: number, b0: number, b1: number): [number, number] | null {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi > lo ? [lo, hi] : null;
}

function roundedPath(points: Point[]): string {
  const [first, ...rest] = points;
  let d = `M${first[0]},${first[1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(CORNER, inLen / 2, outLen / 2);
    if (r < 0.5) {
      d += ` L${cx},${cy}`;
      continue;
    }
    const ax = cx - ((cx - px) / inLen) * r;
    const ay = cy - ((cy - py) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += ` L${round(ax)},${round(ay)} Q${cx},${cy} ${round(bx)},${round(by)}`;
  }
  const last = rest[rest.length - 1];
  return `${d} L${last[0]},${last[1]}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function layoutFlow(spec: FlowSpec, orientation: Orientation): FlowLayout {
  const m = METRICS[orientation];
  const visible = spec.nodes.filter((node) => Array.isArray(node[orientation]));
  const bands = (spec.bands ?? []).filter((band) => Array.isArray(band[orientation]));

  const pos = (node: FlowNodeSpec) => {
    const [col, row, colSpan = 1, rowSpan = 1] = node[orientation] as GridPos;
    return { col, row, colSpan, rowSpan };
  };

  const cols = Math.max(1, ...visible.map((n) => pos(n).col + pos(n).colSpan), ...bands.map((b) => (b[orientation] as GridArea)[2] + 1));
  const rows = Math.max(1, ...visible.map((n) => pos(n).row + pos(n).rowSpan), ...bands.map((b) => (b[orientation] as GridArea)[3] + 1));
  const colW = (m.width - 2 * m.pad - (cols - 1) * m.colGap) / cols;
  const colLeft = (col: number) => m.pad + col * (colW + m.colGap);

  const rowH: number[] = Array(rows).fill(36);
  for (const node of visible) {
    const p = pos(node);
    if (p.rowSpan === 1) rowH[p.row] = Math.max(rowH[p.row], nodeHeight(node));
  }
  for (const node of visible) {
    const p = pos(node);
    if (p.rowSpan === 1) continue;
    const spanned = rowH.slice(p.row, p.row + p.rowSpan).reduce((a, b) => a + b, 0) + (p.rowSpan - 1) * m.rowGap;
    const extra = nodeHeight(node) - spanned;
    if (extra > 0) rowH[p.row + p.rowSpan - 1] += extra;
  }

  const bandStarts = new Set(bands.map((b) => (b[orientation] as GridArea)[1]));
  const bandEnds = new Set(bands.map((b) => (b[orientation] as GridArea)[3]));
  const rowTop: number[] = [];
  let y = m.pad;
  for (let r = 0; r < rows; r += 1) {
    if (bandStarts.has(r)) y += BAND_HEADER;
    rowTop[r] = y;
    y += rowH[r];
    if (bandEnds.has(r)) y += BAND_INSET;
    y += m.rowGap;
  }
  const height = y - m.rowGap + m.pad;

  const placed: PlacedNode[] = visible.map((node) => {
    const p = pos(node);
    const h = nodeHeight(node);
    const spanTop = rowTop[p.row];
    const spanBottom = rowTop[p.row + p.rowSpan - 1] + rowH[p.row + p.rowSpan - 1];
    return {
      ...node,
      x: round(colLeft(p.col)),
      y: round(spanTop + (spanBottom - spanTop - h) / 2),
      w: round(p.colSpan * colW + (p.colSpan - 1) * m.colGap),
      h
    };
  });
  const byId = new Map(placed.map((node) => [node.id, node]));

  const insetX = m.pad - 2;
  const placedBands: PlacedBand[] = bands.map((band) => {
    const [c0, r0, c1, r1] = band[orientation] as GridArea;
    const x = colLeft(c0) - insetX;
    const top = rowTop[r0] - BAND_HEADER;
    return {
      label: band.label,
      x: round(x),
      y: round(top),
      w: round(colLeft(c1) + colW + insetX - x),
      h: round(rowTop[r1] + rowH[r1] + BAND_INSET - top)
    };
  });

  const routed = (spec.edges ?? [])
    .map((edge) => ({ edge, s: byId.get(edge.from), t: byId.get(edge.to) }))
    .filter((e): e is { edge: FlowEdgeSpec; s: PlacedNode; t: PlacedNode } => Boolean(e.s && e.t))
    .map((e) => ({ ...e, sides: sidesFor(e.s, e.t) }));

  // Spread the ports of several edges that leave or enter the same side of one node.
  const ports = new Map<string, number[]>();
  routed.forEach((e, index) => {
    for (const [node, side] of [[e.s, e.sides[0]], [e.t, e.sides[1]]] as const) {
      const key = `${node.id}:${side}`;
      ports.set(key, [...(ports.get(key) ?? []), index]);
    }
  });
  const portY = (index: number, node: PlacedNode, side: Side, other: PlacedNode): number => {
    const group = ports.get(`${node.id}:${side}`) ?? [index];
    if (group.length === 1) {
      const shared = overlap(node.y, node.y + node.h, other.y, other.y + other.h);
      return round(shared ? (shared[0] + shared[1]) / 2 : node.y + node.h / 2);
    }
    const otherCenter = (i: number) => {
      const e = routed[i];
      const o = e.s.id === node.id ? e.t : e.s;
      return o.y + o.h / 2;
    };
    const order = [...group].sort((a, b) => otherCenter(a) - otherCenter(b));
    return round(node.y + (node.h * (order.indexOf(index) + 1)) / (group.length + 1));
  };

  const edges: PlacedEdge[] = routed.map((e, index) => {
    const { s, t, edge } = e;
    const [sSide, tSide] = e.sides;
    let points: Point[];
    if (sSide === "right" || sSide === "left") {
      const toRight = sSide === "right";
      const sx = toRight ? s.x + s.w : s.x;
      const tx = toRight ? t.x : t.x + t.w;
      const sy = portY(index, s, sSide, t);
      const ty = portY(index, t, tSide, s);
      const mx = round(toRight ? tx - m.colGap / 2 : tx + m.colGap / 2);
      points = Math.abs(sy - ty) < 0.5 ? [[sx, sy], [tx, sy]] : [[sx, sy], [mx, sy], [mx, ty], [tx, ty]];
    } else {
      const shared = overlap(s.x, s.x + s.w, t.x, t.x + t.w) ?? [t.x, t.x + t.w];
      const x = round((shared[0] + shared[1]) / 2);
      points = sSide === "bottom" ? [[x, s.y + s.h], [x, t.y]] : [[x, s.y], [x, t.y + t.h]];
    }

    let label: PlacedEdge["label"];
    if (edge.label) {
      let best = 0;
      let bestLen = -1;
      for (let i = 0; i < points.length - 1; i += 1) {
        const len = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
        if (len > bestLen) {
          best = i;
          bestLen = len;
        }
      }
      const [a, b] = [points[best], points[best + 1]];
      let labelY = (a[1] + b[1]) / 2;
      // A label on a line that enters a band goes in the gap above the band, clear of the band title.
      if (a[0] === b[0]) {
        const entered = placedBands.find((band) => Math.min(a[1], b[1]) < band.y && band.y < Math.max(a[1], b[1]));
        if (entered) labelY = entered.y - m.rowGap / 2;
      }
      label = {
        text: edge.label,
        x: round((a[0] + b[0]) / 2),
        y: round(labelY),
        w: round(edge.label.length * LABEL_CHAR + 14)
      };
    }
    return { d: roundedPath(points), dashed: Boolean(edge.dashed), label };
  });

  return { width: m.width, height: round(height), nodes: placed, edges, bands: placedBands };
}
