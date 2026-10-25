// OpenAI Responses API with plain fetch and SSE. No SDK, to keep the Worker bundle small.
import { MODELS } from "../models";
import { readSse } from "../sse";
import { ProviderError, failureFromStatus, type ProviderEvent, type ProviderRequest, type StopReason, type Usage } from "./types";

export const OPENAI_URL = "https://api.openai.com/v1/responses";

export function openaiBody(request: ProviderRequest) {
  const spec = MODELS[request.model];
  return {
    model: request.modelId,
    stream: true,
    store: false,
    reasoning: { effort: spec.effort },
    max_output_tokens: spec.maxTokens,
    input: [{ role: "developer", content: request.system }, ...request.messages.map((m) => ({ role: m.role, content: m.content }))]
  };
}

type OpenAiUsage = { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
type OpenAiEvent = {
  type: string;
  delta?: string;
  code?: string | null;
  message?: string;
  response?: { status?: string; usage?: OpenAiUsage | null; incomplete_details?: { reason?: string } | null; error?: { code?: string; message?: string } | null };
};

function readUsage(u: OpenAiUsage | null | undefined): Usage {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: u?.input_tokens_details?.cached_tokens ?? 0,
    cacheWriteTokens: 0
  };
}

export async function* streamOpenAi(request: ProviderRequest): AsyncGenerator<ProviderEvent> {
  const doFetch = request.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(OPENAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${request.apiKey}` },
      body: JSON.stringify(openaiBody(request)),
      signal: request.signal
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    throw new ProviderError("retryable", "network", null, error instanceof Error ? error.message : String(error));
  }
  if (!response.ok || !response.body) throw failureFromStatus(response.status, await response.text().catch(() => ""));

  let refused = false;
  for await (const message of readSse(response.body)) {
    let event: OpenAiEvent;
    try {
      event = JSON.parse(message.data) as OpenAiEvent;
    } catch {
      continue;
    }
    switch (event.type) {
      case "response.output_text.delta":
        if (event.delta) yield { type: "text", text: event.delta };
        break;
      case "response.refusal.delta":
        refused = true;
        break;
      case "response.completed":
        yield { type: "end", stop: refused ? "refusal" : "end", usage: readUsage(event.response?.usage) };
        return;
      case "response.incomplete": {
        const reason = event.response?.incomplete_details?.reason;
        const stop: StopReason = reason === "content_filter" || refused ? "refusal" : "max_tokens";
        yield { type: "end", stop, usage: readUsage(event.response?.usage) };
        return;
      }
      case "response.failed":
        throw new ProviderError("retryable", "stream_error", null, `response.failed ${event.response?.error?.code ?? ""}`.trim());
      case "error": {
        const code = event.code ?? "error";
        const config = /invalid|not_found|model|auth|permission/i.test(code);
        throw new ProviderError(config ? "config" : "retryable", config ? "config_error" : "stream_error", null, `stream ${code}`);
      }
      default:
        break;
    }
  }
  throw new ProviderError("retryable", "stream_ended", null, "stream ended before response.completed");
}
