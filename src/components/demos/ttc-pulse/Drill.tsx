"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import indexFile from "@/demos/ttc-pulse/data/drill-index.json";
import { Bars, Columns, Heatmap, LineChart, formatCount, pad2 } from "./charts";
import { Kpis, Panel } from "./ui";
import css from "./Drill.module.css";
import styles from "./TtcPulse.module.css";

type Mode = "bus" | "streetcar" | "subway";
type Scope = "route" | "station" | "line";
type MetricKey = "n" | "reg" | "sev" | "score" | "mix";

export type DrillEntity = {
  id: string;
  file: string;
  name: string;
  mode: Mode;
  scope: Scope;
  n: number;
  sev: number | null;
  reg: number | null;
  mix: number;
  score: number;
};

type CauseList = [[number, number][], number];
type EntityFile = {
  id: string;
  y0: number;
  n: number;
  years: number[];
  months: number[][];
  days: number[][];
  grid: number[][];
  causes: { names: string[]; all: CauseList; byYear: CauseList[] };
  delay: ([number, number] | null)[];
  delayAll: [number, number] | null;
};

/** Cascade state in the URL hash: y = year, m = month 1 to 12, d = ISO weekday 1 to 7, k = metric. */
export type Cascade = { y?: number; m?: number; d?: number; k?: MetricKey };

const INDEX = (indexFile as unknown as { entities: DrillEntity[] }).entities;
const Y0 = indexFile.meta.y0;
const YEAR_COUNT = 13;
const YEARS = Array.from({ length: YEAR_COUNT }, (_, i) => Y0 + i);
const LAST_YEAR = YEARS[YEAR_COUNT - 1];
const METRICS: { key: MetricKey; label: string; kpi: string; show: (e: DrillEntity) => string }[] = [
  { key: "n", label: "Frequency", kpi: "Delay events", show: (e) => formatCount(e.n) },
  { key: "reg", label: "Regularity", kpi: "Gap p90, min", show: (e) => (e.reg === null ? "n/a" : String(e.reg)) },
  { key: "sev", label: "Severity", kpi: "Delay p90, min", show: (e) => (e.sev === null ? "n/a" : String(e.sev)) },
  { key: "score", label: "Composite", kpi: "Composite score", show: (e) => e.score.toFixed(2) },
  { key: "mix", label: "Cause mix", kpi: "Cause mix", show: (e) => e.mix.toFixed(2) }
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HOURS = Array.from({ length: 24 }, (_, h) => String(h));
// Months with too few rows in the source files. These are gaps in the TTC export, not quiet months.
const GAPS: Partial<Record<Mode, Record<number, number[]>>> = { bus: { 2021: [7, 8] }, streetcar: { 2014: [1, 2] } };
const SHORT: Record<string, string> = {
  "Operations - Operator": "Operator",
  "Utilized Off Route": "Off route",
  "Late Leaving Garage": "Late from garage",
  "General Delay": "General",
  "Miscellaneous Speed Control": "Speed control",
  "Injured or ill Customer (In Station) - Transported": "Ill customer",
  "Passenger Assistance Alarm Activated - No Trouble Found": "Alarm, no fault",
  "No Operator Immediately Available - Not E.S.A. Related": "No operator",
  "Emergency Services": "Emergency"
};
const causeLabel = (cause: string) => (/^[A-Z]{3,6}$/.test(cause) ? `${cause} (code)` : (SHORT[cause] ?? cause));
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const peak = (values: number[]) => values.indexOf(Math.max(...values));
const isMetric = (value: string | null): value is MetricKey => METRICS.some((m) => m.key === value);

export function readCascade(params: URLSearchParams): Cascade {
  const int = (key: string, lo: number, hi: number) => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value >= lo && value <= hi ? value : undefined;
  };
  const k = params.get("k");
  const y = int("y", Y0, LAST_YEAR);
  const m = y === undefined ? undefined : int("m", 1, 12);
  const day = y === undefined ? undefined : int("d", 1, 7);
  return { y, m, d: day, k: isMetric(k) ? k : undefined };
}

