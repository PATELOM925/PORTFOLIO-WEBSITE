// Access to the Cloudflare request context under OpenNext, with no import from the adapter.

export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
export type AnalyticsDataset = { writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void };

export type ChatEnv = {
  CHAT_VISITOR_LIMIT?: RateLimiter;
  CHAT_GLOBAL_LIMIT?: RateLimiter;
  CHAT_ESCALATE_LIMIT?: RateLimiter;
  CHAT_ESCALATE_VISITOR_LIMIT?: RateLimiter;
  CHAT_ANALYTICS?: AnalyticsDataset;
  [name: string]: unknown;
};

type CfContext = { env?: ChatEnv; ctx?: { waitUntil?: (promise: Promise<unknown>) => void }; cf?: { colo?: string } };

export function cfContext(): CfContext {
  return (globalThis as Record<symbol, CfContext | undefined>)[Symbol.for("__cloudflare-context__")] ?? {};
}

export function chatEnv(): ChatEnv {
  return cfContext().env ?? {};
}

// Secrets are string bindings on the Worker. OpenNext also copies them to process.env.
export function secret(name: string): string | undefined {
  const fromEnv = cfContext().env?.[name];
  if (typeof fromEnv === "string" && fromEnv) return fromEnv;
  const value = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
  return value || undefined;
}

// Runs the promise after the response, when the Worker allows it.
export function later(promise: Promise<unknown>): void {
  const ctx = cfContext().ctx;
  const safe = promise.catch(() => undefined);
  if (ctx?.waitUntil) ctx.waitUntil(safe);
}
