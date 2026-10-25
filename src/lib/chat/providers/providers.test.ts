import assert from "node:assert/strict";
import test from "node:test";
import { MODELS, PROBE_BAD_ID } from "../models";
import { parseSse, sseEvent } from "../sse";
import { anthropicBody, streamAnthropic } from "./anthropic";
import { openaiBody, streamOpenAi } from "./openai";
import { ProviderError, type ProviderEvent, type ProviderRequest } from "./types";

// Recorded stream shapes. The ids and the text are shortened.
export const ANTHROPIC_SSE = [
  'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[],"stop_reason":null,"usage":{"input_tokens":812,"cache_creation_input_tokens":0,"cache_read_input_tokens":2290,"output_tokens":3}}}\n\n',
  'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"abc"}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
  "event: ping\ndata: {\"type\": \"ping\"}\n\n",
  'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Route 32 Eglinton West has "}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"20,691 delay events [entity-bus-32]."}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":141}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n'
].join("");

export const OPENAI_SSE = [
  'event: response.created\ndata: {"type":"response.created","sequence_number":0,"response":{"id":"resp_1","status":"in_progress","usage":null}}\n\n',
  'event: response.output_item.added\ndata: {"type":"response.output_item.added","sequence_number":1,"output_index":0,"item":{"type":"reasoning","id":"rs_1"}}\n\n',
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","item_id":"msg_1","output_index":1,"content_index":0,"delta":"Route 52 has ","sequence_number":4,"logprobs":[]}\n\n',
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","item_id":"msg_1","output_index":1,"content_index":0,"delta":"20,190 delay events [entity-bus-52].","sequence_number":5,"logprobs":[]}\n\n',
  'event: response.completed\ndata: {"type":"response.completed","sequence_number":9,"response":{"id":"resp_1","status":"completed","usage":{"input_tokens":3100,"input_tokens_details":{"cached_tokens":2048,"cache_write_tokens":0},"output_tokens":420,"output_tokens_details":{"reasoning_tokens":300},"total_tokens":3520}}}\n\n'
].join("");

// Splits the body into small pieces, so the parser must join events across reads.
function streamOf(text: string, piece = 37): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let at = 0;
  return new ReadableStream({
    pull(controller) {
      if (at >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(at, at + piece));
      at += piece;
    }
  });
}

export function fakeFetch(status: number, body: string): typeof fetch {
  return (async () => new Response(status === 200 ? streamOf(body) : body, { status })) as typeof fetch;
}

function request(model: "haiku" | "luna", fetchImpl: typeof fetch, modelId: string = MODELS[model].id): ProviderRequest {
  return { model, modelId, system: "SYSTEM", messages: [{ role: "user", content: "q" }], apiKey: "test", signal: new AbortController().signal, fetch: fetchImpl };
}

async function collect(gen: AsyncGenerator<ProviderEvent>) {
  const out: ProviderEvent[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

test("the Anthropic body has one cache breakpoint, effort medium and no sampling fields", () => {
  const body = anthropicBody(request("haiku", fakeFetch(200, "")));
  assert.equal(body.model, MODELS.haiku.id);
  assert.equal(body.max_tokens, 1500);
  assert.deepEqual(body.output_config, { effort: "medium" });
  assert.deepEqual(body.system[0].cache_control, { type: "ephemeral" });
  const json = JSON.stringify(body);
  assert.doesNotMatch(json, /temperature|top_p|top_k|budget_tokens/);
  assert.equal((json.match(/cache_control/g) ?? []).length, 1);
});

test("the OpenAI body has reasoning medium, store false and a developer message", () => {
  const body = openaiBody(request("luna", fakeFetch(200, "")));
  assert.equal(body.model, MODELS.luna.id);
  assert.deepEqual(body.reasoning, { effort: "medium" });
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 2000);
  assert.equal(body.input[0].role, "developer");
});

test("the Anthropic stream gives text, skips thinking and reads cache usage", async () => {
  const events = await collect(streamAnthropic(request("haiku", fakeFetch(200, ANTHROPIC_SSE))));
  const text = events.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : "")).join("");
  assert.equal(text, "Route 32 Eglinton West has 20,691 delay events [entity-bus-32].");
  const end = events.at(-1);
  assert.ok(end && end.type === "end");
  assert.equal(end.stop, "end");
  assert.deepEqual(end.usage, { inputTokens: 3102, outputTokens: 141, cacheReadTokens: 2290, cacheWriteTokens: 0 });
});

