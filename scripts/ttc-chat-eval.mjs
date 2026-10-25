// Runs the TTC Pulse Ask eval against a deployed URL (a preview version, never production by default).
// Usage: npm run eval:chat -- --base https://<preview>.workers.dev [--only e01,e02] [--skip-cells] [--key-file /tmp/ttc-chat-eval-key]
// The eval key header skips Turnstile and the visitor limit. The global limit still applies, so items run one at a time.
import fs from "node:fs";
import { MODELS, costUsd } from "../src/lib/chat/models.ts";
import { numbersIn } from "../src/lib/chat/text.ts";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = (arg("base", process.env.CHAT_EVAL_URL) ?? "").replace(/\/$/, "");
if (!base) {
  console.error("Give the preview URL: --base https://...");
  process.exit(2);
}
const key = fs.readFileSync(arg("key-file", "/tmp/ttc-chat-eval-key"), "utf8").trim();
const only = arg("only", "")?.split(",").filter(Boolean) ?? [];
const skipCells = args.includes("--skip-cells");
const evalSet = JSON.parse(fs.readFileSync(new URL("./ttc-chat-eval.json", import.meta.url), "utf8"));

async function ask(item, route) {
  const started = performance.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${base}/api/ttc-pulse/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-chat-eval": key, ...(route ? { "x-chat-eval-route": route } : {}) },
      body: JSON.stringify({ question: item.question, mode: item.mode, history: item.history })
    });
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    if (!response.ok) return { status: response.status, error: { code: `http_${response.status}`, message: await response.text() }, answer: "", sources: [], wallMs: performance.now() - started };
    const text = await response.text();
    const out = { status: 200, answer: "", sources: [], meta: null, done: null, error: null, wallMs: performance.now() - started };
    for (const block of text.split(/\n\n/)) {
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (!event || !data) continue;
      const value = JSON.parse(data);
      if (event === "delta") out.answer += value.text;
      else if (event === "sources") out.sources = value;
      else if (event === "meta") out.meta = value;
      else if (event === "done") out.done = value;
      else if (event === "error") out.error = value;
    }
    return out;
  }
  return { status: 429, error: { code: "rate" }, answer: "", sources: [], wallMs: performance.now() - started };
}

function grade(item, r) {
  const e = item.expect;
  const fails = [];
  const answer = r.answer ?? "";
  const ids = (r.sources ?? []).map((s) => s.id);
  if (r.error && !(e.route === "none")) fails.push(`error ${r.error.code}`);
  const numbers = new Set(numbersIn(answer.replace(/\[[^\]]*\]/g, " ")));
  for (const n of e.numbers ?? []) if (!numbers.has(n)) fails.push(`missing number ${n}`);
  for (const s of e.contains ?? []) if (!answer.toLowerCase().includes(s.toLowerCase())) fails.push(`missing "${s}"`);
  if (e.pattern && !new RegExp(e.pattern, "i").test(answer)) fails.push(`no match /${e.pattern}/`);
  if (e.mustNot && new RegExp(e.mustNot, "i").test(answer)) fails.push(`matched /${e.mustNot}/`);
  if (e.cite && !e.cite.some((id) => ids.includes(id))) fails.push(`cites ${ids.join(" ") || "nothing"}, wanted one of ${e.cite.join(" ")}`);
  if (e.citeAll) for (const id of e.citeAll) if (!ids.includes(id)) fails.push(`does not cite ${id}`);
  if (e.citePrefix && !ids.some((id) => id.startsWith(e.citePrefix))) fails.push(`no ${e.citePrefix}* citation`);
  if (e.route && r.done?.route !== e.route) fails.push(`route ${r.done?.route}, wanted ${e.route}`);
  const style = /[–—]/.test(answer) ? ["dash"] : [];
  return { pass: fails.length === 0, fails, style };
}

const pct = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};
const usage = {};
const addUsage = (r) => {
  const d = r.done;
  if (!d?.model || !MODELS[d.model]) return;
  const u = (usage[d.model] ??= { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, usd: 0 });
  u.requests += 1;
  u.inputTokens += d.inputTokens;
  u.outputTokens += d.outputTokens;
  u.cacheReadTokens += d.cacheReadTokens;
  u.cacheWriteTokens += d.cacheWriteTokens ?? 0;
  u.usd += costUsd(d.model, { inputTokens: d.inputTokens, outputTokens: d.outputTokens, cacheReadTokens: d.cacheReadTokens, cacheWriteTokens: d.cacheWriteTokens ?? 0 });
};

