import assert from "node:assert/strict";
import test from "node:test";
import { ANSWER_CAP, CitationFilter, NONE_TEXT, REFUSAL_TEXT, answerStream, lastSentenceEnd, type AnswerDeps, type AnswerInput } from "./answer";
import type { AnswerLog } from "./log";
import { PROBE_BAD_ID } from "./models";
import { ProviderError, type ProviderEvent, type ProviderRequest, type ProviderStream } from "./providers/types";
import { CircuitBreaker } from "./router";
import { parseSse } from "./sse";

type Script = (request: ProviderRequest) => AsyncGenerator<ProviderEvent>;
const USAGE = { inputTokens: 3000, outputTokens: 200, cacheReadTokens: 2200, cacheWriteTokens: 0 };

function says(...pieces: string[]): Script {
  return async function* () {
    for (const text of pieces) yield { type: "text", text };
    yield { type: "end", stop: "end", usage: USAGE };
  };
}
const fails = (kind: "retryable" | "config", status: number): Script =>
  async function* () {
    throw new ProviderError(kind, kind === "config" ? "config_error" : `http_${status}`, status, "fail");
  };

function provider(scripts: Script[]) {
  const calls: ProviderRequest[] = [];
  const stream: ProviderStream = (request) => {
    calls.push(request);
    const script = scripts[Math.min(calls.length - 1, scripts.length - 1)];
    return script(request);
  };
  return { stream, calls };
}

async function ask(question: string, setup: { anthropic?: Script[]; openai?: Script[]; deps?: Partial<AnswerDeps>; input?: Partial<AnswerInput> } = {}) {
  const anthropic = provider(setup.anthropic ?? [says("No answer.")]);
  const openai = provider(setup.openai ?? [says("No answer.")]);
  const logs: AnswerLog[] = [];
  const deps: AnswerDeps = {
    keys: { anthropic: "a", openai: "o" },
    escalationAllowed: async () => true,
    loadLive: async () => null,
    log: (entry) => logs.push(entry),
    streams: { anthropic: anthropic.stream, openai: openai.stream },
    breaker: new CircuitBreaker(),
    sleep: async () => undefined,
    ...setup.deps
  };
  const input: AnswerInput = { requestId: "r1", question, mode: "bus", history: [], visitor: "v", signal: new AbortController().signal, ...setup.input };
  const text = await new Response(answerStream(input, deps)).text();
  const events = parseSse(text).map((e) => ({ event: e.event, data: JSON.parse(e.data) }));
  const answer = events.filter((e) => e.event === "delta").map((e) => e.data.text).join("");
  const done = events.find((e) => e.event === "done")?.data;
  const error = events.find((e) => e.event === "error")?.data;
  const sources = events.find((e) => e.event === "sources")?.data;
  return { events, answer, done, error, sources, logs, anthropic, openai };
}

test("a Haiku answer streams meta, deltas, sources and done, and drops unknown citations", async () => {
  const r = await ask("How many delay events does 501 Queen have?", { anthropic: [says("501 Queen has 38,955 delay events ", "[entity-streetcar-501, entity-bus-999-fake].", " It is the top streetcar route [made-up-id].")] });
  assert.deepEqual(
    r.events.map((e) => e.event).filter((e, i, a) => a.indexOf(e) === i),
    ["meta", "delta", "sources", "done"]
  );
  assert.equal(r.answer, "501 Queen has 38,955 delay events [entity-streetcar-501]. It is the top streetcar route.");
  assert.deepEqual(r.sources.map((s: { id: string }) => s.id), ["entity-streetcar-501"]);
  assert.equal(r.done.model, "haiku");
  assert.equal(r.done.fallback, false);
  assert.equal(r.done.cacheReadTokens, 2200);
  assert.equal(r.logs[0].ungroundedNumbers, 0);
  assert.equal(r.openai.calls.length, 0);
});

