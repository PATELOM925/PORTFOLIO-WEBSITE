"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import alertsFile from "@/demos/ttc-pulse/data/alerts.json";
import causesFile from "@/demos/ttc-pulse/data/causes.json";
import entitiesFile from "@/demos/ttc-pulse/data/entities.json";
import overviewFile from "@/demos/ttc-pulse/data/overview.json";
import qualityFile from "@/demos/ttc-pulse/data/quality.json";
import sampleFile from "@/demos/ttc-pulse/data/sample.json";
import scoresFile from "@/demos/ttc-pulse/data/scores.json";
import stationsFile from "@/demos/ttc-pulse/data/stations.json";
import timeFile from "@/demos/ttc-pulse/data/time.json";
import { Bars, Columns, Heatmap, LineChart, Scatter, StationMap, TipLayer, formatCount, pad2, type ScatterPoint } from "./charts";
import styles from "./TtcPulse.module.css";
import { DrillDown, readCascade, writeCascade, type Cascade } from "./Drill";
import { Kpis, Panel } from "./ui";

type Mode = "bus" | "streetcar" | "subway";
type View = "overview" | "hotspots" | "time" | "causes" | "drill" | "alerts" | "quality" | "rows" | "ai";
type Pair = [string, number];
type ModeOverview = {
  total: number;
  entityCount: number;
  top10Count: number;
  top10Share: number;
  rushShare: number;
  matchedShare: number;
  grid: number[][];
  causes: Pair[];
  years: number[];
  jan2026: number;
};
type Entity = { id: string; name: string; gtfs: boolean; events: number; hours: number[]; days: number[]; years: number[]; months: number[]; causes: Pair[] };
type ScoreRow = [string, string, number, number, number, number];
type SampleRow = { date: string; hour: number; where: string; cause: string; delay: number | null; gap: number | null; file: string; row: number };

const OVERVIEW = overviewFile.modes as Record<Mode, ModeOverview>;
const ENTITIES = entitiesFile as Record<Mode, Entity[]>;
const SCORES = scoresFile as unknown as Record<Mode, { k: number; points: ScoreRow[] }>;
const TIME = timeFile as Record<Mode, { monthYear: number[][] }>;
const CAUSES = causesFile as unknown as Record<Mode, { byYear: [string, number[]][]; codeShare: [number, number][] }>;
const SAMPLE = sampleFile as Record<Mode, SampleRow[]>;
const QUALITY = qualityFile as unknown as {
  linkage: [string, string, number][];
  matchMethod: Pair[];
  unmatchedBus: Pair[];
  lineage: number;
  events: number;
  marts: { name: string; rows: number; bytes: number }[];
};
const ALERTS = alertsFile;
const YEARS: number[] = overviewFile.meta.years;
const ALL_EVENTS = (Object.values(OVERVIEW) as ModeOverview[]).reduce((sum, m) => sum + m.total, 0);

