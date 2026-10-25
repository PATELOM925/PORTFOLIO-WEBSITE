// Builds the retrieval corpus for the TTC Pulse Ask chat.
// Output: src/demos/ttc-pulse/data/chat-corpus.json (chunks, a BM25 inverted index and the entity directory).
// With --check, it builds in memory and exits 1 if the committed file is different.
// It imports the tokenizer from src/lib/chat/text.ts (Node type stripping), so index and query tokens match.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { estimateTokens, fmtHour, fmtInt, fmtPct, fmtScore, normalise, tokenize } from "../src/lib/chat/text.ts";

const root = process.cwd();
const dataDir = path.join(root, "src/demos/ttc-pulse/data");
const entityDir = path.join(root, "public/demos/ttc-pulse/entity");
const postFile = path.join(root, "content/blog/how-ttc-pulse-works.mdx");
const outFile = path.join(dataDir, "chat-corpus.json");

const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8"));
const overview = read("overview");
const causes = read("causes");
const quality = read("quality");
const time = read("time");
const scores = read("scores");
const drill = read("drill-index");

const MODES = ["bus", "streetcar", "subway"];
const YEARS = overview.meta.years; // 2014 to 2025
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const POST_HREF = "/blog/how-ttc-pulse-works";
const WINDOW = "90 days to 31 January 2026";
const MODE_NOUN = { bus: "bus routes", streetcar: "streetcar routes", subway: "subway stations" };
const MODE_TITLE = { bus: "Bus", streetcar: "Streetcar", subway: "Subway" };

const chunks = [];
function add(chunk) {
  const text = chunk.text.replace(/\s+\n/g, "\n").trim();
  chunks.push({ ...chunk, text, tokens: estimateTokens(text) });
  return chunks.length - 1;
}

const sum = (values) => values.reduce((a, b) => a + b, 0);
const argmax = (values) => values.indexOf(Math.max(...values));
const share = (n, total) => fmtPct((n / total) * 100);

// Entity labels: two or three words.
function entityLabel(e) {
  if (e.scope === "line") return `Line ${e.id.replace("line-", "")}`;
  if (e.scope === "station") return `${e.name} station`;
  return e.name ? `${e.id} ${e.name}` : `Route ${e.id}`;
}
function entityTitle(e) {
  if (e.scope === "line") return `Subway line ${e.id.replace("line-", "")}${e.name ? ` ${e.name.replace(/ Line$/, "")}` : ""}`;
  if (e.scope === "station") return `Subway station ${e.name}`;
  return `${MODE_TITLE[e.mode]} route ${e.id}${e.name ? ` ${e.name}` : ""}`;
}
const entityHref = (e) => `#view=drill&mode=${e.mode}&id=${encodeURIComponent(e.id)}`;
const hotspotsHref = (mode) => `#view=hotspots&mode=${mode}`;

// ---------- Entity files ----------
const entities = drill.entities.map((e) => ({ ...e, file: e.file, data: JSON.parse(fs.readFileSync(path.join(entityDir, `${e.file}.json`), "utf8")) }));
// Rank by delay events within the same mode and scope.
const groups = {};
for (const e of entities) (groups[`${e.mode}/${e.scope}`] ??= []).push(e);
for (const list of Object.values(groups)) {
  [...list].sort((a, b) => b.n - a.n).forEach((e, i) => (e.rank = i + 1));
}

// Score rows: [id, name, n, raw, adjusted, severity p90]. Ranks by raw and by adjusted score.
const scoreRank = {};
for (const mode of MODES) {
  const rows = scores[mode].points;
  const raw = [...rows].sort((a, b) => b[3] - a[3]);
  const adj = [...rows].sort((a, b) => b[4] - a[4]);
  scoreRank[mode] = { k: scores[mode].k, count: rows.length, raw, adj, byId: {} };
  for (const row of rows) scoreRank[mode].byId[row[0]] = { row, raw: raw.indexOf(row) + 1, adj: adj.indexOf(row) + 1 };
}

