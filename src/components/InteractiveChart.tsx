"use client";

import { useState } from "react";

export interface ChartSpec {
  title: string;
  unit?: string;
  caption?: string;
  ratioLabel?: string;
  data: { label: string; value: number }[];
}

function formatValue(value: number, unit?: string) {
  const formatted = value.toLocaleString("en-CA");
  return unit ? `${formatted} ${unit}` : formatted;
}

export function InteractiveChart({ spec }: { spec: ChartSpec }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...spec.data.map((item) => item.value), 1);
  const first = spec.data[0]?.value;
  const last = spec.data[spec.data.length - 1]?.value;
  const ratio = spec.ratioLabel && spec.data.length > 1 && first && last ? first / last : null;

  return (
    <figure className="chart">
      <figcaption className="chart-title">{spec.title}</figcaption>
      <div className="chart-bars" role="list">
        {spec.data.map((item, index) => {
          const width = Math.max((item.value / max) * 100, 1.5);
          return (
            <div
              key={item.label}
              role="listitem"
              tabIndex={0}
              className={`chart-row${active === index ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${item.label}: ${formatValue(item.value, spec.unit)}`}
            >
              <span className="chart-label">{item.label}</span>
              <span className="chart-bar-wrap">
                <span className="chart-bar" style={{ width: `${width}%` }} />
                <span className="chart-value">{formatValue(item.value, spec.unit)}</span>
              </span>
            </div>
          );
        })}
      </div>
      {ratio && ratio > 1 ? (
        <p className="chart-ratio">
          {ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`} {spec.ratioLabel}
        </p>
      ) : null}
      {spec.caption ? <p className="chart-caption">{spec.caption}</p> : null}
    </figure>
  );
}
