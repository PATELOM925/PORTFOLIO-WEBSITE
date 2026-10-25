import { loadCorpus, type DirectoryEntry, type Mode } from "./corpus";
import { STOPWORDS, SYNONYMS, normalise } from "./text";

export type Resolution = {
  // At most 4 entities. A question routed to Sol can use the extra ones, up to 6 in total.
  entities: DirectoryEntry[];
  extra?: DirectoryEntry[];
  explicitMode: Mode | null;
  fromPrevious: boolean;
};

const MODE_WORDS: Record<string, Mode> = {
  bus: "bus",
  buses: "bus",
  busses: "bus",
  streetcar: "streetcar",
  streetcars: "streetcar",
  tram: "streetcar",
  trams: "streetcar",
  subway: "subway",
  subways: "subway",
  station: "subway",
  stations: "subway",
  train: "subway",
  trains: "subway"
};

// Single-word names that are also common English words. They resolve only when the visitor writes them with a capital letter.
const COMMON_NAMES = new Set(["main", "union", "college", "museum", "king", "queen", "bay", "progress", "express", "york", "sentinel", "nugget", "jones", "dawes", "parliament"]);
const NUMBER_BEFORE = new Set(["top", "first", "last", "rank", "ranked", "k", "under", "over", "than", "about", "past", "at", "around", "within", "n", "p", "of", "from", "since", "every"]);
const NUMBER_AFTER = new Set(["event", "events", "day", "days", "minute", "minutes", "min", "mins", "percent", "pct", "year", "years", "route", "routes", "station", "stations", "hour", "hours", "am", "pm", "time", "times", "delays", "delay", "items", "entities", "worst", "best", "most", "th", "st", "nd", "rd", "x"]);
const FOLLOW_UP = /\b(it|its|that|this|they|them|those|these|there|same|one)\b|\band for\b|\bwhat about\b|\bhow about\b/;

type AliasIndex = { map: Map<string, DirectoryEntry[]>; maxWords: number; names: [string, DirectoryEntry][]; byNumber: Map<string, DirectoryEntry> };
let aliasIndex: AliasIndex | null = null;

function index(): AliasIndex {
  if (aliasIndex) return aliasIndex;
  const map = new Map<string, DirectoryEntry[]>();
  const byNumber = new Map<string, DirectoryEntry>();
  const names: [string, DirectoryEntry][] = [];
  let maxWords = 1;
  for (const entry of loadCorpus().directory) {
    if (entry.scope === "route") byNumber.set(entry.id, entry);
    for (const alias of entry.aliases) {
      const list = map.get(alias) ?? [];
      list.push(entry);
      map.set(alias, list);
      maxWords = Math.max(maxWords, alias.split(" ").length);
      if (!/\d/.test(alias) && alias.replace(/[^a-z]/g, "").length >= 5) names.push([alias, entry]);
    }
  }
  aliasIndex = { map, maxWords, names, byNumber };
  return aliasIndex;
}

export function explicitModeOf(text: string): Mode | null {
  const found = new Set<Mode>();
  for (const word of normalise(text).split(" ")) {
    const mode = MODE_WORDS[word];
    if (mode) found.add(mode);
  }
  if (/\bline [1-6]\b/.test(normalise(text))) found.add("subway");
  return found.size === 1 ? [...found][0] : null;
}

// One entry for each mode: the one with the most events. Then the mode rules.
function choose(candidates: DirectoryEntry[], explicit: Mode | null, hint: Mode): DirectoryEntry[] {
  const best = new Map<Mode, DirectoryEntry>();
  for (const entry of candidates) {
    const current = best.get(entry.mode);
    if (!current || entry.n > current.n) best.set(entry.mode, entry);
  }
  if (explicit && best.has(explicit)) return [best.get(explicit)!];
  // A line name ("bloor-danforth") means the line, not the night bus with the same name.
  const line = candidates.find((e) => e.scope === "line");
  if (line && explicit !== "bus") return [line];
  if (best.has(hint)) return [best.get(hint)!];
  return [...best.values()].sort((a, b) => b.n - a.n).slice(0, 2);
}