function scopeNoun(e) {
  if (e.scope === "line") return "subway lines";
  return MODE_NOUN[e.mode];
}

const entityChunk = {};
for (const e of entities) {
  const d = e.data;
  const how = new Array(168).fill(0);
  for (const row of d.grid) row.forEach((v, i) => (how[i] += v));
  const hours = new Array(24).fill(0);
  const days = new Array(7).fill(0);
  how.forEach((v, i) => {
    hours[i % 24] += v;
    days[Math.floor(i / 24)] += v;
  });
  const peakHour = argmax(hours);
  const peakDay = argmax(days);
  const [pairs, other] = d.causes.all;
  const causeText = pairs.map(([i, n]) => `${d.causes.names[i]} ${fmtInt(n)}`).join("; ") + (other ? `; other causes ${fmtInt(other)}` : "");
  const byYear = YEARS.map((y, i) => `${y} ${fmtInt(d.years[i])}`).join("; ") + `; 2026 (January only) ${fmtInt(d.years[12] ?? 0)}`;
  const busiestYear = YEARS[argmax(d.years.slice(0, 12))];
  const lines = [
    `${entityTitle(e)}. Delay events, January 2014 to January 2026: ${fmtInt(d.n)}. Rank ${e.rank} of ${groups[`${e.mode}/${e.scope}`].length} ${scopeNoun(e)} by delay events.`,
    `By year: ${byYear}. Busiest year: ${busiestYear}.`,
    `Peak hour: ${fmtHour(peakHour)} with ${fmtInt(hours[peakHour])} events. Busiest weekday: ${DAYS[peakDay]} with ${fmtInt(days[peakDay])} events.`,
    `Top causes, all years: ${causeText}.`,
    `Delay minutes per event, all years: median ${d.delayAll[0]}, p90 ${d.delayAll[1]}.`
  ];
  const score = scoreRank[e.mode].byId[e.id];
  if (score) {
    const { row, raw, adj } = score;
    lines.push(
      `Reliability score, ${WINDOW}: ${fmtInt(row[2])} events; severity p90 ${row[5]} minutes; raw score ${fmtScore(row[3])}, rank ${raw} of ${scoreRank[e.mode].count}; adjusted score ${fmtScore(row[4])}, rank ${adj} of ${scoreRank[e.mode].count} (k = ${scoreRank[e.mode].k}).`
    );
  } else if (e.scope !== "line") {
    lines.push(`Reliability score: not in the ${WINDOW} ranking.`);
  }
  entityChunk[e.file] = add({ id: `entity-${e.file}`, kind: "entity", mode: e.mode, label: entityLabel(e), href: entityHref(e), text: lines.join("\n") });
}

// ---------- Rank chunks ----------
function rankList(list, value, top = 10) {
  return [...list]
    .sort((a, b) => value(b) - value(a))
    .slice(0, top)
    .map((e, i) => `${i + 1}. ${entityLabel(e)} ${fmtInt(value(e))}`)
    .join("; ");
}
const rankable = (mode) => (mode === "subway" ? groups["subway/station"] : groups[`${mode}/route`]);
const lineNote = (value) => `Subway lines: ${groups["subway/line"].map((e) => `${entityLabel(e)} ${fmtInt(value(e))}`).join("; ")}.`;

for (const mode of MODES) {
  const list = rankable(mode);
  YEARS.forEach((year, i) => {
    const value = (e) => e.data.years[i];
    const text = `${MODE_TITLE[mode]} ${MODE_NOUN[mode].split(" ")[1]} with the most delay events in ${year}, top 10 of ${list.length}: ${rankList(list, value)}.${mode === "subway" ? ` ${lineNote(value)}` : ""}`;
    add({ id: `rank-${mode}-events-${year}`, kind: "rank", mode, label: `Top ${mode} ${year}`, href: hotspotsHref(mode), text });
  });
  const all = (e) => e.n;
  const fewest = [...list]
    .sort((a, b) => a.n - b.n)
    .slice(0, 5)
    .map((e) => `${entityLabel(e)} ${fmtInt(e.n)}`)
    .join("; ");
  add({
    id: `rank-${mode}-events-all`,
    kind: "rank",
    mode,
    label: `Top ${mode} overall`,
    href: hotspotsHref(mode),
    text: `${MODE_TITLE[mode]} ${MODE_NOUN[mode].split(" ")[1]} with the most delay events, January 2014 to January 2026, top 10 of ${list.length}: ${rankList(list, all)}.${mode === "subway" ? ` ${lineNote(all)}` : ""} Fewest delay events (20 or more): ${fewest}.`
  });
}

