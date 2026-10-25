import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { Mode } from "./corpus";
import { resolveEntities } from "./resolve";
import { retrieve } from "./retrieve";
import { CircuitBreaker, complexity, decideRoute, SOL_THRESHOLD } from "./router";

function routeOf(question: string, mode: Mode, allowed = true) {
  const retrieval = retrieve(question, mode, resolveEntities(question, mode), { budget: 3000 });
  const score = complexity(retrieval, question);
  return { score, route: decideRoute({ empty: retrieval.empty, complexity: score, live: retrieval.facets.live, escalationAllowed: () => allowed }) };
}

test("random letters route to none", () => {
  assert.equal(routeOf("asdfgh", "bus").route, "none");
});

test("simple questions route to haiku", () => {
  for (const q of ["Which bus route has the most delay events?", "Compare routes 32 and 52.", "What is k for subway stations?"]) assert.equal(routeOf(q, "bus").route, "haiku", q);
});

test("a five-entity comparison with a year routes to sol", () => {
  const q = "Compare routes 32, 52, 29, 36 and 54 on delay events in 2023. For each route, name the cause with the most events, and explain what the difference means for riders.";
  const { score, route } = routeOf(q, "bus");
  assert.ok(score >= SOL_THRESHOLD, `complexity ${score}`);
  assert.equal(route, "sol");
});

test("a hard question goes to haiku when escalation is not allowed", () => {
  const q = "Compare routes 32, 52, 29, 36 and 54 on delay events in 2023. For each route, name the cause with the most events, and explain what the difference means for riders.";
  assert.equal(routeOf(q, "bus", false).route, "haiku");
});

test("a live question never routes to sol", () => {
  assert.equal(decideRoute({ empty: false, complexity: 6, live: true, escalationAllowed: () => true }), "haiku");
});

test("escalation is checked only for hard questions", () => {
  let calls = 0;
  decideRoute({ empty: false, complexity: 1, live: false, escalationAllowed: () => (calls++, true) });
  assert.equal(calls, 0);
});

test("the traffic file sends 2 or fewer of 200 questions to sol", () => {
  const traffic = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/ttc-chat-traffic.json"), "utf8")) as { items: { question: string; mode: Mode }[] };
  assert.equal(traffic.items.length, 200);
  const sol = traffic.items.filter((item) => routeOf(item.question, item.mode).route === "sol");
  assert.ok(sol.length <= 2, `${sol.length} to sol: ${sol.map((s) => s.question).join(" | ")}`);
  assert.ok(sol.length >= 1, "the hard items reach sol");
});

test("the circuit opens after 3 failures in 60 s and closes after 60 s", () => {
  let t = 0;
  const breaker = new CircuitBreaker(3, 60_000, 60_000, () => t);
  breaker.fail("anthropic");
  t = 10_000;
  breaker.fail("anthropic");
  assert.equal(breaker.isOpen("anthropic"), false);
  t = 20_000;
  breaker.fail("anthropic");
  assert.equal(breaker.isOpen("anthropic"), true);
  assert.equal(breaker.isOpen("openai"), false);
  t = 80_001;
  assert.equal(breaker.isOpen("anthropic"), false);
});

test("old failures leave the window", () => {
  let t = 0;
  const breaker = new CircuitBreaker(3, 60_000, 60_000, () => t);
  breaker.fail("openai");
  breaker.fail("openai");
  t = 61_000;
  breaker.fail("openai");
  assert.equal(breaker.isOpen("openai"), false);
});
