"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import causesFile from "@/demos/ttc-pulse/data/causes.json";
import entitiesFile from "@/demos/ttc-pulse/data/entities.json";
import overviewFile from "@/demos/ttc-pulse/data/overview.json";
import qualityFile from "@/demos/ttc-pulse/data/quality.json";
import sampleFile from "@/demos/ttc-pulse/data/sample.json";
import scoresFile from "@/demos/ttc-pulse/data/scores.json";
import stationsFile from "@/demos/ttc-pulse/data/stations.json";
import timeFile from "@/demos/ttc-pulse/data/time.json";
import { Bars, Columns, Heatmap, LineChart, NetworkMap, Scatter, SizeLegend, Swatch, TipLayer, formatCount, pad2, type ScatterPoint } from "./charts";
import styles from "./TtcPulse.module.css";
import { Kpis, Panel } from "./ui";
import { LiveView } from "./Live";

type Mode = "bus" | "streetcar" | "subway";
type View = "overview" | "hotspots" | "time" | "causes" | "drill" | "live" | "quality";
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
const YEARS: number[] = overviewFile.meta.years;
const CAUSE_FLOOR = 30;

const MODES: { id: Mode; label: string }[] = [
  { id: "bus", label: "Bus" },
  { id: "streetcar", label: "Streetcar" },
  { id: "subway", label: "Subway" }
];
const TABS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "hotspots", label: "Hotspots" },
  { id: "time", label: "Time" },
  { id: "causes", label: "Causes" },
  { id: "live", label: "Live" },
  { id: "quality", label: "Quality" }
];
const VIEW_IDS: View[] = ["overview", "hotspots", "time", "causes", "drill", "live", "quality"];
// Old links from the first version of this page.
const OLD_VIEWS: Record<string, View> = { alerts: "live", rows: "quality", ai: "overview" };
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
const entityWord = (mode: Mode, n = 2) => (mode === "subway" ? (n === 1 ? "station" : "stations") : n === 1 ? "route" : "routes");
const peakIndex = (values: number[]) => values.indexOf(Math.max(...values));
const pct = (n: number, total: number) => `${((n / total) * 100).toFixed(0)}%`;
// "Other" is a bucket, not a cause. Show it in the note, not as a bar.
function causeSplit(causes: Pair[], total: number) {
  const named = causes.filter(([cause]) => cause !== "Other");
  const other = causes.find(([cause]) => cause === "Other")?.[1] ?? 0;
  const note = `${short(named[0][0])} ${pct(named[0][1], total)}${other ? `, other ${pct(other, total)}` : ""}`;
  return { named, note };
}
// The last year in which a mode has cause names, not only raw codes.
const namedYears = (mode: Mode) => YEARS.filter((year) => (CAUSES[mode].codeShare.find(([y]) => y === year)?.[1] ?? 0) < 99);

function readHash(): { view: View; mode: Mode; id: string | null } {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const raw = params.get("view") ?? "overview";
  const view = VIEW_IDS.includes(raw as View) ? (raw as View) : (OLD_VIEWS[raw] ?? "overview");
  const mode = MODES.some((m) => m.id === params.get("mode")) ? (params.get("mode") as Mode) : "bus";
  return { view, mode, id: params.get("id") };
}

