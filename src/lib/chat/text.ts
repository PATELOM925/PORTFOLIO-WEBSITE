// Text helpers for the TTC Pulse Ask chat.
// The corpus build script imports this file too, so index tokens and query tokens come from the same code.
// Keep this file free of imports and of TypeScript-only runtime syntax: Node loads it with type stripping.

// Each canonical term and the words that map to it. The canonical term itself maps to itself.
export const SYNONYMS: Record<string, string[]> = {
  delay: ["delay", "delays", "delayed", "late", "lateness", "unreliable"],
  rank: ["rank", "ranks", "ranked", "ranking", "worst", "most", "highest", "top", "biggest", "best", "fewest", "lowest", "least"],
  compare: ["compare", "compared", "comparison", "versus", "vs", "difference", "than"],
  peak: ["busiest", "peak", "when"],
  cause: ["cause", "causes", "why", "reason", "reasons"],
  live: ["now", "today", "currently", "current", "live", "right-now", "this-morning", "tonight", "alert", "alerts", "closure", "closures", "detour", "detours"],
  method: ["score", "scores", "scoring", "rank", "ranks", "ranked", "ranking", "adjusted", "raw", "k", "weight", "weighted", "credibility"],
  quality: ["missing", "unmatched", "quality", "checksum", "checksums"]
};

// Phrases that become one word before the split.
const PHRASES: [RegExp, string][] = [
  [/\bright now\b/g, "right-now"],
  [/\bthis morning\b/g, "this-morning"]
];

const WORD_TO_TERMS: Record<string, string[]> = {};
for (const [term, words] of Object.entries(SYNONYMS)) {
  for (const word of words) {
    const list = WORD_TO_TERMS[word] ?? (WORD_TO_TERMS[word] = []);
    if (!list.includes(term)) list.push(term);
  }
}

export const STOPWORDS = new Set(
  "a an and are as at be by did do does for from had has have how i in is it its me my of on or our the this that to was were what which who will with you your there their they them about can".split(" ")
);

// Lowercase, keep letters, digits and hyphens, collapse spaces. "st." becomes "st" and "&" becomes "and".
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s-+|-+\s|^-+|-+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A light stemmer: "delays" and "delay" give the same stem, and so do "causes" and "cause".
export function stem(word: string): string {
  let w = word;
  if (/^\d+$/.test(w)) return w;
  if (w.length > 4) {
    if (w.endsWith("ing")) w = w.slice(0, -3);
    else if (w.endsWith("ed")) w = w.slice(0, -2);
    else if (w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  }
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

// Words of the normalised text, with the phrases joined. Hyphenated words also give their parts.
export function words(text: string): string[] {
  let t = normalise(text);
  for (const [pattern, joined] of PHRASES) t = t.replace(pattern, joined);
  const out: string[] = [];
  for (const raw of t.split(" ")) {
    if (!raw) continue;
    out.push(raw);
    if (raw.includes("-") && !WORD_TO_TERMS[raw]) for (const part of raw.split("-")) if (part) out.push(part);
  }
  return out;
}

// Index and query tokens. Synonyms become their canonical terms. Other words are stemmed. Stopwords are dropped.
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const word of words(text)) {
    const terms = WORD_TO_TERMS[word];
    if (terms) {
      for (const term of terms) out.push(term);
      continue;
    }
    if (STOPWORDS.has(word) || word.includes("-")) continue;
    out.push(stem(word));
  }
  return out;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

const TAGS = /<\/?\s*(data|question|chunk|context)\b[^>]*>?/gi;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

// The visitor's text. Remove the prompt tags and control characters. Keep the rest.
export function sanitiseUser(text: string, max = 500): string {
  return text.replace(CONTROL, " ").replace(TAGS, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Third-party alert text: no angle brackets, no backticks, no control characters, at most 140 chars.
export function sanitiseAlert(text: string): string {
  return text.replace(CONTROL, " ").replace(/[<>`"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

// For the logs: no emails, no phone numbers, no long digit runs. At most 200 chars.
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[x]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[x]")
    .replace(/\d{6,}/g, "[x]")
    .slice(0, 200);
}

// Number formats. The corpus and the eval grader use the same functions.
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtScore = (n: number) => n.toFixed(3);
export const fmtPct = (n: number) => `${n.toFixed(1)}%`;
export const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

// Every number in a text, without thousands commas. "20,691" gives "20691". "2.688" stays.
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const value = match[0].replace(/,(?=\d{3}\b)/g, "").replace(/,$/, "");
    if (/^\d+(\.\d+)?$/.test(value)) out.push(value);
  }
  return out;
}
