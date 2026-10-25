import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chunkById, loadCorpus, type Mode } from "./corpus";
import { resolveEntities } from "./resolve";
import { retrieve } from "./retrieve";
import { numbersIn, tokenize } from "./text";

type Item = {
  id: string;
  question: string;
  mode: Mode;
  history?: { role: string; text: string }[];
  expect: { numbers?: string[]; cite?: string[]; citeAll?: string[]; citePrefix?: string; route?: string };
};
const EVAL = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/ttc-chat-eval.json"), "utf8")) as { items: Item[]; adversarial: Item[] };

function run(item: Item) {
  const previous = item.history?.filter((h) => h.role === "user").at(-1)?.text;
  const resolution = resolveEntities(item.question, item.mode, previous);
  return retrieve(item.question, item.mode, resolution, { budget: 3000 });
}

test("the eval set has 43 items and 12 adversarial items", () => {
  assert.equal(EVAL.items.length, 43);
  assert.equal(EVAL.adversarial.length, 12);
});

for (const item of EVAL.items) {
  test(`${item.id} retrieves an expected chunk: ${item.question}`, () => {
    const result = run(item);
    assert.equal(result.empty, false);
    const ids = result.chunks.map((c) => c.id);
    if (item.expect.cite) assert.ok(item.expect.cite.some((id) => ids.includes(id)), `${ids.join(" ")} has none of ${item.expect.cite.join(" ")}`);
    if (item.expect.citeAll) for (const id of item.expect.citeAll) assert.ok(ids.includes(id), `${id} missing from ${ids.join(" ")}`);
    if (item.expect.citePrefix) assert.ok(ids.some((id) => id.startsWith(item.expect.citePrefix!)), `no ${item.expect.citePrefix} chunk`);
    assert.ok(result.contextTokens <= 3000);
  });

  test(`${item.id} expected numbers are in the retrieved chunks`, () => {
    if (!item.expect.numbers) return;
    const result = run(item);
    const numbers = new Set(result.chunks.flatMap((c) => numbersIn(c.text)));
    for (const n of item.expect.numbers) assert.ok(numbers.has(n), `${n} is not in ${result.chunks.map((c) => c.id).join(" ")}`);
  });
}

test("the expected cited chunks exist in the corpus", () => {
  for (const item of [...EVAL.items, ...EVAL.adversarial]) {
    for (const id of [...(item.expect.cite ?? []), ...(item.expect.citeAll ?? [])]) assert.ok(chunkById(id), `${item.id}: ${id}`);
  }
});

test("random letters and off-topic questions return empty", () => {
  for (const question of ["asdfgh", "asdfgh qwerty zxcv", "What is the capital of France?"]) {
    const result = retrieve(question, "bus", resolveEntities(question, "bus"), { budget: 3000 });
    assert.equal(result.empty, true, question);
    assert.equal(result.chunks.length, 0);
  }
});

test("the index tokens match the query tokenizer", () => {
  const corpus = loadCorpus();
  const doc = corpus.byId.get("overview-bus")!;
  const chunk = corpus.chunks[doc];
  for (const token of new Set(tokenize(`${chunk.label} ${chunk.text}`))) {
    assert.ok(corpus.index.postings[token]?.some(([d]) => d === doc), `token ${token} is not indexed for ${chunk.id}`);
  }
});

test("a live chunk goes last and counts toward the budget", () => {
  const live = { id: "live-subway-1432", kind: "live" as const, mode: "subway" as const, label: "Live feed", href: "#view=live&mode=subway", text: "x".repeat(300), tokens: 100, untrusted: true };
  const question = "Are there any subway alerts right now?";
  const result = retrieve(question, "subway", resolveEntities(question, "subway"), { budget: 3000, live });
  assert.equal(result.chunks.at(-1)?.id, live.id);
  assert.ok(result.facets.live);
});

test("the Sol budget allows more context", () => {
  const question = "Compare routes 32, 52, 29 and 36 on delay events in 2023.";
  const small = retrieve(question, "bus", resolveEntities(question, "bus"), { budget: 600 });
  const large = retrieve(question, "bus", resolveEntities(question, "bus"), { budget: 4500 });
  assert.ok(small.contextTokens <= 600);
  assert.ok(large.chunks.length >= small.chunks.length);
});

test("an on-time question gets the fewest and the most reliable lists, not the time chunk", () => {
  const question = "Which station gets the buses on time the most?";
  const result = retrieve(question, "subway", resolveEntities(question, "subway"), { budget: 3000 });
  const ids = result.chunks.map((c) => c.id);
  assert.equal(result.facets.time, false);
  assert.equal(result.facets.reliable, true);
  assert.ok(ids.includes("rank-subway-events-all"), ids.join(" "));
  assert.ok(ids.includes("rank-subway-score-adjusted"), ids.join(" "));
  assert.ok(!ids.includes("time-subway"), ids.join(" "));
});