const scoreLabel = (mode, row) => (mode === "subway" ? `${row[1]} station` : row[1] ? `${row[0]} ${row[1]}` : `Route ${row[0]}`);
for (const mode of MODES) {
  const r = scoreRank[mode];
  const top = (rows, key) =>
    rows
      .slice(0, 10)
      .map((row, i) => `${i + 1}. ${scoreLabel(mode, row)}, ${fmtInt(row[2])} events, ${key === 3 ? "raw" : "adjusted"} ${fmtScore(row[key])}${key === 4 ? ` (raw rank ${r.byId[row[0]].raw})` : ` (adjusted rank ${r.byId[row[0]].adj})`}`)
      .join("; ");
  const leader = r.adj[0];
  add({
    id: `rank-${mode}-score-raw`,
    kind: "rank",
    mode,
    label: `Raw score ${mode}`,
    href: hotspotsHref(mode),
    text: `${MODE_TITLE[mode]} ${MODE_NOUN[mode].split(" ")[1]} by raw reliability score, ${WINDOW}, top 10 of ${r.count}: ${top(r.raw, 3)}. A high score means less reliable. Adjusted leader: ${scoreLabel(mode, leader)}, adjusted ${fmtScore(leader[4])}, ${fmtInt(leader[2])} events (k = ${r.k}).`
  });
  add({
    id: `rank-${mode}-score-adjusted`,
    kind: "rank",
    mode,
    label: `Adjusted score ${mode}`,
    href: hotspotsHref(mode),
    text: `${MODE_TITLE[mode]} ${MODE_NOUN[mode].split(" ")[1]} by adjusted reliability score, ${WINDOW}, top 10 of ${r.count}. Adjusted score = raw score × n / (n + ${r.k}), k = ${r.k}: ${top(r.adj, 4)}.`
  });
}

// ---------- Overview, time, causes ----------
const RUSH = "Monday to Friday, 06:00 to 09:59 and 15:00 to 18:59";
const grand = sum(MODES.map((m) => overview.modes[m].total));
for (const mode of MODES) {
  const m = overview.modes[mode];
  const unit = (mode === "subway" ? "station" : "route") + (m.top10Count === 1 ? "" : "s");
  const causeText = m.causes.map(([c, n]) => `${c} ${fmtInt(n)} (${share(n, m.total)})`).join("; ");
  const years = YEARS.map((y, i) => `${y} ${fmtInt(m.years[i])}`).join("; ");
  const low = YEARS[argmax(m.years.map((v) => -v))];
  const high = YEARS[argmax(m.years)];
  add({
    id: `overview-${mode}`,
    kind: "overview",
    mode,
    label: `${MODE_TITLE[mode]} overview`,
    href: `#view=overview&mode=${mode}`,
    text: [
      `${MODE_TITLE[mode]} overview, 1 January 2014 to 31 January 2026: ${fmtInt(m.total)} delay events across ${m.entityCount} ${mode === "subway" ? "station" : "route"} keys.`,
      `The top 10% (${m.top10Count} ${unit}) carry ${fmtPct(m.top10Share)} of ${mode} delay events.`,
      `${fmtPct(m.rushShare)} of ${mode} delay events fall in weekday rush hours (${RUSH}).`,
      `${fmtPct(m.matchedShare)} of ${mode} delay events join to the TTC GTFS schedule.`,
      `Top causes: ${causeText}.`,
      `By year: ${years}; January 2026 ${fmtInt(m.jan2026)}. Lowest year: ${low}. Highest year: ${high}.`
    ].join("\n")
  });
}
add({
  id: "overview-all",
  kind: "overview",
  mode: "all",
  label: "All modes",
  href: "#view=overview",
  text: [
    `All modes, 1 January 2014 to 31 January 2026: ${fmtInt(grand)} delay events.`,
    ...MODES.map((m) => `${MODE_TITLE[m]}: ${fmtInt(overview.modes[m].total)} (${share(overview.modes[m].total, grand)}), ${overview.modes[m].entityCount} ${m === "subway" ? "station" : "route"} keys, rush-hour share ${fmtPct(overview.modes[m].rushShare)}.`),
    `The data has ${groups["bus/route"].length} bus routes, ${groups["streetcar/route"].length} streetcar routes, ${groups["subway/station"].length} subway stations and ${groups["subway/line"].length} subway lines with 20 or more events.`,
    `Sources: City of Toronto Open Data delay logs, the TTC GTFS schedule and TTC GTFS-Realtime alerts. The dashboard also has a Live view with current TTC alerts and vehicles.`
  ].join("\n")
});