export function TtcPulseDashboard({ techPost }: { techPost: { href: string; title: string } | null }) {
  const [view, setView] = useState<View>("overview");
  const [mode, setMode] = useState<Mode>("bus");
  const [entityId, setEntityId] = useState<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const state = readHash();
      setView(state.view);
      setMode(state.mode);
      setEntityId(state.id);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function go(next: Partial<{ view: View; mode: Mode; id: string | null }>) {
    const state = { view, mode, id: entityId, ...next };
    if (next.mode && next.mode !== mode && next.id === undefined) state.id = null;
    setView(state.view);
    setMode(state.mode);
    setEntityId(state.id);
    const params = new URLSearchParams();
    if (state.view !== "overview") params.set("view", state.view);
    if (state.mode !== "bus") params.set("mode", state.mode);
    if (state.id) params.set("id", state.id);
    const hash = params.toString();
    window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
  }

  const openEntity = (id: string) => go({ view: "drill", id });
  const current = view === "drill" ? "hotspots" : view;

  return (
    <TipLayer>
      <div className={styles.app}>
        <header className={styles.top}>
          <button type="button" className={styles.brandButton} onClick={() => go({ view: "overview", id: null })} aria-label="TTC Pulse overview">
            <h1 className={styles.brand}>TTC Pulse</h1>
            <p className={styles.sub}>TTC delays, January 2014 to January 2026</p>
          </button>
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
            {TABS.map((v) => (
              <button key={v.id} type="button" aria-current={current === v.id ? "page" : undefined} onClick={() => go({ view: v.id, id: null })}>
                {v.id === "live" ? <span className={styles.liveDot} aria-hidden="true" style={{ display: "inline-block", marginRight: 6 }} /> : null}
                {v.label}
              </button>
            ))}
          </nav>
        </div>

        {view === "overview" ? <Overview mode={mode} go={go} openEntity={openEntity} /> : null}
        {view === "hotspots" ? <Hotspots mode={mode} openEntity={openEntity} /> : null}
        {view === "time" ? <TimePatterns mode={mode} /> : null}
        {view === "causes" ? <Causes mode={mode} /> : null}
        {view === "drill" ? <DrillDown mode={mode} entityId={entityId} onPick={(id) => go({ id })} /> : null}
        {view === "live" ? <LiveView mode={mode} openEntity={openEntity} /> : null}
        {view === "quality" ? <Quality mode={mode} /> : null}

        <footer className={styles.foot}>
          <p>Data: City of Toronto Open Data, TTC GTFS and TTC live feeds. Export {overviewFile.meta.commit}.</p>
        </footer>
      </div>
    </TipLayer>
  );
}