const results = [];
async function runSet(name, items) {
  for (const item of items) {
    if (only.length && !only.includes(item.id)) continue;
    const r = await ask(item);
    addUsage(r);
    const g = grade(item, r);
    results.push({ set: name, id: item.id, question: item.question, ...g, route: r.done?.route, model: r.done?.model, fallback: r.done?.fallback, latencyMs: r.done?.latencyMs, firstTokenMs: r.done?.firstTokenMs, wallMs: Math.round(r.wallMs), cacheRead: r.done?.cacheReadTokens, ungrounded: r.done?.ungroundedNumbers, outcome: r.done?.outcome, attempts: r.meta?.attempts, inputTokens: r.done?.inputTokens, outputTokens: r.done?.outputTokens, sources: r.sources.map((s) => s.id), answer: r.answer, error: r.error });
    console.log(`${g.pass ? "PASS" : "FAIL"} ${item.id} ${r.done?.model ?? "-"} ${r.done?.latencyMs ?? "-"} ms ${g.fails.join("; ")}${g.style.length ? " [style: dash]" : ""}`);
  }
}

await runSet("items", evalSet.items);
await runSet("adversarial", evalSet.adversarial);

const cells = [];
if (!skipCells && !only.length) {
  // The cache pair: the same request twice, one after the other. The second must read the cache.
  const pairItem = evalSet.items.find((i) => i.id === "e10");
  const first = await ask(pairItem, "haiku");
  const second = await ask(pairItem, "haiku");
  addUsage(first);
  addUsage(second);
  cells.push({ cell: "cache pair", pass: (second.done?.cacheReadTokens ?? 0) > 0, detail: `first read ${first.done?.cacheReadTokens} write ${first.done?.cacheWriteTokens}, second read ${second.done?.cacheReadTokens}` });
  // Forced cells: each model id must answer as itself.
  const compare = evalSet.items.find((i) => i.id === "e03");
  for (const route of ["luna", "sol"]) {
    const r = await ask(compare, route);
    addUsage(r);
    const g = grade(compare, r);
    // The cell checks the model id. The e03 grade is for information.
    cells.push({ cell: `forced ${route}`, pass: r.done?.model === route && !r.done?.fallback && !r.error && r.answer.length > 0, detail: `model ${r.done?.model}, ${r.done?.latencyMs} ms, in ${r.done?.inputTokens} out ${r.done?.outputTokens} cached ${r.done?.cacheReadTokens}. e03 grade: ${g.pass ? "pass" : g.fails.join("; ")}`, answer: r.answer });
  }
  // Probes: a bad id must come back as a config error, not as an answer from another model.
  for (const route of ["probe-anthropic", "probe-openai"]) {
    const r = await ask(compare, route);
    cells.push({ cell: route, pass: r.error?.code === "config_error" && !r.answer, detail: `error ${r.error?.code}, attempts ${JSON.stringify(r.error?.attempts ?? r.meta?.attempts ?? [])}` });
  }
}

const items = results.filter((r) => r.set === "items");
const adversarial = results.filter((r) => r.set === "adversarial");
const haiku = results.filter((r) => r.model === "haiku");
const summary = {
  base,
  items: `${items.filter((r) => r.pass).length}/${items.length}`,
  adversarial: `${adversarial.filter((r) => r.pass).length}/${adversarial.length}`,
  haikuLatencyMs: { p50: pct(haiku.map((r) => r.latencyMs), 50), p90: pct(haiku.map((r) => r.latencyMs), 90) },
  haikuFirstTokenMs: { p50: pct(haiku.map((r) => r.firstTokenMs), 50), p90: pct(haiku.map((r) => r.firstTokenMs), 90) },
  routes: results.reduce((acc, r) => ((acc[`${r.route}/${r.model}`] = (acc[`${r.route}/${r.model}`] ?? 0) + 1), acc), {}),
  fallbacks: results.filter((r) => r.fallback).length,
  ungroundedNumbers: results.reduce((sum, r) => sum + (r.ungrounded ?? 0), 0),
  styleDashes: results.filter((r) => r.style.length).length,
  cells,
  usage,
  usd: Object.values(usage).reduce((sum, u) => sum + u.usd, 0)
};
const file = `/tmp/ttc-chat-eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(file, JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Full results: ${file}`);

const passed =
  items.filter((r) => r.pass).length >= Math.min(38, items.length) &&
  adversarial.every((r) => r.pass) &&
  (summary.haikuLatencyMs.p50 ?? 0) < 4000 &&
  cells.every((c) => c.pass);
process.exit(passed ? 0 : 1);
