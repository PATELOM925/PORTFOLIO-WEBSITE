"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import causeFile from "@/demos/ttc-pulse/data/e5_causes.json";
import routeFile from "@/demos/ttc-pulse/data/e1_routes.json";
import stationFile from "@/demos/ttc-pulse/data/e2_stations.json";
import hourFile from "@/demos/ttc-pulse/data/e3_weekday_hour.json";
import yearFile from "@/demos/ttc-pulse/data/e4_yearly.json";

type Mode = "bus" | "subway" | "streetcar";

type CauseRow = { mode: Mode; cause: string; events: number };
type HourRow = { mode: Mode; day_name: string; hour_bin: number; frequency: number };
type RouteRow = { mode: Mode; route_id: string; gtfs_matched: boolean; name: string; events: number; avg_severity_p90: number };
type StationRow = { station: string; line: string | null; events: number; avg_severity_p90: number };
type YearRow = { year: number; mode: Mode; events: number };

// Computed on the server from the data files, so the tiles are never typed by hand.
export type TtcPulseStats = {
  totalEvents: number;
  firstYear: number;
  lastYear: number;
  routeCount: number;
  subwayLineCount: number;
  stationCount: number;
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "bus", label: "Bus" },
  { id: "subway", label: "Subway" },
  { id: "streetcar", label: "Streetcar" }
];
const MODE_LABEL: Record<Mode, string> = { bus: "Bus", subway: "Subway", streetcar: "Streetcar" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const OTHER_CAUSE = "All other causes";
// The 2026 rows cover January only, so the line chart leaves that year out.
const PARTIAL_YEAR = 2026;
const Y_STEP = 30000;

const CAUSE_ROWS = causeFile.rows as CauseRow[];
const HOUR_ROWS = hourFile.rows as HourRow[];
const ROUTE_ROWS = routeFile.rows as RouteRow[];
const STATION_ROWS = stationFile.rows as StationRow[];
const YEAR_ROWS = yearFile.rows as YearRow[];

const numberFormat = new Intl.NumberFormat("en-US");
const formatCount = (value: number) => numberFormat.format(value);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(1)}%`;
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const pluralDelays = (count: number) => `${formatCount(count)} ${count === 1 ? "delay" : "delays"}`;

// Top 8 causes for a mode. The file's "All other causes" row and every cause past the top 8 form one "Other" row.
function topCauses(mode: Mode) {
  const rows = CAUSE_ROWS.filter((row) => row.mode === mode);
  const total = sum(rows.map((row) => row.events));
  const named = rows.filter((row) => row.cause !== OTHER_CAUSE).sort((a, b) => b.events - a.events);
  const top = named.slice(0, 8).map((row) => ({ label: row.cause, events: row.events }));
  const other = total - sum(top.map((item) => item.events));
  return { total, items: [...top, { label: "Other", events: other }] };
}

// Rows are weekday by hour, Monday first. Missing combinations stay at 0.
function heatGrid(mode: Mode): number[][] {
  const grid = DAYS.map(() => new Array<number>(24).fill(0));
  for (const row of HOUR_ROWS) {
    const day = DAYS.indexOf(row.day_name);
    if (row.mode === mode && day >= 0) grid[day][row.hour_bin] = row.frequency;
  }
  return grid;
}

// One hue from the accent, mixed into the panel. Low counts are the lightest step.
function heatColour(value: number, min: number, max: number) {
  const t = max > min ? (value - min) / (max - min) : 1;
  return `color-mix(in srgb, var(--royal) ${Math.round(18 + 82 * t)}%, var(--bg-panel))`;
}

// Yearly lines use the complete years only. Each mode keeps one series colour and one line style.
const LINE_YEARS = [...new Set(YEAR_ROWS.map((row) => row.year))]
  .filter((year) => year < PARTIAL_YEAR)
  .sort((a, b) => a - b);
const yearEvents = (mode: Mode, year: number) => YEAR_ROWS.find((row) => row.mode === mode && row.year === year)?.events ?? 0;
const LINE_SERIES = (["bus", "subway", "streetcar"] as Mode[]).map((mode) => ({
  mode,
  values: LINE_YEARS.map((year) => yearEvents(mode, year))
}));
const LINE_Y_MAX = Math.ceil(Math.max(...LINE_SERIES.flatMap((series) => series.values)) / Y_STEP) * Y_STEP;
const LINE_TICKS = Array.from({ length: LINE_Y_MAX / Y_STEP + 1 }, (_, index) => index * Y_STEP);

const CHART = { width: 600, height: 300, left: 76, right: 170, top: 16, bottom: 44 };
const PLOT_WIDTH = CHART.width - CHART.left - CHART.right;
const PLOT_HEIGHT = CHART.height - CHART.top - CHART.bottom;
const plotX = (index: number) => CHART.left + (index / (LINE_YEARS.length - 1)) * PLOT_WIDTH;
const plotY = (value: number) => CHART.top + PLOT_HEIGHT * (1 - value / LINE_Y_MAX);

export function TtcPulseDemo({ stats }: { stats: TtcPulseStats }) {
  const [mode, setMode] = useState<Mode>("bus");
  // The active cell is the one that has keyboard focus, hover or the last arrow-key move.
  const [active, setActive] = useState({ day: 0, hour: 0 });
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const label = MODE_LABEL[mode];
  const grid = heatGrid(mode);
  const cells = grid.flat();
  const min = Math.min(...cells);
  const max = Math.max(...cells);
  const activeCount = grid[active.day][active.hour];

  const causes = topCauses(mode);
  const causeMax = Math.max(...causes.items.map((item) => item.events));
  const routes = ROUTE_ROWS.filter((row) => row.mode === mode)
    .sort((a, b) => b.events - a.events)
    .slice(0, 15);
  const stations = [...STATION_ROWS].sort((a, b) => b.events - a.events).slice(0, 15);

  function moveTo(day: number, hour: number) {
    setActive({ day, hour });
    cellRefs.current[day * 24 + hour]?.focus();
  }

  function onCellKeyDown(event: KeyboardEvent<HTMLDivElement>, day: number, hour: number) {
    const next = { day, hour };
    if (event.key === "ArrowLeft") next.hour = Math.max(0, hour - 1);
    else if (event.key === "ArrowRight") next.hour = Math.min(23, hour + 1);
    else if (event.key === "ArrowUp") next.day = Math.max(0, day - 1);
    else if (event.key === "ArrowDown") next.day = Math.min(6, day + 1);
    else if (event.key === "Home") next.hour = 0;
    else if (event.key === "End") next.hour = 23;
    else return;
    event.preventDefault();
    moveTo(next.day, next.hour);
  }

  const lineEndX = plotX(LINE_YEARS.length - 1);

  return (
    <>
      <div className="demo-stat-grid">
        <div className="card demo-stat">
          <p className="demo-stat-label">Delay events</p>
          <p className="demo-stat-value">{formatCount(stats.totalEvents)}</p>
          <p className="demo-stat-note">Bus, subway and streetcar, all years</p>
        </div>
        <div className="card demo-stat">
          <p className="demo-stat-label">Years covered</p>
          <p className="demo-stat-value">
            {stats.firstYear} to {stats.lastYear}
          </p>
          <p className="demo-stat-note">{stats.lastYear} is January only.</p>
        </div>
        <div className="card demo-stat">
          <p className="demo-stat-label">Routes and lines</p>
          <p className="demo-stat-value">{formatCount(stats.routeCount)}</p>
          <p className="demo-stat-note">Includes {stats.subwayLineCount} subway lines.</p>
        </div>
        <div className="card demo-stat">
          <p className="demo-stat-label">Subway stations</p>
          <p className="demo-stat-value">{formatCount(stats.stationCount)}</p>
          <p className="demo-stat-note">Stations with delay events.</p>
        </div>
      </div>

      <div className="demo-modes" role="radiogroup" aria-label="Transit mode">
        <p className="demo-hint">Choose a mode. It changes the three sections below.</p>
        <div className="filter-row">
          {MODES.map((option) => (
            <label key={option.id} className={`filter-chip demo-mode${mode === option.id ? " is-active" : ""}`}>
              <input
                type="radio"
                name="ttc-mode"
                value={option.id}
                checked={mode === option.id}
                onChange={() => setMode(option.id)}
                className="demo-visually-hidden"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <section className="card demo-section" aria-labelledby="ttc-when">
        <h2 id="ttc-when">When delays happen</h2>
        <p>
          Delay events by weekday and hour for {mode}. Darker cells have more events. Hover a cell, or move through the grid
          with the arrow keys, to read its count.
        </p>
        <div className="demo-scroll" role="region" aria-label={`Heatmap of delay events by weekday and hour, ${label}`} tabIndex={0}>
          <div className="demo-heat" role="grid" aria-label={`${label} delay events by weekday and hour`}>
            <div className="demo-heat-row" role="row">
              <div className="demo-heat-corner" role="columnheader" aria-hidden="true" />
              {HOURS.map((hour) => (
                <div key={hour} className="demo-heat-hour" role="columnheader">
                  {hour}
                </div>
              ))}
            </div>
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="demo-heat-row" role="row" aria-label={day}>
                <div className="demo-heat-day" role="rowheader">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const value = grid[dayIndex][hour];
                  const isActive = active.day === dayIndex && active.hour === hour;
                  return (
                    <div
                      key={hour}
                      ref={(element) => {
                        cellRefs.current[dayIndex * 24 + hour] = element;
                      }}
                      role="gridcell"
                      tabIndex={isActive ? 0 : -1}
                      aria-label={`${day} ${hourLabel(hour)}, ${pluralDelays(value)}`}
                      className={`demo-heat-cell${isActive ? " is-active" : ""}`}
                      style={{ background: heatColour(value, min, max) }}
                      onFocus={() => setActive({ day: dayIndex, hour })}
                      onMouseEnter={() => setActive({ day: dayIndex, hour })}
                      onKeyDown={(event) => onCellKeyDown(event, dayIndex, hour)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="demo-readout" aria-hidden="true">
          {DAYS[active.day]} {hourLabel(active.hour)}, {pluralDelays(activeCount)}
        </p>
        <div className="demo-legend">
          <span>{pluralDelays(min)}</span>
          <span className="demo-legend-bar" aria-hidden="true" />
          <span>{pluralDelays(max)}</span>
        </div>
        <details className="demo-details">
          <summary>Show the numbers</summary>
          <div className="demo-table-scroll" role="region" aria-label={`Table of delay events by weekday and hour, ${label}`} tabIndex={0}>
            <table className="demo-table demo-table-wide">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  {HOURS.map((hour) => (
                    <th key={hour} scope="col" className="num">
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIndex) => (
                  <tr key={day}>
                    <th scope="row">{day}</th>
                    {HOURS.map((hour) => (
                      <td key={hour} className="num">
                        {formatCount(grid[dayIndex][hour])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="card demo-section" aria-labelledby="ttc-why">
        <h2 id="ttc-why">Why delays happen</h2>
        <p>
          The 8 largest causes for {mode}, with their share of all {mode} delay events. Other groups every remaining cause.
        </p>
        <ul className="demo-cause-list">
          {causes.items.map((item) => (
            <li key={item.label} className="demo-cause">
              <span className="demo-cause-name">{item.label}</span>
              <span className="demo-bar-track">
                <span className="chart-bar demo-bar" style={{ width: `${(item.events / causeMax) * 100}%` }} />
              </span>
              <span className="demo-cause-value">
                {formatCount(item.events)} ({percent(item.events, causes.total)})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card demo-section" aria-labelledby="ttc-where">
        <h2 id="ttc-where">Where delays happen</h2>
        <h3>{mode === "subway" ? "Subway lines" : `Top 15 ${label.toLowerCase()} routes`}</h3>
        <div className="demo-table-scroll" role="region" aria-label={`Table of ${label.toLowerCase()} routes`} tabIndex={0}>
          <table className="demo-table">
            <thead>
              <tr>
                <th scope="col">Route</th>
                <th scope="col">Name</th>
                <th scope="col" className="num">
                  Delay events
                </th>
                <th scope="col" className="num">
                  90th-percentile delay, min
                </th>
              </tr>
            </thead>
            <tbody>
              {routes.map((row) => (
                <tr key={row.route_id}>
                  <th scope="row">{row.route_id}</th>
                  <td>
                    {row.name}
                    {!row.gtfs_matched ? <span className="tag-badge demo-tag">not in GTFS</span> : null}
                  </td>
                  <td className="num">{formatCount(row.events)}</td>
                  <td className="num">{row.avg_severity_p90.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mode === "subway" ? (
          <>
            <h3>Top 15 stations</h3>
            <div className="demo-table-scroll" role="region" aria-label="Table of subway stations" tabIndex={0}>
              <table className="demo-table">
                <thead>
                  <tr>
                    <th scope="col">Station</th>
                    <th scope="col">Line</th>
                    <th scope="col" className="num">
                      Delay events
                    </th>
                    <th scope="col" className="num">
                      90th-percentile delay, min
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((row) => (
                    <tr key={row.station}>
                      <th scope="row">{row.station}</th>
                      <td>{row.line ?? "Not listed"}</td>
                      <td className="num">{formatCount(row.events)}</td>
                      <td className="num">{row.avg_severity_p90.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        <p className="demo-note">
          The 90th-percentile column averages each route&apos;s 90th-percentile delay across its time rows. It is not a 90th
          percentile of all events. Routes tagged not in GTFS did not match a GTFS route.
        </p>
      </section>

      <section className="card demo-section" aria-labelledby="ttc-years">
        <h2 id="ttc-years">Delays per year</h2>
        <p>Delay events per year for each mode. Each mode has its own line style, so the lines can be told apart without colour.</p>
        <svg
          className="demo-line-chart"
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-label={`Line chart of delay events per year from ${LINE_YEARS[0]} to ${LINE_YEARS[LINE_YEARS.length - 1]} for bus, subway and streetcar`}
        >
          {LINE_TICKS.map((tick) => (
            <g key={tick}>
              <line className="demo-grid-line" x1={CHART.left} x2={CHART.left + PLOT_WIDTH} y1={plotY(tick)} y2={plotY(tick)} />
              <text className="demo-svg-text" x={CHART.left - 10} y={plotY(tick) + 6} textAnchor="end">
                {formatCount(tick)}
              </text>
            </g>
          ))}
          {LINE_YEARS.map((year, index) =>
            year % 2 === 0 ? (
              <text key={year} className="demo-svg-text" x={plotX(index)} y={CHART.height - 12} textAnchor="middle">
                {year}
              </text>
            ) : null
          )}
          {LINE_SERIES.map((series) => {
            const points = series.values.map((value, index) => `${plotX(index)},${plotY(value)}`).join(" ");
            const endY = plotY(series.values[series.values.length - 1]);
            return (
              <g key={series.mode} className={`demo-series demo-series-${series.mode}`}>
                <polyline className="demo-line" points={points} />
                {series.values.map((value, index) => (
                  <g key={LINE_YEARS[index]}>
                    <circle className="demo-point" cx={plotX(index)} cy={plotY(value)} r={6} />
                    <circle className="demo-hit" cx={plotX(index)} cy={plotY(value)} r={14}>
                      <title>{`${MODE_LABEL[series.mode]}, ${LINE_YEARS[index]}: ${pluralDelays(value)}`}</title>
                    </circle>
                  </g>
                ))}
                <line className="demo-line" x1={lineEndX + 12} x2={lineEndX + 36} y1={endY} y2={endY} />
                <text className="demo-svg-text" x={lineEndX + 44} y={endY + 6}>
                  {MODE_LABEL[series.mode]}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="demo-note">2026 is not plotted. The yearly data covers January 2026 only. Its count is in the table.</p>
        <details className="demo-details">
          <summary>Show the numbers</summary>
          <div className="demo-table-scroll" role="region" aria-label="Table of delay events per year" tabIndex={0}>
            <table className="demo-table">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  {MODES.map((option) => (
                    <th key={option.id} scope="col" className="num">
                      {option.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(YEAR_ROWS.map((row) => row.year))]
                  .sort((a, b) => a - b)
                  .map((year) => (
                    <tr key={year}>
                      <th scope="row">{year === PARTIAL_YEAR ? `${year} (January only)` : year}</th>
                      {MODES.map((option) => (
                        <td key={option.id} className="num">
                          {formatCount(yearEvents(option.id, year))}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