function scorePoints(mode: Mode, adjusted: boolean): { points: ScatterPoint[]; top: ScoreRow[] } {
  const { points } = SCORES[mode];
  const value = (row: ScoreRow) => (adjusted ? row[4] : row[3]);
  const top = [...points].sort((a, b) => value(b) - value(a)).slice(0, 5);
  const topKeys = new Set(top.map((row) => row[0]));
  return {
    top,
    points: points.map((row) => ({
      key: row[0],
      n: row[2],
      score: value(row),
      state: topKeys.has(row[0]) ? "top" : row[2] < CAUSE_FLOOR ? "small" : "base",
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
  const { points } = useMemo(() => scorePoints(mode, adjusted), [mode, adjusted]);
  const flat = m.grid.flat();
  const peak = flat.indexOf(Math.max(...flat));
  const low = peakIndex(m.years.map((v) => -v));
  const causes = causeSplit(m.causes, m.total);
  return (
    <>
      <Kpis
        items={[
          [formatCount(m.total), "Delay events", "1 January 2014 to 31 January 2026"],
          [`${m.top10Count} ${entityWord(mode, m.top10Count)}`, `${m.top10Count === 1 ? "carries" : "carry"} ${m.top10Share}% of delays`, `The top 10% of ${m.entityCount} ${entityWord(mode)} by delay events`],
          [`${m.rushShare}%`, "In weekday rush hours", "Monday to Friday, 06:00 to 09:59 and 15:00 to 18:59"],
          [`${m.matchedShare}%`, "Joined to schedule", "Delay events matched to a route or station in the TTC GTFS schedule"]
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
        <Panel title="Top causes" note={causes.note} action={() => go({ view: "causes" })}>
          <Bars items={causes.named.map(([cause, n]) => ({ key: cause, label: short(cause), value: n, tip: causeTip(cause, n, m.total) }))} />
        </Panel>
        <Panel title="Yearly trend" note={`low ${YEARS[low]}`} action={() => go({ view: "time" })}>
          <LineChart values={m.years} labels={YEARS} mark={low} />
        </Panel>
        {mode !== "streetcar" ? (
          <Panel title="Score check" note="small samples rank high" action={() => go({ view: "hotspots" })}>
            <ScoreToggle adjusted={adjusted} onChange={setAdjusted} />
            <Scatter points={points} height={150} k={adjusted ? SCORES[mode].k : undefined} />
            <ScoreLegend />
          </Panel>
        ) : null}
      </div>
      <Pipeline />
    </>
  );
}

function ScoreLegend() {
  return (
    <div className={styles.mapLegend}>
      <Swatch tone="accent">top 5</Swatch>
      <Swatch tone="series">{CAUSE_FLOOR}+ events</Swatch>
      <Swatch tone="dim">under {CAUSE_FLOOR}</Swatch>
    </div>
  );
}

function Pipeline() {
  const mb = QUALITY.marts.reduce((sum, mart) => sum + mart.bytes, 0) / 1e6;
  const steps: [string, string][] = [
    ["Sources", "3"],
    ["Bronze", `${(QUALITY.events / 1e6).toFixed(2)}M rows`],
    ["Silver", "1 fact table"],
    ["Gold", `${QUALITY.marts.length} marts, ${mb.toFixed(0)} MB`],
    ["Site", "static JSON"]
  ];
  return (
    <section className={styles.panel} aria-label="Pipeline">
      <ol className={styles.flow}>
        {steps.map(([name, value]) => (
          <li key={name} className={name === "Gold" ? styles.flowGold : undefined}>
            {name} <b>{value}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}

// How the score works, as a picture: four weighted inputs, then the small-sample weight.
function ScoreExplainer({ k, mode }: { k: number; mode: Mode }) {
  const inputs: [string, string, number][] = [
    ["How often", "delay events", 35],
    ["How long", "p90 delay, min", 30],
    ["How uneven", "p90 gap, min", 20],
    ["Cause mix", "spread of causes", 15]
  ];
  const w = 220;
  const h = 90;
  const nMax = k * 8;
  const x = (n: number) => 4 + ((w - 8) * n) / nMax;
  const y = (v: number) => h - 14 - (h - 26) * v;
  const curve = Array.from({ length: 41 }, (_, i) => (i / 40) * nMax)
    .map((n, i) => `${i ? "L" : "M"}${x(n).toFixed(1)} ${y(n / (n + k)).toFixed(1)}`)
    .join("");
  return (
    <div className={styles.explain}>
      <div>
        <h3>Raw score: four inputs</h3>
        <div className={styles.weights} role="img" aria-label="Score weights: 35% how often, 30% how long, 20% how uneven, 15% cause mix">
          {inputs.map(([name, , weight]) => (
            <span key={name} style={{ flex: weight }}>
              {weight}%
            </span>
          ))}
        </div>
        <div className={styles.weightKeys}>
          {inputs.map(([name, detail]) => (
            <span key={name}>
              <b>{name}</b>
              {detail}
            </span>
          ))}
        </div>
        <p className={styles.caption}>The first three are z-scores: distance from the average {entityWord(mode, 1)}.</p>
      </div>
      <div>
        <h3>Adjusted: weight by sample size</h3>
        <svg className={styles.svg} viewBox={`0 0 ${w} ${h}`} height={h} role="img" aria-label={`Weight n over n plus ${k}. At ${k} events the weight is one half.`}>
          <line className={styles.gridLine} x1={4} x2={w - 4} y1={y(1)} y2={y(1)} />
          <line className={styles.gridLine} x1={4} x2={w - 4} y1={y(0)} y2={y(0)} />
          <line className={styles.kLine} x1={x(k)} x2={x(k)} y1={y(0)} y2={y(0.5)} />
          <line className={styles.kLine} x1={4} x2={x(k)} y1={y(0.5)} y2={y(0.5)} />
          <path className={styles.line} d={curve} />
          <circle className={styles.dotMark} cx={x(k)} cy={y(0.5)} r={4} />
          <text className={styles.axis} x={x(k) + 6} y={y(0.5) + 12}>
            {k} events: half weight
          </text>
          <text className={styles.axis} x={6} y={y(1) - 3}>
            weight 1
          </text>
          <text className={styles.axis} x={w - 4} y={h - 2} textAnchor="end">
            delay events
          </text>
        </svg>
        <p className={styles.caption}>Score times n / (n + {k}). k is the median count.</p>
      </div>
    </div>
  );
}

function Hotspots({ mode, openEntity }: { mode: Mode; openEntity: (id: string) => void }) {
  const [adjusted, setAdjusted] = useState(true);
  const { points } = useMemo(() => scorePoints(mode, adjusted), [mode, adjusted]);
  const { k, points: rows } = SCORES[mode];
  const ranked = [...rows].sort((a, b) => (adjusted ? b[4] - a[4] : b[3] - a[3])).slice(0, 15);
  const known = new Set(ENTITIES[mode].map((e) => e.id));
  const stationKey = (name: string) => `${name.toUpperCase()} STATION`;
  const ranking = (
    <Panel title="Ranking" note="90 days to 31 Jan 2026">
      <ScoreToggle adjusted={adjusted} onChange={setAdjusted} />
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{mode === "subway" ? "Station" : "Route"}</th>
              <th className={styles.num}>Events</th>
              <th className={styles.num}>P90 delay</th>
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
                  </td>
                  <td className={`${styles.num} ${row[2] < CAUSE_FLOOR ? styles.countSmall : ""}`}>{formatCount(row[2])}</td>
                  <td className={styles.num}>{row[5].toFixed(0)} min</td>
                  <td className={styles.num}>{(adjusted ? row[4] : row[3]).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.caption}>Gold count: under {CAUSE_FLOOR} events in 90 days.</p>
    </Panel>
  );
  const scatter = (
    <Panel title="Score against volume" note={adjusted ? `adjusted, k = ${k}` : "raw"}>
      <Scatter points={points} height={240} width={720} k={adjusted ? k : undefined} />
      <ScoreLegend />
    </Panel>
  );
  const top = Math.max(...stationsFile.map((s) => s.events));
  const labelled = new Set([...stationsFile].sort((a, b) => b.events - a.events).slice(0, 5).map((s) => s.station));
  return (
    <div className={styles.grid}>
      {ranking}
      {mode === "subway" ? (
        <Panel title="Station map" note="1 January 2014 to 31 January 2026" wide>
          <NetworkMap
            label="Map of subway stations on the TTC network, dot size shows delay events"
            points={stationsFile.map((s) => ({
              key: s.station,
              lon: s.lon,
              lat: s.lat,
              r: 2.5 + 11 * Math.sqrt(s.events / top),
              tone: labelled.has(s.station) ? "accent" : "series",
              tip: `${s.station}: ${formatCount(s.events)} delay events, p90 delay ${s.severity} min`
            }))}
            labels={stationsFile.filter((s) => labelled.has(s.station)).map((s) => ({ lon: s.lon, lat: s.lat, text: s.station }))}
          >
            <SizeLegend values={[1000, 5000, top]} max={top} maxR={13.5} label="delay events" />
            <span>Lines: TTC subway and LRT</span>
          </NetworkMap>
        </Panel>
      ) : null}
      {mode === "subway" ? (
        <>
          {scatter}
          <Panel title="How the score works" wide>
            <ScoreExplainer k={k} mode={mode} />
          </Panel>
        </>
      ) : (
        <div className={styles.stack}>
          {scatter}
          <Panel title="How the score works">
            <ScoreExplainer k={k} mode={mode} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function TimePatterns({ mode }: { mode: Mode }) {
  const m = OVERVIEW[mode];
  const hours = HOURS.map((_, h) => m.grid.reduce((sum, row) => sum + row[h], 0));
  const days = m.grid.map((row) => row.reduce((a, b) => a + b, 0));
  const monthYear = TIME[mode].monthYear;
  const medians = monthYear.map((row) => [...row].sort((a, b) => a - b)[6]);
  const isGap = (r: number, _c: number, v: number) => v < medians[r] * 0.05;
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
      <Panel title="Month and year" note="hatched: gap in source" wide>
        <Heatmap
          grid={monthYear}
          rows={YEARS.map(String)}
          cols={MONTHS}
          cellHeight={14}
          isGap={isGap}
          describe={(r, c, v) =>
            r < 0
              ? `Delay events by month and year, ${mode}`
              : `${MONTHS[c]} ${YEARS[r]}, ${formatCount(v)} delay events${isGap(r, c, v) ? ". Likely a gap in the TTC export." : ""}`
          }
        />
      </Panel>
      <Panel title="By weekday" note={`peak ${DAYS[peakIndex(days)]}`}>
        <Columns values={days} labels={DAYS} mark={peakIndex(days)} />
      </Panel>
    </div>
  );
}

function Causes({ mode }: { mode: Mode }) {
  const m = OVERVIEW[mode];
  const c = CAUSES[mode];
  const causes = causeSplit(m.causes, m.total);
  const years = namedYears(mode);
  const cols = years.map((year) => YEARS.indexOf(year));
  const codesFrom = YEARS.find((year) => !years.includes(year));
  return (
    <div className={styles.grid}>
      <Panel title="Top causes" note={causes.note}>
        <Bars items={causes.named.map(([cause, n]) => ({ key: cause, label: short(cause), value: n, tip: causeTip(cause, n, m.total) }))} />
      </Panel>
      <Panel title="Causes by year" note={codesFrom ? `${years[0]} to ${years[years.length - 1]}; from ${codesFrom}, codes only` : undefined} wide>
        <Heatmap
          grid={c.byYear.map(([, values]) => cols.map((i) => values[i]))}
          rows={c.byYear.map(([cause]) => short(cause))}
          labelWidth="8.5em"
          cols={years.map((y) => `'${String(y).slice(2)}`)}
          cellHeight={16}
          describe={(r, col, v) => (r < 0 ? `Named causes by year, ${mode}` : `${c.byYear[r][0]}, ${years[col]}: ${formatCount(v)} delay events`)}
        />
      </Panel>
    </div>
  );
}

function DrillDown({ mode, entityId, onPick }: { mode: Mode; entityId: string | null; onPick: (id: string) => void }) {
  const list = ENTITIES[mode];
  const entity = list.find((e) => e.id === entityId) ?? list[0];
  const label = mode === "subway" ? entity.name : `${entity.id} ${entity.name}`;
  const peakHour = peakIndex(entity.hours);
  const peakDay = peakIndex(entity.days);
  return (
    <>
      <div className={styles.pick}>
        <label htmlFor="ttc-entity">{mode === "subway" ? "Station" : "Route"}, top {list.length} by events</label>
        <select id="ttc-entity" value={entity.id} onChange={(event) => onPick(event.target.value)}>
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {mode === "subway" ? e.name : `${e.id} ${e.name || "(not in GTFS)"}`} ({formatCount(e.events)})
            </option>
          ))}
        </select>
      </div>
      <Kpis
        items={[
          [formatCount(entity.events), `Delay events, ${label}`],
          [`${((entity.events / OVERVIEW[mode].total) * 100).toFixed(1)}%`, `Of all ${mode} events`],
          [`${pad2(peakHour)}:00`, "Peak hour"],
          [DAYS[peakDay], "Peak weekday"]
        ]}
      />
      <div className={styles.grid}>
        <Panel title="By hour">
          <Columns values={entity.hours} labels={HOURS} labelEvery={6} mark={peakHour} />
        </Panel>
        <Panel title="By weekday">
          <Columns values={entity.days} labels={DAYS} mark={peakDay} />
        </Panel>
        <Panel title="By month">
          <Columns values={entity.months} labels={MONTHS} labelEvery={2} mark={peakIndex(entity.months)} />
        </Panel>
        <Panel title="By year" wide>
          <LineChart values={entity.years} labels={YEARS} width={720} height={170} />
        </Panel>
        <Panel title="Top causes">
          <Bars items={entity.causes.map(([cause, n]) => ({ key: cause, label: short(cause), value: n, tip: causeTip(cause, n, entity.events) }))} />
        </Panel>
      </div>
    </>
  );
}

function Quality({ mode }: { mode: Mode }) {
  const methodTotal = QUALITY.matchMethod.reduce((sum, [, n]) => sum + n, 0);
  return (
    <>
      <Kpis
        items={[
          [formatCount(QUALITY.events), "Delay events in silver"],
          [`${((QUALITY.lineage / QUALITY.events) * 100).toFixed(0)}%`, "Traceable to source row", "Each row keeps its source file, row ID and row hash"],
          [`${((QUALITY.matchMethod[0][1] / methodTotal) * 100).toFixed(1)}%`, "Exact route match"],
          [`${QUALITY.marts.length}`, "Gold marts"]
        ]}
      />
      <div className={styles.grid}>
        <Panel title="Bus routes not in GTFS" note={`${formatCount(QUALITY.unmatchedBus.reduce((sum, [, n]) => sum + n, 0))} events, top 10`}>
          <Bars items={QUALITY.unmatchedBus.map(([key, n]) => ({ key, label: <b>{key}</b>, value: n, tip: `Route ${key}: ${formatCount(n)} delay events with no route in the current TTC schedule` }))} />
        </Panel>
        <Panel title="Lineage sample" note={`newest ${mode} rows`} wide>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{mode === "subway" ? "Station" : "Route"}</th>
                  <th className={styles.num}>Delay, min</th>
                  <th>Source row</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE[mode].slice(0, 5).map((row) => (
                  <tr key={`${row.file}-${row.row}`}>
                    <td>{row.date}</td>
                    <td>{row.where}</td>
                    <td className={styles.num}>{row.delay ?? ""}</td>
                    <td className={styles.muted}>
                      {row.file}, row {formatCount(row.row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Limits" wide>
          <ul className={styles.limits}>
            <li>Delay logs only. No on-time trips, so counts, not rates.</li>
            <li>From 2025, the TTC files give cause codes, not names.</li>
            <li>The raw files are not in the repository.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