for (const mode of MODES) {
  const m = overview.modes[mode];
  const hours = new Array(24).fill(0);
  m.grid.forEach((row) => row.forEach((v, h) => (hours[h] += v)));
  const days = m.grid.map((row) => sum(row));
  const flat = m.grid.flat();
  const peak = argmax(flat);
  const quiet = argmax(hours.map((v) => -v));
  const topHours = [...hours.keys()].sort((a, b) => hours[b] - hours[a]).slice(0, 3).map((h) => `${fmtHour(h)} ${fmtInt(hours[h])}`).join("; ");
  const monthYear = time[mode].monthYear; // rows: years, cols: months
  const months = new Array(12).fill(0);
  monthYear.forEach((row) => row.forEach((v, c) => (months[c] += v)));
  const medians = monthYear.map((row) => [...row].sort((a, b) => a - b)[6]);
  const gaps = [];
  monthYear.forEach((row, r) => row.forEach((v, c) => v < medians[r] * 0.05 && gaps.push(`${MONTHS[c]} ${YEARS[r]}`)));
  add({
    id: `time-${mode}`,
    kind: "time",
    mode,
    label: `${MODE_TITLE[mode]} time`,
    href: `#view=time&mode=${mode}`,
    text: [
      `${MODE_TITLE[mode]} delay events by time, 2014 to 2025.`,
      `Peak weekday and hour: ${DAYS[Math.floor(peak / 24)]} ${fmtHour(peak % 24)} with ${fmtInt(flat[peak])} events.`,
      `Busiest hours: ${topHours}. Quietest hour: ${fmtHour(quiet)} with ${fmtInt(hours[quiet])}.`,
      `By weekday: ${DAYS.map((d, i) => `${d} ${fmtInt(days[i])}`).join("; ")}.`,
      `By month, all years: ${MONTHS.map((mo, i) => `${mo} ${fmtInt(months[i])}`).join("; ")}. Busiest month: ${MONTHS[argmax(months)]}.`,
      gaps.length ? `Likely gaps in the TTC export: ${gaps.join(", ")}.` : `No gaps in the TTC export.`
    ].join("\n")
  });
}

