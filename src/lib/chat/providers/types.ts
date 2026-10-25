import type { ModelKey } from "../models";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };

export const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export type StopReason = "end" | "max_tokens" | "refusal";

export type ProviderEvent = { type: "text"; text: string } | { type: "end"; stop: StopReason; usage: Usage };

export type ProviderRequest = {
  model: ModelKey;
  // The id comes from MODELS. The eval probe is the only other value.
  modelId: string;
  system: string;
  messages: ChatMessage[];
  apiKey: string;
  signal: AbortSignal;
  fetch?: typeof fetch;
};

// "config" errors do not get a retry: a bad key, a bad request or an unknown model id.
export type FailureKind = "retryable" | "config";

export class ProviderError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly code: string,
    readonly status: number | null,
    message: string
  ) {
    super(message);
  }
}

export function failureFromStatus(status: number, body: string): ProviderError {
  const retryable = status === 429 || status === 529 || status >= 500;
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { error?: { type?: string; code?: string; message?: string } };
    detail = parsed.error?.type ?? parsed.error?.code ?? "";
  } catch {
    detail = "";
  }
  return new ProviderError(retryable ? "retryable" : "config", retryable ? `http_${status}` : "config_error", status, `HTTP ${status}${detail ? ` ${detail}` : ""}`);
}

export type ProviderStream = (request: ProviderRequest) => AsyncGenerator<ProviderEvent>;