const MODES: { id: Mode; label: string }[] = [
  { id: "bus", label: "Bus" },
  { id: "streetcar", label: "Streetcar" },
  { id: "subway", label: "Subway" }
];
const VIEWS: { id: View; label: string; page: string }[] = [
  { id: "overview", label: "Overview", page: "01" },
  { id: "hotspots", label: "Hotspots", page: "02" },
  { id: "time", label: "Time patterns", page: "03" },
  { id: "causes", label: "Causes", page: "04" },
  { id: "drill", label: "Drill-down", page: "05" },
  { id: "alerts", label: "Live alerts", page: "06" },
  { id: "quality", label: "Data quality", page: "07" },
  { id: "rows", label: "Rows", page: "00" },
  { id: "ai", label: "AI chat", page: "08" }
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOURS = Array.from({ length: 24 }, (_, h) => String(h));
const SHORT: Record<string, string> = {
  "Operations - Operator": "Operator",
  "Utilized Off Route": "Off route",
  "Late Leaving Garage": "Late from garage",
  "General Delay": "General",
  "Miscellaneous Speed Control": "Speed control",
  "Injured or ill Customer (In Station) - Transported": "Ill customer",
  "Disorderly Patron": "Disorderly patron",
  "Operator Overspeeding": "Overspeeding",
  "Passenger Assistance Alarm Activated - No Trouble Found": "Alarm, no fault",
  "Passenger Other": "Passenger, other",
  "Miscellaneous Other": "Other, misc.",
  "Held By": "Held by",
  "Emergency Services": "Emergency",
  "No Operator Immediately Available - Not E.S.A. Related": "No operator"
};
const isCode = (cause: string) => /^[A-Z]{3,6}$/.test(cause);
const short = (cause: string) => SHORT[cause] ?? cause;
const causeTip = (cause: string, n: number, total?: number) =>
  `${cause}: ${formatCount(n)} delay events${total ? ` (${((n / total) * 100).toFixed(1)}%)` : ""}${isCode(cause) ? ". A raw code with no description." : ""}`;
const entityWord = (mode: Mode) => (mode === "subway" ? "stations" : "routes");
const peakIndex = (values: number[]) => values.indexOf(Math.max(...values));

function readHash(): { view: View; mode: Mode; id: string | null; drill: Cascade } {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const view = VIEWS.some((v) => v.id === params.get("view")) ? (params.get("view") as View) : "overview";
  const mode = MODES.some((m) => m.id === params.get("mode")) ? (params.get("mode") as Mode) : "bus";
  return { view, mode, id: params.get("id"), drill: readCascade(params) };
}

export function TtcPulseDashboard({ techPost }: { techPost: { href: string; title: string } | null }) {
  const [view, setView] = useState<View>("overview");
  const [mode, setMode] = useState<Mode>("bus");
  const [entityId, setEntityId] = useState<string | null>(null);
  const [drill, setDrill] = useState<Cascade>({});

  useEffect(() => {
    const apply = () => {
      const state = readHash();
      setView(state.view);
      setMode(state.mode);
      setEntityId(state.id);
      setDrill(state.drill);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function go(next: Partial<{ view: View; mode: Mode; id: string | null; drill: Cascade }>) {
    const state = { view, mode, id: entityId, drill, ...next };
    if (next.mode && next.mode !== mode && next.id === undefined) state.id = null;
    if (next.drill === undefined && (state.id !== entityId || state.mode !== mode)) state.drill = { k: drill.k };
    setView(state.view);
    setMode(state.mode);
    setEntityId(state.id);
    setDrill(state.drill);
    const params = new URLSearchParams();
    if (state.view !== "overview") params.set("view", state.view);
    if (state.mode !== "bus") params.set("mode", state.mode);
    if (state.id) params.set("id", state.id);
    if (state.view === "drill") writeCascade(params, state.drill);
    const hash = params.toString();
    window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
  }

  const openEntity = (id: string) => go({ view: "drill", id });

  return (
    <TipLayer>
      <div className={styles.app}>
        <header className={styles.top}>
          <div>
            <h1 className={styles.brand}>TTC Pulse</h1>
            <p className={styles.sub}>TTC delays, January 2014 to January 2026</p>
          </div>
          <div className={styles.links}>
            {techPost ? (
              <Link href={techPost.href} className={styles.link}>
                How it works
              </Link>
            ) : null}
            <a href="https://github.com/PATELOM925/TTC-PULSE" className={styles.link} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </header>

        <div className={styles.controls}>
          <div className={styles.segment} role="group" aria-label="Mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => go({ mode: m.id })}>
                {m.label}
              </button>
            ))}
          </div>
          <nav className={styles.tabs} aria-label="Dashboard views">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" aria-current={view === v.id ? "page" : undefined} onClick={() => go({ view: v.id })}>
                {v.label}
              </button>
            ))}
          </nav>
        </div>

        {view === "overview" ? <Overview mode={mode} go={go} openEntity={openEntity} /> : null}
        {view === "hotspots" ? <Hotspots mode={mode} openEntity={openEntity} /> : null}
        {view === "time" ? <TimePatterns mode={mode} /> : null}
        {view === "causes" ? <Causes mode={mode} /> : null}
        {view === "drill" ? (
          <DrillDown
            mode={mode}
            entityId={entityId}
            onPick={(id) => go({ id })}
            cascade={drill}
            onCascade={(next) => go({ drill: next })}
            onExit={() => go({ view: "overview" })}
          />
        ) : null}
        {view === "alerts" ? <Alerts /> : null}
        {view === "quality" ? <Quality /> : null}
        {view === "rows" ? <Rows mode={mode} /> : null}
        {view === "ai" ? <AiChat /> : null}

        <footer className={styles.foot}>
          <p>
            Team project, York University, Data Analytics and Visualization, Winter 2026. Om Patel wrote the first versions of 33 of the 36
            pipeline modules, including the reliability score. Awais Aziz built the AI chat page and later changed much of the pipeline.
            Muhammad Asad made the first import.
          </p>
          <p>
            Data: TTC Bus, Subway and Streetcar Delay Data, City of Toronto Open Data (Open Government Licence, Toronto). TTC GTFS schedule and
            GTFS-Realtime alerts. Export: TTC-PULSE {overviewFile.meta.commit}.
          </p>
        </footer>
      </div>
    </TipLayer>
  );
}

