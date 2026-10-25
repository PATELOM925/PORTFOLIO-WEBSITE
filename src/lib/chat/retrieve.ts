import { loadCorpus, type Chunk, type DirectoryEntry, type Mode } from "./corpus";
import type { Resolution } from "./resolve";
import { normalise, tokenize } from "./text";

export type Facets = {
  years: number[];
  rank: boolean;
  cause: boolean;
  time: boolean;
  metric: boolean;
  compare: boolean;
  live: boolean;
  method: boolean;
  quality: boolean;
  reliable: boolean;
};

export type Retrieval = {
  chunks: Chunk[];
  resolved: DirectoryEntry[];
  facets: Facets;
  effectiveMode: Mode;
  topScore: number;
  topChunkId: string;
  empty: boolean;
  contextTokens: number;
  ms: number;
};

// Calibrated on the eval set: off-topic questions score under 2, real questions score over 4.
export const FLOOR = 2.0;
const K1 = 1.2;
const B = 0.75;

const CAUSE_WORDS = /\b(mechanical|operator|garage|investigation|diversion|emergency|security|collision|disorderly|injured|ill|alarm|passenger|speed|overspeeding|weather|fire|medical)\b/;
const TIME_WORDS = /\b(hour|hours|time|times|day|days|weekday|weekdays|weekend|weekends|month|months|monthly|morning|evening|night|nights|rush|season|winter|summer|spring|fall|autumn|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|year over year|trend|by year)\b/;
// "On time", "reliable" and "best" have no direct measure. The answer uses the fewest delay events and the lowest adjusted score.
const RELIABLE_WORDS = /\b(on time|on-time|ontime|punctual|reliable|reliability|dependable|fewest|least|lowest|best|smoothest)\b/;
const METRIC_WORDS = /\b(minute|minutes|median|p90|percentile|severity|long|longest|share|percent|percentage|how many|count|total|number|average|rate)\b/;

export function facetsOf(question: string, tokens = tokenize(question)): Facets {
  const text = normalise(question);
  const years = [...new Set([...text.matchAll(/\b(201[4-9]|202[0-6])\b/g)].map((m) => Number(m[1])))].slice(0, 2);
  const has = (term: string) => tokens.includes(term);
  const timeText = text.replace(/\bon[ -]?time\b/g, " ");
  return {
    years,
    rank: has("rank"),
    cause: has("cause") || CAUSE_WORDS.test(text),
    time: has("peak") || TIME_WORDS.test(timeText),
    metric: METRIC_WORDS.test(text),
    compare: has("compare"),
    live: has("live"),
    method: has("method"),
    quality: has("quality"),
    reliable: RELIABLE_WORDS.test(text)
  };
}

function bm25(queryTokens: string[]): Float64Array {
  const { index, chunks } = loadCorpus();
  const scores = new Float64Array(chunks.length);
  const n = index.docCount;
  for (const term of new Set(queryTokens)) {
    const list = index.postings[term];
    if (!list) continue;
    const idf = Math.log(1 + (n - list.length + 0.5) / (list.length + 0.5));
    for (const [doc, tf] of list) {
      const norm = tf + K1 * (1 - B + (B * index.docLen[doc]) / index.avgLen);
      scores[doc] += (idf * tf * (K1 + 1)) / norm;
    }
  }
  return scores;
}

const GROUP: Record<Chunk["kind"], number> = { entity: 0, rank: 1, overview: 2, time: 2, causes: 2, quality: 2, method: 2, limits: 2, post: 3, live: 4 };
const GROUP_MAX = [6, 3, 4, 2, 1];