for (const mode of MODES) {
  const m = overview.modes[mode];
  const c = causes[mode];
  const i2024 = YEARS.indexOf(2024);
  const top2024 = [...c.byYear].sort((a, b) => b[1][i2024] - a[1][i2024]).slice(0, 3).map(([name, v]) => `${name} ${fmtInt(v[i2024])}`).join("; ");
  const codeYears = c.codeShare.filter(([, s]) => s >= 99).map(([y]) => y);
  const trend = c.byYear.slice(0, 4).map(([name, v]) => `${name}: 2014 ${fmtInt(v[0])}, 2019 ${fmtInt(v[5])}, 2024 ${fmtInt(v[i2024])}`).join("; ");
  add({
    id: `causes-${mode}`,
    kind: "causes",
    mode,
    label: `${MODE_TITLE[mode]} causes`,
    href: `#view=causes&mode=${mode}`,
    text: [
      `${MODE_TITLE[mode]} delay causes, 1 January 2014 to 31 January 2026. Top cause: ${m.causes[0][0]} with ${fmtInt(m.causes[0][1])} of ${fmtInt(m.total)} events (${share(m.causes[0][1], m.total)}).`,
      `Top causes: ${m.causes.map(([name, n]) => `${name} ${fmtInt(n)}`).join("; ")}.`,
      `Top causes in 2024: ${top2024}.`,
      `Trend: ${trend}.`,
      codeYears.length
        ? `From ${codeYears[0]}, all ${mode} cause values are raw codes such as EFO and MFWEA, with no description. So the named-cause charts stop at ${codeYears[0] - 1}.`
        : `Raw cause codes are a small share: ${c.codeShare.filter(([, s]) => s > 3).map(([y, s]) => `${y} ${fmtPct(s)}`).join(", ") || "under 3% each year"}.`
    ].join("\n")
  });
}

// ---------- Quality ----------
const methodTotal = sum(quality.matchMethod.map(([, n]) => n));
add({
  id: "quality-linkage",
  kind: "quality",
  mode: "all",
  label: "Schedule linkage",
  href: "#view=quality",
  text: [
    `Linkage to the TTC GTFS schedule: ${quality.linkage.map(([mode, status, n]) => `${mode} ${status} ${fmtInt(n)}`).join("; ")}.`,
    `Bus has ${fmtInt(quality.linkage[1][2])} unmatched delay events (${share(quality.linkage[1][2], overview.modes.bus.total)} of bus events). Only bus logs use free-text route labels.`,
    `Match method: ${quality.matchMethod.map(([name, n]) => `${name} ${fmtInt(n)} (${share(n, methodTotal)})`).join("; ")}. No fallback rows.`,
    `Top unmatched bus labels: ${quality.unmatchedBus.map(([k, n]) => `${k} ${fmtInt(n)}`).join("; ")}.`
  ].join("\n")
});
add({
  id: "quality-marts",
  kind: "quality",
  mode: "all",
  label: "Gold marts",
  href: "#view=quality",
  text: [
    `Lineage: ${fmtInt(quality.lineage)} of ${fmtInt(quality.events)} delay events in silver keep source_file, source_row_id and row_hash, so each event traces back to its file and row (${share(quality.lineage, quality.events)}).`,
    `Gold has ${quality.marts.length} marts, ${(sum(quality.marts.map((m) => m.bytes)) / 1e6).toFixed(1)} MB: ${quality.marts.map((m) => `${m.name} ${fmtInt(m.rows)} rows`).join("; ")}.`,
    `60 of the 234 alert snapshot files do not match the SHA-256 checksum in the registry. All 60 are smaller than the recorded size. The alert parser is not idempotent.`
  ].join("\n")
});

