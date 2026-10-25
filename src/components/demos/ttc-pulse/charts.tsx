"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import network from "@/demos/ttc-pulse/data/network.json";
import styles from "./TtcPulse.module.css";

export const formatCount = (value: number) => value.toLocaleString("en-US");
export const formatShort = (value: number) =>
  value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e4 ? `${Math.round(value / 1e3)}k` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}k` : String(value);
export const pad2 = (value: number) => String(value).padStart(2, "0");

// Draw each chart at the width of its panel, so text keeps its size on a phone.
function useWidth(fallback: number): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(Math.max(240, next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// One tooltip for the whole dashboard. Any element with data-tip shows it on hover or focus.
export function TipLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const show = (event: Event) => {
      const target = (event.target as Element | null)?.closest?.("[data-tip]");
      if (!target || !root.contains(target)) return;
      const box = target.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      setTip({ text: target.getAttribute("data-tip") ?? "", x: box.left - rootBox.left + box.width / 2, y: box.top - rootBox.top });
    };
    const hide = () => setTip(null);
    root.addEventListener("pointerover", show);
    root.addEventListener("focusin", show);
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusout", hide);
    return () => {
      root.removeEventListener("pointerover", show);
      root.removeEventListener("focusin", show);
      root.removeEventListener("pointerleave", hide);
      root.removeEventListener("focusout", hide);
    };
  }, []);

  return (
    <div ref={ref} className={styles.tipRoot}>
      {children}
      {tip ? (
        <div className={styles.tip} role="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}

export type BarItem = { key: string; label: ReactNode; value: number; tip: string; onSelect?: () => void; active?: boolean };

export function Bars({ items, max }: { items: BarItem[]; max?: number }) {
  const top = max ?? Math.max(...items.map((item) => item.value), 1);
  return (
    <div className={styles.bars}>
      {items.map((item) => {
        const width = `${((item.value / top) * 100).toFixed(1)}%`;
        const bar = <span className={styles.barFill} style={{ width }} />;
        return (
          <div key={item.key} className={styles.barRow}>
            <span className={styles.barLabel}>{item.label}</span>
            {item.onSelect ? (
              <button type="button" className={`${styles.barTrack} ${item.active ? styles.barActive : ""}`} onClick={item.onSelect} data-tip={item.tip} aria-label={item.tip}>
                {bar}
              </button>
            ) : (
              <span className={styles.barTrack} data-tip={item.tip} aria-label={item.tip} tabIndex={0} role="img">
                {bar}
              </span>
            )}
            <span className={styles.barValue}>{formatShort(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Sequential colour: one hue, mixed into the panel. The lowest value is the lightest step.
const heatColour = (t: number) => `color-mix(in srgb, var(--ttc-series) ${Math.round(12 + 88 * t)}%, var(--ttc-surface))`;

export function Heatmap({
  grid,
  rows,
  cols,
  colEvery = 1,
  describe,
  cellHeight = 18,
  labelWidth = "3.2em",
  isGap
}: {
  grid: number[][];
  rows: string[];
  cols: string[];
  colEvery?: number;
  describe: (row: number, col: number, value: number) => string;
  cellHeight?: number;
  labelWidth?: string;
  // Cells that are likely gaps in the source files. They get a hatch pattern.
  isGap?: (row: number, col: number, value: number) => boolean;
}) {
  const flat = grid.flat();
  const low = Math.min(...flat);
  const high = Math.max(...flat);
  return (
    <div className={styles.heatScroll}>
      <div className={styles.heat} style={{ gridTemplateColumns: `${labelWidth} repeat(${cols.length}, minmax(6px, 1fr))` }} role="img" aria-label={describe(-1, -1, 0)}>
        <span />
        {cols.map((col, index) => (
          <span key={col} className={styles.heatHead}>
            {index % colEvery === 0 ? col : ""}
          </span>
        ))}
        {grid.map((row, r) => (
          <HeatRow key={rows[r]} label={rows[r]}>
            {row.map((value, c) => (
              <span
                key={c}
                className={`${styles.cell} ${value === high ? styles.cellPeak : ""} ${isGap?.(r, c, value) ? styles.cellGap : ""}`}
                style={{ background: heatColour(high > low ? (value - low) / (high - low) : 0), height: cellHeight }}
                data-tip={describe(r, c, value)}
              />
            ))}
          </HeatRow>
        ))}
      </div>
      <div className={styles.legend}>
        <span>{formatShort(low)}</span>
        <span className={styles.legendRamp} aria-hidden="true" />
        <span>{formatShort(high)}</span>
      </div>
    </div>
  );
}

function HeatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className={styles.heatLabel}>{label}</span>
      {children}
    </>
  );
}

export function LineChart({
  values,
  labels,
  height = 150,
  unit = "delay events",
  mark,
  width: fallbackWidth = 360
}: {
  values: number[];
  labels: (string | number)[];
  height?: number;
  unit?: string;
  mark?: number;
  width?: number;
}) {
  const [box, width] = useWidth(fallbackWidth);
  const pad = { l: 34, r: 10, t: 10, b: 18 };
  const top = Math.max(...values, 1) * 1.12;
  const x = (i: number) => pad.l + (i * (width - pad.l - pad.r)) / Math.max(values.length - 1, 1);
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - v / top);
  const ticks = [0, top / 2.24, top / 1.12];
  return (
    <div ref={box}>
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label={`${unit} by ${labels[0]} to ${labels[labels.length - 1]}`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line className={styles.gridLine} x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} />
          <text className={styles.axis} x={pad.l - 5} y={y(tick) + 3} textAnchor="end">
            {formatShort(Math.round(tick))}
          </text>
        </g>
      ))}
      <polyline className={styles.line} points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      {values.map((v, i) => (
        <g key={i}>
          <circle className={i === mark ? styles.dotMark : styles.dot} cx={x(i)} cy={y(v)} r={3.5} />
          <circle className={styles.hit} cx={x(i)} cy={y(v)} r={11} data-tip={`${labels[i]}: ${formatCount(v)} ${unit}`} tabIndex={0} />
        </g>
      ))}
      {[0, Math.floor((values.length - 1) / 2), values.length - 1].map((i, n) => (
        <text key={i} className={styles.axis} x={x(i)} y={height - 4} textAnchor={n === 0 ? "start" : n === 2 ? "end" : "middle"}>
          {labels[i]}
        </text>
      ))}
    </svg>
    </div>
  );
}

export function Columns({
  values,
  labels,
  labelEvery = 1,
  height = 96,
  unit = "delay events",
  mark,
  width: fallbackWidth = 360
}: {
  values: number[];
  labels: string[];
  labelEvery?: number;
  height?: number;
  unit?: string;
  mark?: number;
  width?: number;
}) {
  const [box, width] = useWidth(fallbackWidth);
  const gap = 2;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const top = Math.max(...values, 1);
  const plot = height - 16;
  return (
    <div ref={box}>
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label={`${unit} by ${labels[0]} to ${labels[labels.length - 1]}`}>
      {values.map((v, i) => {
        const h = Math.max(1, (plot * v) / top);
        return (
          <g key={i}>
            <rect
              x={i * (barWidth + gap)}
              y={plot - h}
              width={barWidth}
              height={h}
              rx={2}
              className={i === mark ? styles.colMark : styles.col}
              data-tip={`${labels[i]}: ${formatCount(v)} ${unit}`}
              tabIndex={0}
            />
            {i % labelEvery === 0 ? (
              <text className={styles.axis} x={i * (barWidth + gap) + barWidth / 2} y={height - 3} textAnchor="middle">
                {labels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
    </div>
  );
}

export type ScatterPoint = { key: string; n: number; score: number; tip: string; state: "top" | "small" | "base" };

// Score against event count. The x axis is log scale. Higher on the y axis means less reliable.
export function Scatter({ points, height = 150, width: fallbackWidth = 360, k }: { points: ScatterPoint[]; height?: number; width?: number; k?: number }) {
  const [box, width] = useWidth(fallbackWidth);
  const pad = { l: 34, r: 10, t: 16, b: 30 };
  const nMax = Math.max(...points.map((p) => p.n), 10) * 1.25;
  const nMin = 10 ** Math.floor(Math.log10(Math.max(1, Math.min(...points.map((p) => p.n)))));
  const lo = Math.min(...points.map((p) => p.score), 0);
  const hi = Math.max(...points.map((p) => p.score), 0.5);
  const span = Math.log10(nMax) - Math.log10(nMin);
  const x = (n: number) => pad.l + ((width - pad.l - pad.r) * (Math.log10(Math.max(n, nMin)) - Math.log10(nMin))) / span;
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const order = { base: 0, small: 1, top: 2 };
  const ticks = [1, 10, 100, 1000, 10000].filter((n) => n >= nMin && n < nMax);
  return (
    <div ref={box}>
      <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label="Reliability score against delay events, log scale">
        {k ? (
          <>
            <line className={styles.kLine} x1={x(k)} x2={x(k)} y1={pad.t} y2={height - pad.b} />
            <text className={styles.axis} x={x(k) + 4} y={pad.t + 9}>
              k = {k}, half weight
            </text>
          </>
        ) : null}
        <line className={styles.gridLine} x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} />
        <text className={styles.axis} x={pad.l - 5} y={y(0) + 3} textAnchor="end">
          0
        </text>
        <text className={styles.axis} x={pad.l - 5} y={pad.t + 3} textAnchor="end">
          {hi.toFixed(1)}
        </text>
        <text className={styles.axisTitle} x={pad.l} y={10}>
          Score, higher is worse
        </text>
        {ticks.map((n) => (
          <text key={n} className={styles.axis} x={x(n)} y={height - 17} textAnchor={n === nMin ? "start" : "middle"}>
            {formatCount(n)}
          </text>
        ))}
        <text className={styles.axisTitle} x={width - pad.r} y={height - 3} textAnchor="end">
          Delay events, log scale
        </text>
        {[...points].sort((a, b) => order[a.state] - order[b.state]).map((p) => (
          <circle
            key={p.key}
            cx={x(p.n)}
            cy={y(p.score)}
            r={p.state === "top" ? 4.5 : 3}
            className={p.state === "top" ? styles.ptTop : p.state === "small" ? styles.ptSmall : styles.pt}
            data-tip={p.tip}
          />
        ))}
      </svg>
    </div>
  );
}

// The TTC network from GTFS shapes, already projected to a 1000 wide viewBox.
const NET = network as {
  width: number;
  height: number;
  projection: { lon0: number; lat1: number; kx: number; scale: number };
  subway: { id: string; name: string; color: string; d: string }[];
  streetcar: string;
  bus: string;
};

export function project(lon: number, lat: number): [number, number] {
  const { lon0, lat1, kx, scale } = NET.projection;
  return [(lon - lon0) * kx * scale, (lat1 - lat) * scale];
}

// Put each label right of its dot. If it would overlap a label already placed, move it under the dot.
function placeLabels(labels: { lon: number; lat: number; text: string }[], unit: number) {
  const placed: { x: number; y: number; text: string }[] = [];
  for (const l of labels) {
    const [lx, ly] = project(l.lon, l.lat);
    let spot = { x: lx + 12 * unit, y: ly + 4 * unit, text: l.text };
    const width = l.text.length * 6.2 * unit;
    const hits = (s: { x: number; y: number }) => placed.some((p) => Math.abs(p.y - s.y) < 13 * unit && s.x < p.x + p.text.length * 6.2 * unit && p.x < s.x + width);
    if (hits(spot)) spot = { x: lx - width / 2, y: ly + 22 * unit, text: l.text };
    if (hits(spot)) spot = { x: lx - width / 2, y: ly - 12 * unit, text: l.text };
    placed.push(spot);
  }
  return placed;
}

// r is in screen pixels. The map converts it to viewBox units so dots keep their size on a phone.
export type MapPoint = { key: string; lon: number; lat: number; r: number; tone: "series" | "accent" | "ring" | "dim"; tip?: string };

export function NetworkMap({ points, label, labels = [], children }: { points: MapPoint[]; label: string; labels?: { lon: number; lat: number; text: string }[]; children?: ReactNode }) {
  const [box, width] = useWidth(720);
  const unit = NET.width / width;
  const order = { dim: 0, series: 1, ring: 2, accent: 3 };
  const toneClass = { series: styles.mapDot, accent: styles.mapDotAccent, ring: styles.mapRing, dim: styles.mapDotDim };
  return (
    <div ref={box} className={styles.mapBox}>
      <svg className={styles.svg} viewBox={`0 0 ${NET.width} ${NET.height}`} role="img" aria-label={label}>
        <path className={styles.netBus} d={NET.bus} />
        <path className={styles.netStreetcar} d={NET.streetcar} />
        {NET.subway.map((line) => (
          <path key={line.id} className={styles.netSubway} d={line.d} data-tip={line.name} />
        ))}
        {[...points].sort((a, b) => order[a.tone] - order[b.tone]).map((p) => {
          const [cx, cy] = project(p.lon, p.lat);
          return <circle key={p.key} cx={cx} cy={cy} r={p.r * unit} className={toneClass[p.tone]} data-tip={p.tip} />;
        })}
        {placeLabels(labels, unit).map((l) => (
          <text key={l.text} x={l.x} y={l.y} className={styles.mapLabel} style={{ fontSize: 11 * unit, strokeWidth: 3 * unit }}>
            {l.text}
          </text>
        ))}
      </svg>
      {children ? <div className={styles.mapLegend}>{children}</div> : null}
    </div>
  );
}

// A size legend for dot area: three reference circles.
export function SizeLegend({ values, max, maxR, label }: { values: number[]; max: number; maxR: number; label: string }) {
  return (
    <span className={styles.sizeLegend}>
      {values.map((v) => {
        const r = Math.max(2, maxR * Math.sqrt(v / max));
        return (
          <span key={v} className={styles.sizeItem}>
            <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden="true">
              <circle cx={r + 1} cy={r + 1} r={r} className={styles.mapDot} />
            </svg>
            {formatShort(v)}
          </span>
        );
      })}
      <span>{label}</span>
    </span>
  );
}

export function Swatch({ tone, children }: { tone: "series" | "accent" | "ring" | "dim"; children: ReactNode }) {
  const toneClass = { series: styles.mapDot, accent: styles.mapDotAccent, ring: styles.mapRing, dim: styles.mapDotDim };
  return (
    <span className={styles.sizeItem}>
      <svg width={12} height={12} aria-hidden="true">
        <circle cx={6} cy={6} r={4.5} className={toneClass[tone]} />
      </svg>
      {children}
    </span>
  );
}
