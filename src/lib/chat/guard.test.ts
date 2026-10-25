import assert from "node:assert/strict";
import test from "node:test";
import { MemoryLimiter, checkLimits, escalationAllowed, isEvalRequest, validateBody, verifyTurnstile, visitorKey } from "./guard";
import { ungroundedNumbers } from "./log";
import { chunkById } from "./corpus";
import { redact } from "./text";

const body = (value: unknown) => JSON.stringify(value);

test("validateBody accepts a normal question and trims it", () => {
  const result = validateBody(body({ question: "  Which bus route is worst?  ", mode: "bus" }));
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.body.question, "Which bus route is worst?");
});

test("validateBody rejects bad input with 400", () => {
  const cases: unknown[] = [
    { question: "hi", mode: "bus" },
    { question: "x".repeat(501), mode: "bus" },
    { question: "Which route?", mode: "ferry" },
    { question: "!!!!!!!!!!!!??????", mode: "bus" },
    { question: "Which route?", mode: "bus", history: new Array(5).fill({ role: "user", text: "a" }) },
    { question: "Which route?", mode: "bus", history: [{ role: "system", text: "a" }] },
    { question: "Which route?", mode: "bus", history: [{ role: "user", text: "a".repeat(601) }] }
  ];
  for (const c of cases) {
    const result = validateBody(body(c));
    assert.equal(result.ok, false, JSON.stringify(c).slice(0, 60));
    if (!result.ok) assert.equal(result.status, 400);
  }
  assert.equal(validateBody("not json").ok, false);
  assert.equal(validateBody(body({ question: "a".repeat(400), mode: "bus", pad: "x".repeat(9000) })).ok, false);
});

test("visitorKey is 16 hex chars and changes with the day", async () => {
  const a = await visitorKey("1.2.3.4", "salt", new Date("2026-10-25T10:00:00Z"));
  const b = await visitorKey("1.2.3.4", "salt", new Date("2026-10-25T23:00:00Z"));
  const c = await visitorKey("1.2.3.4", "salt", new Date("2026-10-26T01:00:00Z"));
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.doesNotMatch(a, /1\.2\.3\.4/);
});

test("the memory limiter allows 8 in a minute and refills", async () => {
  let t = 0;
  const limiter = new MemoryLimiter(8, 60_000, () => t);
  for (let i = 0; i < 8; i++) assert.ok((await limiter.limit({ key: "v" })).success);
  assert.equal((await limiter.limit({ key: "v" })).success, false);
  assert.ok((await limiter.limit({ key: "other" })).success);
  t = 7_500;
  assert.ok((await limiter.limit({ key: "v" })).success);
});

test("checkLimits uses the bindings when they exist", async () => {
  const deny = { limit: async () => ({ success: false }) };
  const allow = { limit: async () => ({ success: true }) };
  const visitorDenied = await checkLimits({ CHAT_VISITOR_LIMIT: deny, CHAT_GLOBAL_LIMIT: allow }, "v", { skipVisitor: false });
  assert.equal(visitorDenied.ok, false);
  const evalSkips = await checkLimits({ CHAT_VISITOR_LIMIT: deny, CHAT_GLOBAL_LIMIT: allow }, "v", { skipVisitor: true });
  assert.equal(evalSkips.ok, true);
  assert.equal(await escalationAllowed({ CHAT_ESCALATE_LIMIT: allow, CHAT_ESCALATE_VISITOR_LIMIT: deny }, "v"), false);
  assert.equal(await escalationAllowed({ CHAT_ESCALATE_LIMIT: allow, CHAT_ESCALATE_VISITOR_LIMIT: allow }, "v"), true);
});

test("Turnstile is skipped with no secret and fails with no token", async () => {
  assert.equal(await verifyTurnstile("t", undefined, "1.2.3.4"), "skipped");
  assert.equal(await verifyTurnstile(undefined, "secret", "1.2.3.4"), "failed");
  const ok = (async () => Response.json({ success: true })) as unknown as typeof fetch;
  assert.equal(await verifyTurnstile("t", "secret", "1.2.3.4", ok), "ok");
});

test("isEvalRequest needs the exact key", () => {
  assert.ok(isEvalRequest("abc123", "abc123"));
  assert.ok(!isEvalRequest("abc124", "abc123"));
  assert.ok(!isEvalRequest("abc123", undefined));
  assert.ok(!isEvalRequest(null, "abc123"));
});

test("redact removes emails, phone numbers and long digit runs", () => {
  assert.equal(redact("mail me at a.b@example.com or +1 437-212-3702, id 1234567"), "mail me at [x] or [x], id [x]");
});

test("ungroundedNumbers counts numbers that are in no sent chunk", () => {
  const chunk = chunkById("entity-bus-32")!;
  assert.equal(ungroundedNumbers("Route 32 has 20,691 delay events [entity-bus-32].", [chunk]), 0);
  assert.equal(ungroundedNumbers("Route 32 has 21,000 delay events.", [chunk]), 1);
});