// ---------- Method terms ----------
const kText = MODES.map((m) => `${m} ${scoreRank[m].k}`).join(", ");
const METHOD = {
  score: `Reliability score: score = 0.35 z(frequency) + 0.30 z(severity_p90) + 0.20 z(regularity_p90) + 0.15 cause_mix. A higher score means less reliable. Each z-score compares a route or station with others of the same mode and type, over the ${WINDOW}.`,
  frequency: `Frequency is the number of delay events of a route or station in the 90-day window. It has weight 0.35 in the score, as a z-score.`,
  severity: `Severity is the 90th percentile (p90) of delay minutes per event in the window. It has weight 0.30, as a z-score. Bus delays of 999 minutes or more are set to null, but values below 999 stay.`,
  regularity: `Regularity is the 90th percentile of gap minutes between vehicles. It has weight 0.20, as a z-score.`,
  "cause-mix": `Cause mix is 1 minus the sum of squared cause shares, a diversity index from 0 to 1. It has weight 0.15. It is not a z-score.`,
  k: `k is the median number of delay events for a mode and entity type in the 90-day window: ${kText}. In the adjusted score, a route or station with n = k events gets half weight. k is a rule of thumb, not fitted to the data.`,
  adjusted: `Adjusted score = raw score × n / (n + k). n is the number of delay events in the window. Small n moves the score toward 0, the mean of a z-score. Large n keeps the score almost the same. With it, bus route 32 Eglinton West moves from rank 9 to rank 1, and route 28 Bayview South moves from rank 1 to rank 18.`,
  window: `The score window is the ${WINDOW}. The delay counts in other views cover 1 January 2014 to 31 January 2026.`,
  "z-score": `A z-score is the distance from the mean of the group, in standard deviations. The score uses z-scores for frequency, severity and regularity.`,
  "small-sample": `The small-sample fault: with few events, one long delay sets the p90 severity. Bus route 28 Bayview South ranks 1st on the raw score with only 10 delay events. Route 32 Eglinton West has the most events (447) and ranks 9th. 8 of the raw top 10 bus routes have fewer than 60 events. The adjusted score fixes this.`
};
for (const [term, text] of Object.entries(METHOD)) add({ id: `method-${term}`, kind: "method", mode: "all", label: `Method: ${term}`, href: POST_HREF, text });

