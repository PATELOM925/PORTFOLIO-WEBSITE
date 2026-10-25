// The only file that holds model ids. A unit test enforces this and the allowlist.
// Prices are USD per million tokens, from the provider pricing pages (checked 25 October 2026).

export type ModelKey = "haiku" | "luna" | "sol";
export type Provider = "anthropic" | "openai";

export type ModelSpec = {
  provider: Provider;
  id: string;
  display: string;
  effort: "medium";
  maxTokens: number;
  contextBudget: number;
  pricePerM: { in: number; cachedIn: number; out: number };
};

export const MODELS = {
  haiku: { provider: "anthropic", id: "claude-haiku-5-5", display: "Claude Haiku 5.5", effort: "medium", maxTokens: 1500, contextBudget: 3000, pricePerM: { in: 0.1, cachedIn: 0.01, out: 0.5 } },
  luna: { provider: "openai", id: "gpt-6-luna", display: "GPT 6 Luna", effort: "medium", maxTokens: 2000, contextBudget: 3000, pricePerM: { in: 0.1, cachedIn: 0.01, out: 0.5 } },
  sol: { provider: "openai", id: "gpt-6.1-sol", display: "GPT 6.1 Sol", effort: "medium", maxTokens: 2000, contextBudget: 4500, pricePerM: { in: 2, cachedIn: 0.1, out: 10 } }
} as const satisfies Record<ModelKey, ModelSpec>;

export const MODEL_KEYS = Object.keys(MODELS) as ModelKey[];

// The eval sends this id to check that a bad id surfaces as a config error. It is not a model.
export const PROBE_BAD_ID = "ttc-ask-probe-not-a-model";

export function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && (MODEL_KEYS as string[]).includes(value);
}

// Cost in USD. Cache writes on Anthropic cost 1.25x the input price.
export function costUsd(key: ModelKey, usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens?: number }): number {
  const p = MODELS[key].pricePerM;
  const write = usage.cacheWriteTokens ?? 0;
  const fresh = Math.max(0, usage.inputTokens - usage.cacheReadTokens - write);
  return (fresh * p.in + usage.cacheReadTokens * p.cachedIn + write * p.in * 1.25 + usage.outputTokens * p.out) / 1e6;
}
