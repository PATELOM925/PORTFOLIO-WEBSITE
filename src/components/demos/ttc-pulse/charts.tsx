"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
  selectedRow,
  onSelect
}: {
  grid: number[][];
  rows: string[];
  cols: string[];
  colEvery?: number;
  describe: (row: number, col: number, value: number) => string;
  cellHeight?: number;
  labelWidth?: string;
  selectedRow?: number;
  onSelect?: (row: number) => void;
}) {
  const flat = grid.flat();
  const low = Math.min(...flat);
  const high = Math.max(...flat);
  return (
    <div className={styles.heatScroll}>
      <div className={styles.heat} style={{ gridTemplateColumns: `${labelWidth} repeat(${cols.length}, minmax(9px, 1fr))` }} role="img" aria-label={describe(-1, -1, 0)}>
        <span />
        {cols.map((col, index) => (
          <span key={col} className={styles.heatHead}>
            {index % colEvery === 0 ? col : ""}
          </span>
        ))}
        {grid.map((row, r) => (
          <HeatRow key={rows[r]} label={rows[r]} selected={selectedRow === r}>
            {row.map((value, c) => (
              <span
                key={c}
                className={`${styles.cell} ${value === high ? styles.cellPeak : ""}`}
                style={{
                  background: heatColour(high > low ? (value - low) / (high - low) : 0),
                  height: cellHeight,
                  opacity: selectedRow === undefined || selectedRow === r ? undefined : 0.4,
                  cursor: onSelect ? "pointer" : undefined
                }}
                data-tip={describe(r, c, value)}
                onClick={onSelect ? () => onSelect(r) : undefined}
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

function HeatRow({ label, selected, children }: { label: string; selected?: boolean; children: ReactNode }) {
  return (
    <>
      <span className={styles.heatLabel} style={selected ? { color: "var(--gold)", fontWeight: 700 } : undefined}>
        {label}
      </span>
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
  width: fallbackWidth = 360,
  onSelect,
  tips
}: {
  values: number[];
  labels: string[];
  labelEvery?: number;
  height?: number;
  unit?: string;
  mark?: number;
  width?: number;
  onSelect?: (index: number) => void;
  tips?: string[];
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
        const tip = tips?.[i] ?? `${labels[i]}: ${formatCount(v)} ${unit}`;
        return (
          <g key={i}>
            <rect
              x={i * (barWidth + gap)}
              y={plot - h}
              width={barWidth}
              height={h}
              rx={2}
              className={i === mark ? styles.colMark : styles.col}
              data-tip={onSelect ? undefined : tip}
              tabIndex={onSelect ? undefined : 0}
            />
            {onSelect ? (
              // A full-height target, so a short bar is easy to select.
              <rect
                x={i * (barWidth + gap)}
                y={0}
                width={barWidth}
                height={plot}
                className={styles.hit}
                style={{ cursor: "pointer" }}
                data-tip={tip}
                tabIndex={0}
                role="button"
                aria-label={tip}
                aria-pressed={i === mark}
                onClick={() => onSelect(i)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(i);
                  }
                }}
              />
            ) : null}
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

export function Scatter({ points, height = 150, width: fallbackWidth = 360 }: { points: ScatterPoint[]; height?: number; width?: number }) {
  const [box, width] = useWidth(fallbackWidth);
  const pad = { l: 30, r: 10, t: 14, b: 20 };
  const nMax = Math.max(...points.map((p) => p.n), 10) * 1.25;
  const lo = Math.min(...points.map((p) => p.score), 0);
  const hi = Math.max(...points.map((p) => p.score), 0.5);
  const x = (n: number) => pad.l + ((width - pad.l - pad.r) * Math.log10(Math.max(n, 1))) / Math.log10(nMax);
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const order = { base: 0, small: 1, top: 2 };
  return (
    <div ref={box}>
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label="Reliability score against delay events, log scale">
      <line className={styles.gridLine} x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} />
      <text className={styles.axis} x={pad.l - 5} y={y(0) + 3} textAnchor="end">
        0
      </text>
      <text className={styles.axis} x={pad.l} y={9}>
        score
      </text>
      {[1, 10, 100, 1000].filter((n) => n < nMax).map((n) => (
        <text key={n} className={styles.axis} x={x(n)} y={height - 5} textAnchor="middle">
          {formatCount(n)}
        </text>
      ))}
      <text className={styles.axis} x={width - pad.r} y={height - 5} textAnchor="end">
        events (log)
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

export type MapStation = { station: string; lat: number; lon: number; events: number; tip: string };

// Station points on longitude and latitude, scaled for Toronto. Dot area follows the event count.
export function StationMap({ stations, height = 260, width: fallbackWidth = 360 }: { stations: MapStation[]; height?: number; width?: number }) {
  const [box, width] = useWidth(fallbackWidth);
  const lats = stations.map((s) => s.lat);
  const lons = stations.map((s) => s.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos((((la0 + la1) / 2) * Math.PI) / 180);
  const spanX = (lo1 - lo0) * kx;
  const spanY = la1 - la0;
  const scale = Math.min((width - 24) / spanX, (height - 24) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const top = Math.max(...stations.map((s) => s.events));
  return (
    <div ref={box}>
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label="Map of subway stations sized by delay events">
      {[...stations].sort((a, b) => b.events - a.events).map((s) => (
        <circle
          key={s.station}
          cx={offX + (s.lon - lo0) * kx * scale}
          cy={offY + (la1 - s.lat) * scale}
          r={2.5 + 9 * Math.sqrt(s.events / top)}
          className={styles.mapDot}
          data-tip={s.tip}
        />
      ))}
    </svg>
    </div>
  );
}
