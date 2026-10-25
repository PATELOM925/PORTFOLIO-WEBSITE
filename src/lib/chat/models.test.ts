import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { MODELS, MODEL_KEYS, PROBE_BAD_ID, costUsd, isModelKey } from "./models";

const CHAT_DIR = path.join(process.cwd(), "src/lib/chat");
const BANNED = /opus|sonnet|fable|mythos|gpt-4|gpt-5|o[0-9]/i;

test("the model keys are exactly haiku, luna and sol", () => {
  assert.deepEqual(Object.keys(MODELS).sort(), ["haiku", "luna", "sol"]);
  assert.deepEqual([...MODEL_KEYS].sort(), ["haiku", "luna", "sol"]);
});

test("the model ids are the three approved ids at effort medium", () => {
  assert.equal(MODELS.haiku.id, "claude-haiku-5-5");
  assert.equal(MODELS.luna.id, "gpt-6-luna");
  assert.equal(MODELS.sol.id, "gpt-6.1-sol");
  for (const key of MODEL_KEYS) {
    assert.doesNotMatch(MODELS[key].id, BANNED);
    assert.equal(MODELS[key].effort, "medium");
  }
  assert.equal(MODELS.haiku.provider, "anthropic");
  assert.equal(MODELS.luna.provider, "openai");
  assert.equal(MODELS.sol.provider, "openai");
});

test("the probe id is not a model id of any provider family", () => {
  assert.doesNotMatch(PROBE_BAD_ID, /claude-|gpt-/);
});

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

test("only models.ts and its test hold the strings claude- or gpt-", () => {
  const roots = [CHAT_DIR, path.join(process.cwd(), "src/app/api/ttc-pulse/chat"), path.join(process.cwd(), "src/components/demos/ttc-pulse")];
  const offenders: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const file of filesUnder(root)) {
      if (file.endsWith("/models.ts") || file.endsWith("/models.test.ts")) continue;
      if (/claude-|gpt-/i.test(fs.readFileSync(file, "utf8"))) offenders.push(path.relative(process.cwd(), file));
    }
  }
  assert.deepEqual(offenders, []);
});

test("isModelKey accepts only the three keys", () => {
  assert.ok(isModelKey("haiku"));
  assert.ok(!isModelKey("opus"));
  assert.ok(!isModelKey(MODELS.haiku.id));
});

test("costUsd uses the cache read price", () => {
  const cold = costUsd("haiku", { inputTokens: 4000, outputTokens: 500, cacheReadTokens: 0 });
  const warm = costUsd("haiku", { inputTokens: 4000, outputTokens: 500, cacheReadTokens: 2000 });
  assert.ok(Math.abs(cold - 0.00065) < 1e-9);
  assert.ok(warm < cold);
});
