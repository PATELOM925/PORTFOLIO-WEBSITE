// Anthropic Messages API with plain fetch and SSE. No SDK, to keep the Worker bundle small.
import { MODELS } from "../models";
import { readSse } from "../sse";
import { ProviderError, failureFromStatus, type ProviderEvent, type ProviderRequest, type StopReason, type Usage } from "./types";

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2026-10-21";

// Adaptive thinking is on by default for this model, so the body sends no thinking field.
// The API version 2026-10-21 rejects sampling parameters, and the model rejects prefill. The body has neither.
export function anthropicBody(request: ProviderRequest) {
  const spec = MODELS[request.model];
  return {
    model: request.modelId,
    max_tokens: spec.maxTokens,
    stream: true,
    output_config: { effort: spec.effort },
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: request.messages
  };
}

type AnthropicEvent = {
  type: string;
  message?: { usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  usage?: { output_tokens?: number; input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  error?: { type?: string; message?: string };
};

export async function* streamAnthropic(request: ProviderRequest): AsyncGenerator<ProviderEvent> {
  const doFetch = request.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": request.apiKey, "anthropic-version": ANTHROPIC_VERSION },
      body: JSON.stringify(anthropicBody(request)),
      signal: request.signal
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    throw new ProviderError("retryable", "network", null, error instanceof Error ? error.message : String(error));
  }
  if (!response.ok || !response.body) throw failureFromStatus(response.status, await response.text().catch(() => ""));

  const usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  let stop: StopReason = "end";
  for await (const message of readSse(response.body)) {
    let event: AnthropicEvent;
    try {
      event = JSON.parse(message.data) as AnthropicEvent;
    } catch {
      continue;
    }
    if (event.type === "message_start") {
      const u = event.message?.usage ?? {};
      usage.cacheReadTokens = u.cache_read_input_tokens ?? 0;
      usage.cacheWriteTokens = u.cache_creation_input_tokens ?? 0;
      // input_tokens excludes the cached part. Usage.inputTokens is the total input.
      usage.inputTokens = (u.input_tokens ?? 0) + usage.cacheReadTokens + usage.cacheWriteTokens;
      usage.outputTokens = u.output_tokens ?? 0;
    } else if (event.type === "content_block_delta") {
      if (event.delta?.type === "text_delta" && event.delta.text) yield { type: "text", text: event.delta.text };
    } else if (event.type === "message_delta") {
      if (event.usage?.output_tokens !== undefined) usage.outputTokens = event.usage.output_tokens;
      const reason = event.delta?.stop_reason;
      if (reason === "refusal") stop = "refusal";
      else if (reason === "max_tokens") stop = "max_tokens";
    } else if (event.type === "error") {
      const type = event.error?.type ?? "error";
      const retryable = type === "overloaded_error" || type === "api_error" || type === "rate_limit_error";
      throw new ProviderError(retryable ? "retryable" : "config", retryable ? "stream_error" : "config_error", null, `stream ${type}`);
    } else if (event.type === "message_stop") {
      yield { type: "end", stop, usage };
      return;
    }
  }
  throw new ProviderError("retryable", "stream_ended", null, "stream ended before message_stop");
}