test("an Anthropic refusal stop reason ends with refusal", async () => {
  const body = ANTHROPIC_SSE.replace('"stop_reason":"end_turn"', '"stop_reason":"refusal"');
  const end = (await collect(streamAnthropic(request("haiku", fakeFetch(200, body))))).at(-1);
  assert.ok(end && end.type === "end" && end.stop === "refusal");
});

test("an Anthropic max_tokens stop reason ends with max_tokens", async () => {
  const body = ANTHROPIC_SSE.replace('"stop_reason":"end_turn"', '"stop_reason":"max_tokens"');
  const end = (await collect(streamAnthropic(request("haiku", fakeFetch(200, body))))).at(-1);
  assert.ok(end && end.type === "end" && end.stop === "max_tokens");
});

test("an Anthropic overloaded error event is retryable", async () => {
  const body = 'event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n';
  await assert.rejects(collect(streamAnthropic(request("haiku", fakeFetch(200, body)))), (e: ProviderError) => e.kind === "retryable");
});

test("an unknown model id is a config error, not a retry", async () => {
  const notFound = JSON.stringify({ type: "error", error: { type: "not_found_error", message: `model: ${PROBE_BAD_ID}` } });
  await assert.rejects(collect(streamAnthropic(request("haiku", fakeFetch(404, notFound), PROBE_BAD_ID))), (e: ProviderError) => e.kind === "config" && e.code === "config_error" && e.status === 404);
  const openAi404 = JSON.stringify({ error: { message: "The model does not exist", type: "invalid_request_error", code: "model_not_found" } });
  await assert.rejects(collect(streamOpenAi(request("luna", fakeFetch(404, openAi404), PROBE_BAD_ID))), (e: ProviderError) => e.kind === "config" && e.status === 404);
});

test("429, 500 and 529 are retryable", async () => {
  for (const status of [429, 500, 502, 503, 529]) {
    await assert.rejects(collect(streamAnthropic(request("haiku", fakeFetch(status, "{}")))), (e: ProviderError) => e.kind === "retryable" && e.status === status);
  }
});

test("a network error is retryable", async () => {
  const broken = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  await assert.rejects(collect(streamOpenAi(request("luna", broken))), (e: ProviderError) => e.kind === "retryable" && e.code === "network");
});

test("the OpenAI stream gives text and reads cached tokens", async () => {
  const events = await collect(streamOpenAi(request("luna", fakeFetch(200, OPENAI_SSE))));
  const text = events.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : "")).join("");
  assert.equal(text, "Route 52 has 20,190 delay events [entity-bus-52].");
  const end = events.at(-1);
  assert.ok(end && end.type === "end");
  assert.deepEqual(end.usage, { inputTokens: 3100, outputTokens: 420, cacheReadTokens: 2048, cacheWriteTokens: 0 });
});

test("an OpenAI content filter ends with refusal", async () => {
  const body = 'event: response.incomplete\ndata: {"type":"response.incomplete","response":{"status":"incomplete","incomplete_details":{"reason":"content_filter"},"usage":null}}\n\n';
  const end = (await collect(streamOpenAi(request("luna", fakeFetch(200, body))))).at(-1);
  assert.ok(end && end.type === "end" && end.stop === "refusal");
});

test("an OpenAI max_output_tokens result ends with max_tokens", async () => {
  const body = 'event: response.incomplete\ndata: {"type":"response.incomplete","response":{"status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"usage":{"input_tokens":10,"output_tokens":2000}}}\n\n';
  const end = (await collect(streamOpenAi(request("luna", fakeFetch(200, body))))).at(-1);
  assert.ok(end && end.type === "end" && end.stop === "max_tokens");
});

test("parseSse joins data lines and skips comments", () => {
  const events = parseSse(": keep\n\nevent: a\ndata: 1\ndata: 2\n\n" + sseEvent("b", { x: 1 }));
  assert.deepEqual(events, [
    { event: "a", data: "1\n2" },
    { event: "b", data: '{"x":1}' }
  ]);
});