test("the request uses the cached system text and the user turn with chunks", async () => {
  const r = await ask("Compare routes 32 and 52.", { anthropic: [says("Done.")] });
  const call = r.anthropic.calls[0];
  assert.match(call.system, /You are the Ask assistant on TTC Pulse/);
  assert.match(call.messages.at(-1)!.content, /<chunk id="entity-bus-32">/);
  assert.match(call.messages.at(-1)!.content, /<chunk id="entity-bus-52">/);
});

test("Haiku 529 twice goes to Luna with the fallback flag", async () => {
  const r = await ask("Compare routes 32 and 52.", { anthropic: [fails("retryable", 529)], openai: [says("Route 32 has 20,691 events [entity-bus-32].")] });
  assert.equal(r.anthropic.calls.length, 2);
  assert.equal(r.openai.calls.length, 1);
  assert.equal(r.done.model, "luna");
  assert.equal(r.done.fallback, true);
});

test("a Haiku config error does not retry and goes to Luna", async () => {
  const r = await ask("Compare routes 32 and 52.", { anthropic: [fails("config", 401)], openai: [says("Answer.")] });
  assert.equal(r.anthropic.calls.length, 1);
  assert.equal(r.done.model, "luna");
  assert.equal(r.logs[0].errorCode, "config_error");
});

test("when every attempt fails, the error is unavailable", async () => {
  const r = await ask("Compare routes 32 and 52.", { anthropic: [fails("retryable", 500)], openai: [fails("retryable", 503)] });
  assert.equal(r.error.code, "unavailable");
  assert.equal(r.anthropic.calls.length, 2);
  assert.equal(r.openai.calls.length, 2);
});

test("a failure after the first token sends cut and keeps the model", async () => {
  const broken: Script = async function* () {
    yield { type: "text", text: "Route 32 has 20,691 delay events. " };
    throw new ProviderError("retryable", "stream_error", null, "drop");
  };
  const r = await ask("Compare routes 32 and 52.", { anthropic: [broken] });
  assert.equal(r.error.code, "cut");
  assert.equal(r.openai.calls.length, 0);
  assert.match(r.answer, /20,691/);
  assert.equal(r.done.model, "haiku");
});

test("a Haiku refusal ends the request with no fallback", async () => {
  const refuse: Script = async function* () {
    yield { type: "end", stop: "refusal", usage: USAGE };
  };
  const r = await ask("Compare routes 32 and 52.", { anthropic: [refuse] });
  assert.equal(r.error.code, "refusal");
  assert.equal(r.error.message, REFUSAL_TEXT);
  assert.equal(r.openai.calls.length, 0);
});

test("no first token in time counts as a failure and retries", async () => {
  const slow: Script = async function* () {
    await new Promise((resolve) => setTimeout(resolve, 200));
    yield { type: "text", text: "late" };
    yield { type: "end", stop: "end", usage: USAGE };
  };
  const r = await ask("Compare routes 32 and 52.", { anthropic: [slow, says("On time.")], deps: { firstTokenMs: 20, retryFirstTokenMs: 1000 } });
  assert.equal(r.anthropic.calls.length, 2);
  assert.equal(r.answer, "On time.");
  assert.ok(r.anthropic.calls[0].signal.aborted, "the slow attempt is aborted");
});

test("a hard question goes to Sol, and a Sol failure tries Haiku once, then Luna", async () => {
  const q = "Compare routes 32, 52, 29, 36 and 54 on delay events in 2023. For each route, name the cause with the most events, and explain what the difference means for riders.";
  const ok = await ask(q, { openai: [says("Sol answer.")] });
  assert.equal(ok.done.route, "sol");
  assert.equal(ok.done.model, "sol");
  assert.match(ok.openai.calls[0].messages.at(-1)!.content, /<chunk id="entity-bus-54">/, "Sol gets the fifth route");
  const failing = await ask(q, { openai: [fails("retryable", 500), says("Luna answer.")], anthropic: [fails("retryable", 500)] });
  assert.equal(failing.anthropic.calls.length, 1);
  assert.equal(failing.done.model, "luna");
  const noEscalation = await ask(q, { anthropic: [says("Haiku answer.")], deps: { escalationAllowed: async () => false } });
  assert.equal(noEscalation.done.route, "haiku");
});