export function writeCascade(params: URLSearchParams, cascade: Cascade) {
  if (cascade.k && cascade.k !== "n") params.set("k", cascade.k);
  if (cascade.y === undefined) return;
  params.set("y", String(cascade.y));
  if (cascade.m !== undefined) params.set("m", String(cascade.m));
  if (cascade.d !== undefined) params.set("d", String(cascade.d));
}

/** The drill entity for a route id or a station key, or undefined when it has fewer than 20 delay events. */
export function drillEntity(mode: Mode, id: string): DrillEntity | undefined {
  return INDEX.find((e) => e.mode === mode && e.id === id);
}

export function entityLabel(e: DrillEntity) {
  if (e.scope === "station") return e.name;
  if (e.scope === "line") return `Line ${e.id.replace("line-", "")}${e.name ? ` ${e.name.replace(/ Line$/, "")}` : ""}`;
  return `${e.id}${e.name ? ` ${e.name}` : ""}`;
}

const metricValue = (e: DrillEntity, key: MetricKey) => e[key] ?? -Infinity;

function ranked(mode: Mode, scope: Scope, key: MetricKey) {
  return INDEX.filter((e) => e.mode === mode && e.scope === scope).sort((a, b) => metricValue(b, key) - metricValue(a, key) || b.n - a.n);
}

const cache = new Map<string, Promise<EntityFile>>();
function loadEntity(file: string): Promise<EntityFile> {
  let request = cache.get(file);
  if (!request) {
    request = fetch(`/demos/ttc-pulse/entity/${file}.json`).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<EntityFile>;
    });
    request.catch(() => cache.delete(file));
    cache.set(file, request);
  }
  return request;
}

function useEntityFile(file: string) {
  const [state, setState] = useState<{ file: string; data?: EntityFile; failed?: boolean }>({ file });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadEntity(file).then(
      (data) => live && setState({ file, data }),
      () => live && setState({ file, failed: true })
    );
    return () => {
      live = false;
    };
  }, [file, attempt]);
  const current = state.file === file ? state : { file };
  const retry = () => {
    setState({ file });
    setAttempt((n) => n + 1);
  };
  return { ...current, retry };
}

