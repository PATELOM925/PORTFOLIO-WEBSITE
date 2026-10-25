import type { ChatEnv, RateLimiter } from "./cf";
import { MODES, type Mode } from "./corpus";
import type { HistoryItem } from "./prompt";

export type ChatBody = { question: string; mode: Mode; history: HistoryItem[]; turnstile?: string };
export type GuardFailure = { ok: false; status: 400 | 403 | 429; code: string; message: string };

export const MAX_BODY_BYTES = 8 * 1024;

const fail = (status: GuardFailure["status"], code: string, message: string): GuardFailure => ({ ok: false, status, code, message });

export function validateBody(raw: string): { ok: true; body: ChatBody } | GuardFailure {
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail(400, "too_large", "The request is too large.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail(400, "bad_json", "The request is not valid JSON.");
  }
  if (!data || typeof data !== "object") return fail(400, "bad_body", "The request has no body.");
  const { question, mode, history, turnstile } = data as Record<string, unknown>;
  if (typeof question !== "string") return fail(400, "bad_question", "Write a question.");
  const q = question.trim();
  if (q.length < 3 || q.length > 500) return fail(400, "bad_length", "Write a question of 3 to 500 characters.");
  const other = [...q].filter((ch) => !/[\p{L}\p{N}\s]/u.test(ch)).length;
  if (other / q.length > 0.4) return fail(400, "bad_chars", "The question has too many symbols.");
  if (typeof mode !== "string" || !(MODES as string[]).includes(mode)) return fail(400, "bad_mode", "The mode is not valid.");
  let items: HistoryItem[] = [];
  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > 4) return fail(400, "bad_history", "The history is not valid.");
    for (const h of history) {
      if (!h || typeof h !== "object") return fail(400, "bad_history", "The history is not valid.");
      const { role, text } = h as Record<string, unknown>;
      if ((role !== "user" && role !== "assistant") || typeof text !== "string" || text.length > 600) return fail(400, "bad_history", "The history is not valid.");
      items.push({ role, text });
    }
  }
  if (turnstile !== undefined && (typeof turnstile !== "string" || turnstile.length > 4096)) return fail(400, "bad_token", "The verification token is not valid.");
  items = items.slice(-4);
  return { ok: true, body: { question: q, mode: mode as Mode, history: items, turnstile: turnstile as string | undefined } };
}

// The first 16 hex chars of sha256(IP | salt + UTC date). The raw IP is never stored.
// The User-Agent is not part of the key: a client could change it to reset its limit.
export async function visitorKey(ip: string, salt: string, now = new Date()): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${salt}${day}`));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// A token bucket for each key, in memory. Used when a rate limit binding is not set (next dev, next start).
export class MemoryLimiter implements RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  constructor(
    private readonly capacity: number,
    private readonly periodMs: number,
    private readonly now: () => number = Date.now
  ) {}

  async limit({ key }: { key: string }) {
    const t = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, at: t };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((t - bucket.at) / this.periodMs) * this.capacity);
    bucket.at = t;
    const success = bucket.tokens >= 1;
    if (success) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 5000) this.buckets.clear();
    return { success };
  }
}

const memory = {
  visitor: new MemoryLimiter(8, 60_000),
  global: new MemoryLimiter(40, 60_000),
  escalate: new MemoryLimiter(2, 60_000),
  escalateVisitor: new MemoryLimiter(1, 60_000)
};
let warned = false;

function limiters(env: ChatEnv) {
  const pick = (binding: RateLimiter | undefined, fallback: MemoryLimiter) => {
    if (binding?.limit) return binding;
    if (!warned) {
      warned = true;
      console.log(JSON.stringify({ chat: "limiter", limiter: "memory" }));
    }
    return fallback;
  };
  return {
    visitor: pick(env.CHAT_VISITOR_LIMIT, memory.visitor),
    global: pick(env.CHAT_GLOBAL_LIMIT, memory.global),
    escalate: pick(env.CHAT_ESCALATE_LIMIT, memory.escalate),
    escalateVisitor: pick(env.CHAT_ESCALATE_VISITOR_LIMIT, memory.escalateVisitor)
  };
}

export async function checkLimits(env: ChatEnv, visitor: string, options: { skipVisitor: boolean }): Promise<{ ok: true } | GuardFailure> {
  const l = limiters(env);
  if (!options.skipVisitor && !(await l.visitor.limit({ key: visitor })).success) return fail(429, "rate_visitor", "Eight questions a minute. Wait a moment.");
  if (!(await l.global.limit({ key: "global" })).success) return fail(429, "rate_global", "The assistant is busy. Wait a moment.");
  return { ok: true };
}

// Two checks: 2 a minute for each colo, and 1 a minute for each visitor.
export async function escalationAllowed(env: ChatEnv, visitor: string): Promise<boolean> {
  const l = limiters(env);
  if (!(await l.escalate.limit({ key: "global" })).success) return false;
  if (!(await l.escalateVisitor.limit({ key: visitor })).success) return false;
  return dailyAllowed(env, "sol");
}

// Hard daily caps for all visitors together, counted in the ChatBudget Durable Object (UTC day).
// At about $0.43 for 1,000 Haiku answers, the answer cap holds normal spend under $1 a day.
export const DAILY_LIMITS = { answer: 1000, sol: 10 } as const;
let budgetWarned = false;

// When the budget Worker is missing or fails, allow the question: the rate limits and the provider caps still apply.
export async function dailyAllowed(env: ChatEnv, kind: keyof typeof DAILY_LIMITS): Promise<boolean> {
  const namespace = env.CHAT_BUDGET;
  try {
    if (!namespace?.idFromName) throw new Error("no binding");
    const result = await namespace.get(namespace.idFromName("global")).take(kind, DAILY_LIMITS[kind]);
    if (!result.ok) console.log(JSON.stringify({ chat: "daily_limit", kind, used: result.used }));
    return result.ok;
  } catch (error) {
    if (!budgetWarned) {
      budgetWarned = true;
      console.log(JSON.stringify({ chat: "budget", error: error instanceof Error ? error.message : String(error) }));
    }
    return true;
  }
}

// Health check for the eval: reads today's counts from the budget Worker. No model call.
export async function budgetProbe(env: ChatEnv): Promise<{ ok: boolean; today?: Record<string, number>; limits?: typeof DAILY_LIMITS; error?: string }> {
  try {
    const namespace = env.CHAT_BUDGET;
    if (!namespace?.idFromName) return { ok: false, error: "no binding" };
    const today = await namespace.get(namespace.idFromName("global")).peek();
    return { ok: true, today, limits: DAILY_LIMITS };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | undefined, secretKey: string | undefined, ip: string, doFetch: typeof fetch = fetch): Promise<"skipped" | "ok" | "failed"> {
  if (!secretKey) return "skipped";
  if (!token) return "failed";
  try {
    const form = new FormData();
    form.set("secret", secretKey);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const response = await doFetch(TURNSTILE_URL, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    const data = (await response.json()) as { success?: boolean };
    return data.success ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

// Constant-time compare of the eval header with CHAT_EVAL_KEY.
export function isEvalRequest(headerValue: string | null, key: string | undefined): boolean {
  if (!key || !headerValue || headerValue.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ headerValue.charCodeAt(i);
  return diff === 0;
}