function scorePoints(mode: Mode, adjusted: boolean): { points: ScatterPoint[]; top: ScoreRow[] } {
  const { k, points } = SCORES[mode];
  const value = (row: ScoreRow) => (adjusted ? row[4] : row[3]);
  const top = [...points].sort((a, b) => value(b) - value(a)).slice(0, 5);
  const topKeys = new Set(top.map((row) => row[0]));
  return {
    top,
    points: points.map((row) => ({
      key: row[0],
      n: row[2],
      score: value(row),
      state: topKeys.has(row[0]) ? "top" : row[2] < k ? "small" : "base",
      tip: `${mode === "subway" ? row[1] : `${row[0]} ${row[1]}`}: ${formatCount(row[2])} events, score ${value(row).toFixed(2)}`
    }))
  };
}

function ScoreToggle({ adjusted, onChange }: { adjusted: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Score type">
      <button type="button" aria-pressed={!adjusted} onClick={() => onChange(false)}>
        Raw
      </button>
      <button type="button" aria-pressed={adjusted} onClick={() => onChange(true)}>
        Adjusted
      </button>
    </div>
  );
}

function Overview({ mode, go, openEntity }: { mode: Mode; go: (next: { view: View }) => void; openEntity: (id: string) => void }) {
  const m = OVERVIEW[mode];
  const [adjusted, setAdjusted] = useState(false);
  const { points, top } = useMemo(() => scorePoints(mode, adjusted), [mode, adjusted]);
  const flat = m.grid.flat();
  const peak = flat.indexOf(Math.max(...flat));
  const low = peakIndex(m.years.map((v) => -v));
  return (
    <>
      <Kpis
        items={[
          [formatCount(m.total), "Delay events"],
          [`${m.top10Share}%`, `On top 10% of ${entityWord(mode)}`],
          [`${m.rushShare}%`, "In weekday rush hours"],
          [`${m.matchedShare}%`, "Matched to GTFS"]
        ]}
      />
      <div className={styles.grid}>
        <Panel title={mode === "subway" ? "Worst stations" : "Worst routes"} note="by delay events" action={() => go({ view: "hotspots" })}>
          <Bars
            items={ENTITIES[mode].slice(0, 10).map((e) => ({
              key: e.id,
              label: mode === "subway" ? e.name : (
                <>
                  <b>{e.id}</b> {e.name}
                </>
              ),
              value: e.events,
              tip: `${mode === "subway" ? e.name : `${e.id} ${e.name}`}: ${formatCount(e.events)} delay events. Select to drill down.`,
              onSelect: () => openEntity(e.id)
            }))}
          />
        </Panel>
        <Panel title="Peak hours" note={`peak ${DAYS[Math.floor(peak / 24)]} ${pad2(peak % 24)}:00`} action={() => go({ view: "time" })} wide>
          <Heatmap
            grid={m.grid}
            rows={DAYS}
            cols={HOURS}
            colEvery={6}
            describe={(r, c, v) => (r < 0 ? `Delay events by weekday and hour, ${mode}` : `${DAYS[r]} ${pad2(c)}:00, ${formatCount(v)} delay events`)}
          />
        </Panel>
        <Panel title="Top causes" note={`${short(m.causes[0][0])} ${((m.causes[0][1] / m.total) * 100).toFixed(0)}%`} action={() => go({ view: "causes" })}>
          <Bars items={m.causes.map(([cause, n]) => ({ key: cause, label: short(cause), value: n, tip: causeTip(cause, n, m.total) }))} />
        </Panel>
        <Panel title="Yearly trend" note={`low ${YEARS[low]}`} action={() => go({ view: "time" })}>
          <LineChart values={m.years} labels={YEARS} mark={low} />
        </Panel>
        <Panel title="Score check" note="small samples rank high" action={() => go({ view: "hotspots" })}>
          <ScoreToggle adjusted={adjusted} onChange={setAdjusted} />
          <Scatter points={points} height={130} />
          <div className={styles.chips}>
            <span className={styles.chipsLabel}>Top 5</span>
            {top.map((row) => (
              <span key={row[0]} className={styles.chip}>
                {mode === "subway" ? row[1] : row[0]} ({row[2]})
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <Pipeline onOpen={() => go({ view: "quality" })} />
    </>
  );
}

function Pipeline({ onOpen }: { onOpen: () => void }) {
  const marts = QUALITY.marts.length;
  const mb = QUALITY.marts.reduce((sum, mart) => sum + mart.bytes, 0) / 1e6;
  const stops: [string, string, string][] = [
    ["Sources", "3 feeds", "delays, GTFS, alerts"],
    ["Bronze", "Raw rows", "file, row ID, hash"],
    ["Silver", `${(QUALITY.events / 1e6).toFixed(2)}M`, `events, ${OVERVIEW.bus.matchedShare}% bus matched`],
    ["Gold", `${marts} marts`, `${mb.toFixed(1)} MB Parquet`],
    ["Dashboard", "This page", "static export"]
  ];
  return (
    <section className={styles.panel} aria-label="Pipeline">
      <div className={styles.panelHead}>
        <h2>Pipeline</h2>
        <span>bronze, silver, gold</span>
        <button type="button" className={styles.open} onClick={onOpen} aria-label="Open data quality">
          Open
        </button>
      </div>
      <ol className={styles.track}>
        {stops.map(([name, value, detail]) => (
          <li key={name} className={name === "Gold" ? styles.stopGold : undefined}>
            <span className={styles.stopName}>{name}</span>
            <span className={styles.stopDot} aria-hidden="true" />
            <b>{value}</b>
            <span className={styles.stopDetail}>{detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Hotspots({ mode, openEntity }: { mode: Mode; openEntity: (id: string) => void }) {
  const [adjusted, setAdjusted] = useState(true);
  const { points } = useMemo(() => scorePoints(mode, adjusted), [mode, adjusted]);
  const { k, points: rows } = SCORES[mode];
  const ranked = [...rows].sort((a, b) => (adjusted ? b[4] - a[4] : b[3] - a[3])).slice(0, 15);
  const known = new Set(ENTITIES[mode].map((e) => e.id));
  const stationKey = (name: string) => `${name.toUpperCase()} STATION`;
  return (
    <div className={styles.grid}>
      <Panel title="Ranking" note="90 days to 31 Jan 2026">
        <ScoreToggle adjusted={adjusted} onChange={setAdjusted} />
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>{mode === "subway" ? "Station" : "Route"}</th>
                <th className={styles.num}>Events</th>
                <th className={styles.num}>Severity</th>
                <th className={styles.num}>Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => {
                const id = mode === "subway" ? stationKey(row[1]) : row[0];
                const name = mode === "subway" ? row[1] : `${row[0]} ${row[1]}`;
                return (
                  <tr key={row[0]}>
                    <td>{i + 1}</td>
                    <td>
                      {known.has(id) ? (
                        <button type="button" className={styles.inlineLink} onClick={() => openEntity(id)}>
                          {name}
                        </button>
                      ) : (
                        name
                      )}
                      {row[2] < k ? <span className={styles.flag}>few events</span> : null}
                    </td>
                    <td className={styles.num}>{formatCount(row[2])}</td>
                    <td className={styles.num}>{row[5].toFixed(0)} min</td>
                    <td className={styles.num}>{(adjusted ? row[4] : row[3]).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Score against volume" note={`weight n / (n + ${k})`} wide>
        <Scatter points={points} height={240} width={720} />
        <p className={styles.caption}>
          Raw: z-scores of frequency, severity and gap, plus cause mix. Adjusted: each score times n / (n + k), with k the median event count. Prototype method.
        </p>
      </Panel>
      {mode === "subway" ? (
        <Panel title="Station map" note="dot size = delay events" wide>
          <StationMap
            stations={stationsFile.map((s) => ({ ...s, tip: `${s.station}: ${formatCount(s.events)} delay events, severity ${s.severity} min` }))}
            width={720}
            height={300}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function TimePatterns({ mode }: { mode: Mode }) {
  const m = OVERVIEW[mode];
  const hours = HOURS.map((_, h) => m.grid.reduce((sum, row) => sum + row[h], 0));
  const days = m.grid.map((row) => row.reduce((a, b) => a + b, 0));
  return (
    <div className={styles.grid}>
      <Panel title="Weekday and hour" wide>
        <Heatmap
          grid={m.grid}
          rows={DAYS}
          cols={HOURS}
          colEvery={3}
          cellHeight={22}
          describe={(r, c, v) => (r < 0 ? `Delay events by weekday and hour, ${mode}` : `${DAYS[r]} ${pad2(c)}:00, ${formatCount(v)} delay events`)}
        />
      </Panel>
      <Panel title="By hour" note={`peak ${pad2(peakIndex(hours))}:00`}>
        <Columns values={hours} labels={HOURS} labelEvery={6} mark={peakIndex(hours)} />
      </Panel>
      <Panel title="By weekday" note={`peak ${DAYS[peakIndex(days)]}`}>
        <Columns values={days} labels={DAYS} mark={peakIndex(days)} />
      </Panel>
      <Panel title="Month and year" wide>
        <Heatmap
          grid={TIME[mode].monthYear}
          rows={YEARS.map(String)}
          cols={MONTHS}
          cellHeight={14}
          describe={(r, c, v) => (r < 0 ? `Delay events by month and year, ${mode}` : `${MONTHS[c]} ${YEARS[r]}, ${formatCount(v)} delay events`)}
        />
      </Panel>
      <Panel title="By year" note={`Jan 2026: ${formatCount(m.jan2026)}`}>
        <LineChart values={m.years} labels={YEARS} />
      </Panel>
    </div>
  );
}

function Causes({ mode }: { mode: Mode }) {
  const m = OVERVIEW[mode];
  const c = CAUSES[mode];
  const codeYears = c.codeShare.filter(([year]) => year <= YEARS[YEARS.length - 1]);
  return (
    <div className={styles.grid}>
      <Panel title="Top causes">
        <Bars items={m.causes.map(([cause, n]) => ({ key: cause, label: short(cause), value: n, tip: causeTip(cause, n, m.total) }))} />
      </Panel>
      <Panel title="Causes by year" note="named causes only" wide>
        <Heatmap
          grid={c.byYear.map(([, values]) => values)}
          rows={c.byYear.map(([cause]) => short(cause))}
          labelWidth="8.5em"
          cols={YEARS.map((y) => `'${String(y).slice(2)}`)}
          cellHeight={16}
          describe={(r, col, v) => (r < 0 ? `Named causes by year, ${mode}` : `${c.byYear[r][0]}, ${YEARS[col]}: ${formatCount(v)} delay events`)}
        />
      </Panel>
      <Panel title="Raw cause codes" note="% of events with no cause name" wide>
        <LineChart values={codeYears.map(([, share]) => share)} labels={codeYears.map(([year]) => year)} unit="% of events with a raw code" height={140} width={720} />
        <p className={styles.caption}>From 2025, the source files give a code such as EFO in place of a cause name. The codes have no description yet.</p>
      </Panel>
    </div>
  );
}

function Alerts() {
  return (
    <>
      <Kpis
        items={[
          [formatCount(ALERTS.alerts), "Alerts"],
          [formatCount(ALERTS.rows), "Alert entity rows"],
          [`${ALERTS.matchedShare}%`, "Rows matched to GTFS"],
          [ALERTS.builtAt, "Snapshot date"]
        ]}
      />
      <Panel title="Alerts in the snapshot" note="the live feed starts when the scheduled pipeline runs" wide>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Scope</th>
                <th className={styles.num}>Rows</th>
                <th className={styles.num}>Matched</th>
              </tr>
            </thead>
            <tbody>
              {ALERTS.list.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.header || alert.id}</td>
                  <td>{alert.scope}</td>
                  <td className={styles.num}>{formatCount(alert.rows)}</td>
                  <td className={styles.num}>{alert.matched}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Quality() {
  const byMode = MODES.map((m) => {
    const rows = QUALITY.linkage.filter(([mode]) => mode === m.id);
    const total = rows.reduce((sum, [, , n]) => sum + n, 0);
    const matched = rows.find(([, status]) => status === "matched")?.[2] ?? 0;
    return { ...m, total, matched };
  });
  const methodTotal = QUALITY.matchMethod.reduce((sum, [, n]) => sum + n, 0);
  return (
    <>
      <Kpis
        items={[
          [formatCount(QUALITY.events), "Delay events in silver"],
          [`${((QUALITY.lineage / QUALITY.events) * 100).toFixed(0)}%`, "Rows with file, row ID and hash"],
          [`${((QUALITY.matchMethod[0][1] / methodTotal) * 100).toFixed(1)}%`, "Exact route number match"],
          [`${QUALITY.marts.length}`, "Gold marts"]
        ]}
      />
      <div className={styles.grid}>
        <Panel title="Matched to GTFS">
          <Bars
            max={100}
            items={byMode.map((m) => ({
              key: m.id,
              label: m.label,
              value: Math.round((m.matched / m.total) * 1000) / 10,
              tip: `${m.label}: ${formatCount(m.matched)} of ${formatCount(m.total)} events match a GTFS ${m.id === "subway" ? "line" : "route"}`
            }))}
          />
          <p className={styles.caption}>Values are percentages.</p>
        </Panel>
        <Panel title="Unmatched bus route keys" note={`${formatCount(OVERVIEW.bus.total - (byMode[0]?.matched ?? 0))} events`}>
          <Bars items={QUALITY.unmatchedBus.map(([key, n]) => ({ key, label: `Route key ${key}`, value: n, tip: `Route key ${key}: ${formatCount(n)} events with no GTFS match` }))} />
        </Panel>
        <Panel title="Gold marts">
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mart</th>
                  <th className={styles.num}>Rows</th>
                  <th className={styles.num}>MB</th>
                </tr>
              </thead>
              <tbody>
                {QUALITY.marts.map((mart) => (
                  <tr key={mart.name}>
                    <td>{mart.name.replace("gold_", "")}</td>
                    <td className={styles.num}>{formatCount(mart.rows)}</td>
                    <td className={styles.num}>{(mart.bytes / 1e6).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Limits" wide>
          <ul className={styles.limits}>
            <li>The data has delay events only, not trips that ran on time. So the counts are not delay rates.</li>
            <li>The raw files and the DuckDB database are not in the repository. The full pipeline does not run from a clone yet.</li>
            <li>The alert parser adds rows again on each run. 60 of 234 alert snapshot files do not match their checksum.</li>
            <li>Bus cause names stop in 2025. The newer rows have raw codes.</li>
            <li>The repository has no tests and no CI yet.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Rows({ mode }: { mode: Mode }) {
  return (
    <Panel title="Latest delay events" note={`25 newest ${mode} rows, with source file and row`} wide>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th className={styles.num}>Hour</th>
              <th>Where</th>
              <th>Cause</th>
              <th className={styles.num}>Delay</th>
              <th className={styles.num}>Gap</th>
              <th>Source file, row</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE[mode].map((row) => (
              <tr key={`${row.file}-${row.row}`}>
                <td>{row.date}</td>
                <td className={styles.num}>{pad2(row.hour)}</td>
                <td>{row.where}</td>
                <td>{short(row.cause)}</td>
                <td className={styles.num}>{row.delay ?? ""}</td>
                <td className={styles.num}>{row.gap ?? ""}</td>
                <td className={styles.muted}>
                  {row.file}, {row.row}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AiChat() {
  return (
    <Panel title="Ask TTC Pulse" note="not live on this site" wide>
      <p className={styles.body}>
        The Streamlit app has an AI chat page that answers questions from the gold marts. Awais Aziz built it. It calls a paid model API, so it is off on
        this public page.
      </p>
      <p className={styles.body}>Total in the data now: {formatCount(ALL_EVENTS)} delay events.</p>
    </Panel>
  );
}