// Damerau-Levenshtein distance, stopped early above 1.
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > 1) return false;
  }
  return d[a.length][b.length] <= 1;
}

const QUESTION_WORDS = new Set([
  ...STOPWORDS,
  ...Object.values(SYNONYMS).flat(),
  ...Object.keys(MODE_WORDS),
  "route", "routes", "event", "events", "delay", "delays", "year", "years", "which", "where", "share", "hours", "times", "number", "numbers", "minutes", "month", "months", "weekday", "weekdays", "morning", "evening", "night", "about", "worst", "show", "explain", "tell", "there", "their", "would", "could", "should", "please", "dashboard", "data", "other", "after", "before", "since", "until", "under", "every", "many", "much", "often", "average", "median"
]);

function resolveText(question: string, hint: Mode): { entities: DirectoryEntry[]; explicit: Mode | null } {
  const { map, maxWords, names, byNumber } = index();
  const explicit = explicitModeOf(question);
  const tokens = normalise(question).split(" ").filter(Boolean);
  const used = new Array(tokens.length).fill(false);
  const found: { at: number; entries: DirectoryEntry[] }[] = [];

  // Names and composite aliases ("32 eglinton west", "route 32", "line 1"), longest first.
  for (let i = 0; i < tokens.length; i++) {
    for (let len = Math.min(maxWords, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const candidates = map.get(phrase);
      if (!candidates) continue;
      if (len === 1 && COMMON_NAMES.has(phrase)) {
        const capital = phrase[0].toUpperCase() + phrase.slice(1);
        const next = tokens[i + 1];
        if (!new RegExp(`\\b${capital}\\b`).test(question) && !(next && MODE_WORDS[next])) continue;
      }
      found.push({ at: i, entries: choose(candidates, explicit, hint) });
      for (let k = i; k < i + len; k++) used[k] = true;
      i += len - 1;
      break;
    }
  }

  // Bare route numbers.
  tokens.forEach((token, i) => {
    if (used[i] || !/^\d{1,3}$/.test(token)) return;
    const entry = byNumber.get(token);
    if (!entry) return;
    if (NUMBER_BEFORE.has(tokens[i - 1] ?? "") || NUMBER_AFTER.has(tokens[i + 1] ?? "")) return;
    if (new RegExp(`\\b${token}\\s*%`).test(question)) return;
    found.push({ at: i, entries: [entry] });
    used[i] = true;
  });

  // Typos: only when nothing else matched.
  if (!found.length) {
    for (let i = 0; i < tokens.length && !found.length; i++) {
      for (let len = 3; len >= 1; len--) {
        const window = tokens.slice(i, i + len);
        if (window.length < len || window.some((w) => QUESTION_WORDS.has(w) || /\d/.test(w))) continue;
        const phrase = window.join(" ");
        if (phrase.replace(/[^a-z]/g, "").length < 5) continue;
        const hits = names.filter(([alias]) => withinOne(phrase, alias)).map(([, entry]) => entry);
        if (hits.length) {
          found.push({ at: i, entries: choose(hits, explicit, hint) });
          break;
        }
      }
    }
  }

  const seen = new Set<string>();
  const entities: DirectoryEntry[] = [];
  for (const { entries } of found.sort((a, b) => a.at - b.at)) {
    for (const entry of entries) {
      if (seen.has(entry.file)) continue;
      seen.add(entry.file);
      entities.push(entry);
    }
  }
  return { entities: entities.slice(0, 6), explicit };
}

export function resolveEntities(question: string, modeHint: Mode, previousQuestion?: string): Resolution {
  const first = resolveText(question, modeHint);
  if (first.entities.length || !previousQuestion) return { entities: first.entities.slice(0, 4), extra: first.entities.slice(4), explicitMode: first.explicit, fromPrevious: false };
  const text = normalise(question);
  if (!(FOLLOW_UP.test(text) || question.trim().length < 40)) return { entities: [], explicitMode: first.explicit, fromPrevious: false };
  const previous = resolveText(previousQuestion, first.explicit ?? modeHint);
  return { entities: previous.entities.slice(0, 4), extra: previous.entities.slice(4), explicitMode: first.explicit ?? previous.explicit, fromPrevious: previous.entities.length > 0 };
}