export function DrillDown({
  mode,
  entityId,
  onPick,
  cascade = {},
  onCascade,
  onExit
}: {
  mode: Mode;
  entityId: string | null;
  onPick: (id: string) => void;
  cascade?: Cascade;
  onCascade?: (next: Cascade) => void;
  onExit?: () => void;
}) {
  const metric = cascade.k ?? "n";
  const found = entityId ? drillEntity(mode, entityId) : undefined;
  const scope: Scope = found?.scope ?? (mode === "subway" ? "station" : "route");
  const list = useMemo(() => ranked(mode, scope, metric), [mode, scope, metric]);
  const entity = found ?? list[0];
  const rank = list.indexOf(entity) + 1;
  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? "Frequency";
  const file = useEntityFile(entity.file);
  const set = (next: Cascade) => onCascade?.({ k: cascade.k, ...next });
  const yi = cascade.y === undefined ? undefined : cascade.y - Y0;
  const di = cascade.d === undefined ? undefined : cascade.d - 1;
  const mi = cascade.m === undefined ? undefined : cascade.m - 1;

  return (
    <>
      <div className={css.head}>
        {onExit ? (
          <button type="button" className={css.back} onClick={onExit}>
            ‹ Overview
          </button>
        ) : null}
        <h2 className={css.title}>
          {scope === "route" ? <b>{entity.id}</b> : null} {scope === "route" ? entity.name || "Not in GTFS" : entityLabel(entity)}
        </h2>
        <span className={css.kind}>{mode === "subway" ? `Subway ${scope}` : `${mode === "bus" ? "Bus" : "Streetcar"} route`}</span>
      </div>

      <div className={css.controls}>
        <Picker key={`${mode}-${scope}`} list={list} entity={entity} scope={scope} metric={metric} rank={rank} onPick={onPick} />
        <div className={`${styles.toggle} ${css.metric}`} role="group" aria-label="Sort metric">
          {METRICS.map((m) => (
            <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => onCascade?.({ ...cascade, k: m.key })}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === "subway" ? (
          <div className={styles.toggle} role="group" aria-label="Subway scope">
            {(["station", "line"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={scope === s} onClick={() => scope !== s && onPick(ranked(mode, s, metric)[0].id)}>
                {s === "station" ? "Station" : "Line"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={css.five}>
        <Kpis items={METRICS.map((m) => [m.show(entity), m.kpi] as [string, string])} />
      </div>

      <Trail cascade={cascade} file={file.data} onCascade={set} />

      <div className={styles.grid}>
        {file.data ? (
          <Levels mode={mode} data={file.data} yi={yi} mi={mi} di={di} set={set} />
        ) : (
          <Panel title={file.failed ? "No data" : "Loading"} wide>
          {file.failed ? (
            <p className={css.status} role="alert">
              Data did not load.
              <button type="button" className={css.retry} onClick={file.retry}>
                Try again
              </button>
            </p>
          ) : (
            <p className={css.status} aria-live="polite">
              Loading {entityLabel(entity)}
            </p>
          )}
          </Panel>
        )}
        {file.data ? (
          <Panel title="By year" note="delay minutes per event" wide>
            <YearTable data={file.data} yi={yi} onYear={(i) => set({ y: Y0 + i })} />
          </Panel>
        ) : null}
        <Panel title="Ranking" note={`by ${metricLabel.toLowerCase()}, all years`}>
          <RankTable list={list} entity={entity} metric={metric} onPick={onPick} />
        </Panel>
      </div>
    </>
  );
}

function Picker({
  list,
  entity,
  scope,
  metric,
  rank,
  onPick
}: {
  list: DrillEntity[];
  entity: DrillEntity;
  scope: Scope;
  metric: MetricKey;
  rank: number;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const word = scope === "route" ? "Route" : scope === "line" ? "Line" : "Station";
  const show = METRICS.find((m) => m.key === metric)?.show ?? METRICS[0].show;
  const q = query.trim().toLowerCase();
  const matches = q ? list.filter((e) => `${e.id} ${e.name}`.toLowerCase().includes(q)) : list;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    setQuery("");
    onPick(id);
  };

  return (
    <div
      className={css.picker}
      ref={box}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <span id="ttc-drill-pick">{word}</span>
      <button type="button" className={css.pickButton} aria-haspopup="listbox" aria-expanded={open} aria-labelledby="ttc-drill-pick ttc-drill-current" onClick={() => setOpen(!open)}>
        <span id="ttc-drill-current">{entityLabel(entity)}</span>
        <span className={css.rank}>
          #{rank} of {list.length}
        </span>
      </button>
      {open ? (
        <div className={css.pop}>
          <input
            className={css.search}
            type="search"
            placeholder={`Search ${list.length} ${word.toLowerCase()}s`}
            aria-label={`Search ${word.toLowerCase()}s`}
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) pick(matches[0].id);
            }}
          />
          <ul className={css.options} role="listbox" aria-label={`${word}s`}>
            {matches.map((e) => (
              <li key={e.id} role="option" aria-selected={e.id === entity.id}>
                <button type="button" className={`${css.option} ${e.id === entity.id ? css.optionActive : ""}`} onClick={() => pick(e.id)}>
                  <span className={css.rank}>#{list.indexOf(e) + 1}</span>
                  <span>
                    {scope === "route" ? (
                      <>
                        <b>{e.id}</b> {e.name}
                      </>
                    ) : (
                      entityLabel(e)
                    )}
                  </span>
                  <span className={css.rank}>{show(e)}</span>
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 ? <p className={css.empty}>No match</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Trail({ cascade, file, onCascade }: { cascade: Cascade; file?: EntityFile; onCascade: (next: Cascade) => void }) {
  const steps: { label: string; go: Cascade }[] = [{ label: "All years", go: {} }];
  if (cascade.y !== undefined) steps.push({ label: String(cascade.y), go: { y: cascade.y } });
  if (cascade.y !== undefined && cascade.m !== undefined) steps.push({ label: MONTH_NAMES[cascade.m - 1], go: { y: cascade.y, m: cascade.m } });
  if (cascade.y !== undefined && cascade.d !== undefined) steps.push({ label: DAY_NAMES[cascade.d - 1], go: cascade });
  const count = file ? selectionCount(file, cascade) : undefined;
  return (
    <nav aria-label="Drill path">
      <ol className={css.trail}>
        {steps.map((step, i) => (
          <li key={step.label}>
            {i === steps.length - 1 ? (
              <span className={css.crumbNow} aria-current="location">
                {step.label}
              </span>
            ) : (
              <button type="button" className={css.crumb} onClick={() => onCascade(step.go)}>
                {step.label}
              </button>
            )}
          </li>
        ))}
        {count !== undefined ? (
          <li className={css.count}>
            {formatCount(count)} delay events
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

function weekdays(data: EntityFile, yi: number, mi?: number) {
  return DAYS.map((_, day) => (mi === undefined ? sum(MONTHS.map((__, m) => data.days[yi][m * 7 + day])) : data.days[yi][mi * 7 + day]));
}

function selectionCount(data: EntityFile, c: Cascade) {
  if (c.y === undefined) return data.n;
  const yi = c.y - Y0;
  if (c.d !== undefined) return weekdays(data, yi, c.m === undefined ? undefined : c.m - 1)[c.d - 1];
  if (c.m !== undefined) return data.months[yi][c.m - 1];
  return data.years[yi];
}

function Levels({ mode, data, yi, mi, di, set }: { mode: Mode; data: EntityFile; yi?: number; mi?: number; di?: number; set: (next: Cascade) => void }) {
  const year = yi === undefined ? undefined : Y0 + yi;
  const gaps = year === undefined ? [] : (GAPS[mode]?.[year] ?? []);
  const grid = yi === undefined ? DAYS.map((_, r) => HOURS.map((__, h) => sum(data.grid.map((g) => g[r * 24 + h])))) : DAYS.map((_, r) => data.grid[yi].slice(r * 24, r * 24 + 24));
  const causes = yi === undefined ? data.causes.all : data.causes.byYear[yi];
  const causeTotal = yi === undefined ? data.n : data.years[yi];
  const rest = causeTotal ? Math.round((causes[1] / causeTotal) * 100) : 0;
  const delay = yi === undefined ? data.delayAll : data.delay[yi];
  const scopeWord = year === undefined ? "all years" : String(year);
  const months = yi === undefined ? MONTHS.map((_, m) => sum(data.months.map((row) => row[m]))) : data.months[yi];
  const days = yi === undefined ? DAYS.map((_, day) => sum(YEARS.map((__, i) => weekdays(data, i)[day]))) : weekdays(data, yi, mi);
  const hours = di === undefined ? HOURS.map((_, h) => sum(grid.map((row) => row[h]))) : grid[di];
  const dayScope = mi === undefined || year === undefined ? scopeWord : `${MONTHS[mi]} ${year}`;
  const upTo = (day?: number) => (year === undefined ? {} : { y: year, m: mi === undefined ? undefined : mi + 1, d: day });

  return (
    <>
      <Panel title="Years" note={year === undefined ? "select a year" : `${year} selected`} wide>
        <Columns
          values={data.years}
          labels={YEARS.map((y) => `'${String(y).slice(2)}`)}
          tips={data.years.map((v, i) => `${YEARS[i]}: ${formatCount(v)} delay events${YEARS[i] === LAST_YEAR ? ", January only" : ""}`)}
          mark={yi}
          height={120}
          width={720}
          onSelect={(i) => set(i === yi ? {} : { y: Y0 + i })}
        />
      </Panel>
      <Panel title={`Causes, ${scopeWord}`} note={rest ? `rest ${rest}%` : undefined}>
        <Bars
          items={causes[0].map(([i, n]) => {
            const cause = data.causes.names[i];
            return { key: cause, label: causeLabel(cause), value: n, tip: `${cause}: ${formatCount(n)} delay events (${((n / causeTotal) * 100).toFixed(1)}%)` };
          })}
        />
      </Panel>

      <Panel title={`Months, ${scopeWord}`} note={year === undefined ? "select a year first" : mi === undefined ? "select a month" : `${MONTHS[mi]} selected`}>
        <Columns
          values={months}
          labels={MONTHS.map((m) => m[0])}
          tips={months.map((v, i) => `${MONTHS[i]}, ${scopeWord}: ${formatCount(v)} delay events${gaps.includes(i + 1) ? ". Gap in source data" : ""}`)}
          mark={mi}
          onSelect={year === undefined ? undefined : (i) => set(i === mi ? { y: year } : { y: year, m: i + 1 })}
        />
        {gaps.length ? <p className={css.hint}>{gaps.map((g) => MONTHS[g - 1]).join(" and ")}: gap in source</p> : null}
      </Panel>
      <Panel title={`Weekdays, ${dayScope}`} note={year === undefined ? "select a year first" : mi !== undefined && gaps.includes(mi + 1) ? "gap in source" : di === undefined ? "select a day" : `${DAYS[di]} selected`}>
        <Columns
          values={days}
          labels={DAYS}
          tips={days.map((v, i) => `${DAY_NAMES[i]}, ${dayScope}: ${formatCount(v)} delay events`)}
          mark={di}
          onSelect={year === undefined ? undefined : (i) => set(upTo(i === di ? undefined : i + 1))}
        />
      </Panel>
      <Panel title="Delay p90 by year" note={delay ? `${scopeWord}: median ${delay[0]}, p90 ${delay[1]} min` : "no delay minutes"}>
        <LineChart values={data.delay.map((v) => v?.[1] ?? 0)} labels={YEARS} unit="min, p90 delay" mark={yi} height={120} />
      </Panel>

      <Panel title={`Weekday by hour, ${scopeWord}`} note={`peak ${peakCell(grid)}`} wide>
        <Heatmap
          grid={grid}
          rows={DAYS}
          cols={HOURS}
          colEvery={3}
          selectedRow={di}
          onSelect={year === undefined ? undefined : (r) => set(upTo(r === di ? undefined : r + 1))}
          describe={(r, c, v) => (r < 0 ? `Delay events by weekday and hour, ${scopeWord}` : `${DAYS[r]} ${pad2(c)}:00, ${scopeWord}: ${formatCount(v)} delay events`)}
        />
      </Panel>

      <Panel title={di === undefined ? `Hours, ${scopeWord}` : `${DAY_NAMES[di]} hours, ${scopeWord}`} note={`peak ${pad2(peak(hours))}:00`}>
        <Columns values={hours} labels={HOURS} labelEvery={6} mark={peak(hours)} />
      </Panel>
    </>
  );
}

function peakCell(grid: number[][]) {
  const flat = grid.flat();
  const i = peak(flat);
  return `${DAYS[Math.floor(i / 24)]} ${pad2(i % 24)}:00`;
}

function RankTable({ list, entity, metric, onPick }: { list: DrillEntity[]; entity: DrillEntity; metric: MetricKey; onPick: (id: string) => void }) {
  const show = METRICS.find((m) => m.key === metric)?.show ?? METRICS[0].show;
  const top = list.slice(0, 8);
  const rows = top.includes(entity) ? top : [...top, entity];
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th className={styles.num}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className={e.id === entity.id ? css.rowNow : undefined}>
              <td>{list.indexOf(e) + 1}</td>
              <td>
                <button type="button" className={css.rowLink} onClick={() => onPick(e.id)}>
                  {entityLabel(e)}
                </button>
              </td>
              <td className={styles.num}>{show(e)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearTable({ data, yi, onYear }: { data: EntityFile; yi?: number; onYear: (i: number) => void }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Year</th>
            <th className={styles.num}>Events</th>
            <th className={styles.num}>Median</th>
            <th className={styles.num}>P90</th>
            <th>Top cause</th>
          </tr>
        </thead>
        <tbody>
          {YEARS.map((y, i) => {
            const top = data.causes.byYear[i][0][0];
            return (
              <tr key={y} className={i === yi ? css.rowNow : undefined}>
                <td className={css.nowrap}>
                  <button type="button" className={css.rowLink} onClick={() => onYear(i)}>
                    {y === LAST_YEAR ? `${y} Jan` : y}
                  </button>
                </td>
                <td className={styles.num}>{formatCount(data.years[i])}</td>
                <td className={styles.num}>{data.delay[i]?.[0] ?? ""}</td>
                <td className={styles.num}>{data.delay[i]?.[1] ?? ""}</td>
                <td className={css.cause}>{top ? causeLabel(data.causes.names[top[0]]) : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