export function retrieve(question: string, modeHint: Mode, resolution: Resolution, opts: { budget: number; live?: Chunk | null; extraEntities?: boolean }): Retrieval {
  const started = Date.now();
  const corpus = loadCorpus();
  const tokens = tokenize(question);
  const facets = facetsOf(question, tokens);
  const resolved = opts.extraEntities ? [...resolution.entities, ...(resolution.extra ?? [])] : resolution.entities;
  const modes = new Set(resolved.map((e) => e.mode));
  const effectiveMode: Mode = resolution.explicitMode ?? (modes.size === 1 ? [...modes][0] : modeHint);

  // The resolver already found the entities. Their numbers and names would only add noise to BM25.
  const entityTokens = new Set(resolved.flatMap((e) => tokenize(`${e.id} ${e.name}`)));
  // In "on time", the word "time" is not about the hour or the day, so it must not pull in the time chunk.
  const onTime = /\bon[ -]?time\b/i.test(question);
  const raw = bm25(tokens.filter((t) => !entityTokens.has(t) && !(onTime && t === "tim")));
  let topScore = 0;
  let topIndex = -1;
  raw.forEach((s, i) => {
    if (s > topScore) {
      topScore = s;
      topIndex = i;
    }
  });

  // Boosts.
  const score = Float64Array.from(raw);
  const forced = new Set<number>();
  const id = (name: string) => corpus.byId.get(name);
  corpus.chunks.forEach((chunk, i) => {
    if (chunk.mode === effectiveMode) score[i] *= 1.25;
    if (facets.method && chunk.kind === "method") score[i] *= 2;
  });
  for (const entity of resolved) forced.add(entity.chunk);
  const force = (name: string) => {
    const i = id(name);
    if (i !== undefined) forced.add(i);
  };
  const rankModes = new Set<Mode>([effectiveMode, ...modes]);
  if ((facets.rank || facets.reliable) && !resolved.length) {
    for (const mode of rankModes) {
      if (facets.reliable && !facets.years.length) {
        // Both chunks list the top and the bottom, so the model can answer "most" and "least" reliable.
        force(`rank-${mode}-events-all`);
        force(`rank-${mode}-score-adjusted`);
      } else if (facets.method) {
        force(`rank-${mode}-score-raw`);
        force(`rank-${mode}-score-adjusted`);
      } else if (facets.years.length) for (const year of facets.years) force(`rank-${mode}-events-${year}`);
      else if (!facets.cause && !facets.time) force(`rank-${mode}-events-all`);
    }
  }
  if (!resolved.length) {
    if (facets.cause) force(`causes-${effectiveMode}`);
    if (facets.time) force(`time-${effectiveMode}`);
    if (facets.metric && !facets.rank) force(`overview-${effectiveMode}`);
  }
  if (facets.quality) force("quality-linkage");
  if (facets.method && facets.rank && resolved.length) {
    const i = id(`rank-${effectiveMode}-score-adjusted`);
    if (i !== undefined) score[i] *= 2;
  }
  // Year rank chunks enter only when the question names the year. Other rank chunks need the rank or method facet.
  const allowed = (chunk: Chunk, i: number) => {
    if (forced.has(i)) return true;
    if (chunk.kind === "entity") return false;
    if (chunk.kind === "rank") return chunk.id.includes("-score-") ? facets.method : chunk.id.endsWith("-events-all") && facets.rank;
    return true;
  };

  const empty = !forced.size && !facets.live && topScore < FLOOR;
  if (empty) {
    return { chunks: [], resolved, facets, effectiveMode, topScore, topChunkId: "", empty, contextTokens: 0, ms: Date.now() - started };
  }

  // Candidates: forced chunks first, then the best of each group. Entity chunks enter only when resolved.
  const order = [...score.keys()].filter((i) => score[i] > 0 && allowed(corpus.chunks[i], i)).sort((a, b) => score[b] - score[a]);
  const best = order.length ? score[order[0]] : 0;
  const picked: Chunk[][] = [[], [], [], [], []];
  const take = (i: number) => {
    const chunk = corpus.chunks[i];
    const group = picked[GROUP[chunk.kind]];
    if (group.some((c) => c.id === chunk.id)) return;
    group.push(chunk);
  };
  // Forced chunks keep the order of the resolver.
  for (const entity of resolved) take(entity.chunk);
  for (const i of forced) take(i);
  for (const i of order) {
    const chunk = corpus.chunks[i];
    const group = GROUP[chunk.kind];
    if (picked[group].length >= GROUP_MAX[group]) continue;
    if (score[i] < best * (resolved.length ? 0.5 : 0.35)) break;
    // Chunks for another mode only when nothing in the question points away from the effective mode.
    if (chunk.mode !== "all" && chunk.mode !== effectiveMode && !modes.has(chunk.mode)) continue;
    take(i);
  }
  if (opts.live) picked[4].push(opts.live);

  const chunks: Chunk[] = [];
  let contextTokens = 0;
  for (const group of picked) {
    for (const chunk of group) {
      if (contextTokens + chunk.tokens > opts.budget) continue;
      chunks.push(chunk);
      contextTokens += chunk.tokens;
    }
  }
  return {
    chunks,
    resolved,
    facets,
    effectiveMode,
    topScore,
    topChunkId: chunks[0]?.id ?? (topIndex >= 0 ? corpus.chunks[topIndex].id : ""),
    empty: false,
    contextTokens,
    ms: Date.now() - started
  };
}