test("random letters get the index answer and no model call", async () => {
  const r = await ask("asdfgh qwerty");
  assert.equal(r.answer, NONE_TEXT);
  assert.equal(r.done.model, "index");
  assert.equal(r.anthropic.calls.length + r.openai.calls.length, 0);
});

test("a long answer stops at the last sentence end before 1,600 chars", async () => {
  const sentence = "Route 32 has 20,691 delay events in the data. ";
  const r = await ask("Compare routes 32 and 52.", { anthropic: [says(...new Array(60).fill(sentence))] });
  assert.ok(r.answer.length <= ANSWER_CAP);
  assert.match(r.answer, /\.$/);
  assert.equal(r.done.truncated, true);
  assert.equal(r.logs[0].outcome, "truncated");
});

test("the probe sends the bad id and surfaces a config error with no fallback", async () => {
  const r = await ask("Compare routes 32 and 52.", { anthropic: [fails("config", 404)], input: { forceRoute: "probe-anthropic" } });
  assert.equal(r.anthropic.calls[0].modelId, PROBE_BAD_ID);
  assert.equal(r.error.code, "config_error");
  assert.equal(r.openai.calls.length, 0);
});

test("a forced Luna route calls only Luna", async () => {
  const r = await ask("Compare routes 32 and 52.", { openai: [says("Luna.")], input: { forceRoute: "luna" } });
  assert.equal(r.done.model, "luna");
  assert.equal(r.anthropic.calls.length, 0);
});

test("an open Anthropic circuit skips Haiku", async () => {
  const breaker = new CircuitBreaker();
  for (let i = 0; i < 3; i++) breaker.fail("anthropic");
  const r = await ask("Compare routes 32 and 52.", { openai: [says("Luna.")], deps: { breaker } });
  assert.equal(r.anthropic.calls.length, 0);
  assert.equal(r.done.model, "luna");
});

test("CitationFilter joins brackets across deltas and keeps text brackets", () => {
  const filter = new CitationFilter(new Set(["entity-bus-32"]));
  const out = filter.push("A [entity-") + filter.push("bus-32]. B [see note]. C [fake-id].") + filter.flush();
  assert.equal(out, "A [entity-bus-32]. B [see note]. C.");
  assert.deepEqual(filter.cited, ["entity-bus-32"]);
});

test("lastSentenceEnd counts a citation after the full stop", () => {
  assert.equal(lastSentenceEnd("One. [a-1] Two", 100), 10);
  assert.equal(lastSentenceEnd("One. Two three", 3), -1);
});

test("at the daily cap, the answer is the daily limit error and no model is called", async () => {
  const r = await ask("How many delay events does 501 Queen have?", { anthropic: [says("Never sent.")], deps: { dailyAllowed: async () => false } });
  assert.equal(r.error.code, "daily_limit");
  assert.equal(r.anthropic.calls.length, 0);
  assert.equal(r.openai.calls.length, 0);
  assert.equal(r.logs[0].errorCode, "daily_limit");
});

test("the index answer does not use the daily cap", async () => {
  let asked = 0;
  const r = await ask("asdfgh qwerty zxcv", { deps: { dailyAllowed: async () => (asked++, false) } });
  assert.equal(asked, 0);
  assert.equal(r.error, undefined);
});

test("at the daily cap, a hard question does not take a Sol unit", async () => {
  let solAsked = 0;
  const r = await ask("Compare routes 32 and 52 by cause, severity and score in 2023 and 2024, and explain why.", {
    deps: { dailyAllowed: async () => false, escalationAllowed: async () => (solAsked++, true) }
  });
  assert.equal(r.error.code, "daily_limit");
  assert.equal(solAsked, 0);
  // The same question asks for Sol when the day is not capped, so the check above means something.
  await ask("Compare routes 32 and 52 by cause, severity and score in 2023 and 2024, and explain why.", {
    openai: [says("Sol answer.")],
    deps: { dailyAllowed: async () => true, escalationAllowed: async () => (solAsked++, true) }
  });
  assert.equal(solAsked, 1);
});