// ---------- Post sections ----------
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => !line.trim().startsWith("|") && !line.trim().startsWith(":::"))
    .join("\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = cut.lastIndexOf(". ");
  return end > max * 0.5 ? cut.slice(0, end + 1) : cut.trimEnd();
}
const slugify = (title) => normalise(title).replace(/ /g, "-").slice(0, 40);
const post = fs.readFileSync(postFile, "utf8").replace(/^---[\s\S]*?\n---\n/, "");
const sections = [];
let current = { title: "Intro", body: [] };
for (const line of post.split("\n")) {
  const heading = line.match(/^#{2,3}\s+(.+)/);
  if (heading) {
    sections.push(current);
    current = { title: heading[1].trim(), body: [] };
  } else current.body.push(line);
}
sections.push(current);
for (const s of sections) {
  const text = clip(stripMarkdown(s.body.join("\n")), 900);
  if (text.length < 80) continue;
  const words = s.title.split(/\s+/).slice(0, 3).join(" ").replace(/[:,]$/, "");
  add({ id: `post-${slugify(s.title)}`, kind: "post", mode: "all", label: `Post: ${words}`, href: POST_HREF, text: `From the post "How TTC Pulse works", section "${s.title}": ${text}` });
}

// ---------- Limits ----------
const LIMITS = [
  "The data has delay logs only. It has no on-time trips and no ridership. So the dashboard shows counts of delay events, not delay rates or on-time percentages.",
  "The data ends on 31 January 2026. For 2026 it has January only. The yearly rankings cover 2014 to 2025.",
  "From 2025, the TTC files give bus and streetcar cause codes, not names. The codes have no description in the incident code table.",
  `The reliability score covers only the ${WINDOW}. Small samples rank high on the raw score. The adjusted score uses k, a rule of thumb.`,
  "The live TTC feeds have no delay minutes per trip. So the Live view has no live score. It shows current alerts and vehicles, and the feed time.",
  "Yonge Station has 2,343 of its 8,229 delay events at 22:00, and 2,085 of those have the cause Miscellaneous Other. This looks like a logging pattern, not a real peak.",
  `${fmtInt(quality.linkage[1][2])} bus delay events (${share(quality.linkage[1][2], overview.modes.bus.total)}) do not match a GTFS route, for example labels 56, 81 and 190. They stay in the data as unmatched.`,
  "The raw files and the DuckDB database are not in the repository. The silver and gold Parquet files are. The AWS kit has not run on AWS."
];
LIMITS.forEach((text, i) => add({ id: `limits-${i + 1}`, kind: "limits", mode: "all", label: `Limit ${i + 1}`, href: POST_HREF, text }));

// ---------- Directory ----------
const VARIANTS = [
  [/\brd\b/g, "road"],
  [/\bst\b/g, "street"],
  [/\bave\b/g, "avenue"],
  [/\bstn\b/g, "station"]
];
const LINE_ALIASES = {
  "line-1": ["line 1", "line one", "yonge-university", "yonge university", "yonge-university line", "yonge university line", "yus"],
  "line-2": ["line 2", "line two", "bloor-danforth", "bloor danforth", "bloor-danforth line", "bloor danforth line", "bd line"],
  "line-3": ["line 3", "line three", "scarborough rt", "srt", "scarborough line"]
};
const EXTRA = { "TMU STATION": ["dundas station", "ryerson station", "tmu"], "YORK UNIVERSITY": ["york university station"] };
function aliasesFor(e) {
  const set = new Set();
  const addName = (name) => {
    const n = normalise(name);
    if (!n) return;
    set.add(n);
    if (n.includes("-")) set.add(n.replace(/-/g, " "));
    let v = n;
    for (const [pattern, long] of VARIANTS) v = v.replace(pattern, long);
    if (v !== n) set.add(v);
  };
  if (e.scope === "line") for (const a of LINE_ALIASES[e.id] ?? []) set.add(a);
  else if (e.scope === "station") {
    addName(e.name);
    addName(`${e.name} station`);
    for (const a of EXTRA[e.id] ?? []) set.add(a);
  } else {
    if (e.name) addName(e.name);
    addName(`${e.id} ${e.name}`);
    set.add(`route ${e.id}`);
  }
  return [...set].sort();
}
const directory = entities.map((e) => ({ id: e.id, file: e.file, mode: e.mode, scope: e.scope, name: e.name, n: e.n, aliases: aliasesFor(e), chunk: entityChunk[e.file] }));

// ---------- Inverted index ----------
// Entity chunks are not in the index: they enter the context only through the entity resolver.
// Without them, words such as "k" and "rank" keep a useful weight.
const docLen = [];
const postings = {};
chunks.forEach((chunk, doc) => {
  const tokens = chunk.kind === "entity" ? [] : tokenize(`${chunk.label} ${chunk.text}`);
  docLen.push(tokens.length);
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
  for (const t of Object.keys(tf).sort()) (postings[t] ??= []).push([doc, tf[t]]);
});
const sortedPostings = {};
for (const t of Object.keys(postings).sort()) sortedPostings[t] = postings[t];
const docCount = docLen.filter((n) => n > 0).length;
const avgLen = Math.round((sum(docLen) / docCount) * 100) / 100;

const inputHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(chunks))
  .update(JSON.stringify(directory))
  .digest("hex")
  .slice(0, 12);
const corpus = {
  meta: { commit: `${overview.meta.commit}+${drill.meta.commit}`, built: inputHash, years: YEARS, chunkCount: chunks.length },
  chunks,
  index: { docCount, avgLen, docLen, postings: sortedPostings },
  directory
};
const output = `${JSON.stringify(corpus)}\n`;

if (process.argv.includes("--check")) {
  const committed = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
  if (committed !== output) {
    console.error("chat-corpus.json is out of date. Run: node scripts/build-ttc-chat-corpus.mjs");
    process.exit(1);
  }
  console.log(`chat-corpus.json is current: ${chunks.length} chunks.`);
} else {
  fs.writeFileSync(outFile, output);
  const tokens = sum(chunks.map((c) => c.tokens));
  const kinds = {};
  for (const c of chunks) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
  console.log(`Wrote ${path.relative(root, outFile)}: ${chunks.length} chunks, ${fmtInt(tokens)} tokens, ${fmtInt(output.length)} bytes, ${Object.keys(sortedPostings).length} terms. ${JSON.stringify(kinds)}`);
}
