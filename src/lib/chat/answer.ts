// The chat orchestration: retrieve, route, call a model with fallback, relay SSE, log.
import type { Chunk, Mode } from "./corpus";
import { MODELS, PROBE_BAD_ID, type ModelKey } from "./models";
import { buildUserTurn, stableSystem, trimHistory, type HistoryItem } from "./prompt";
import { streamAnthropic } from "./providers/anthropic";
import { streamOpenAi } from "./providers/openai";
import { NO_USAGE, ProviderError, type ProviderEvent, type ProviderStream, type Usage } from "./providers/types";
import { resolveEntities } from "./resolve";
import { facetsOf, retrieve, type Retrieval } from "./retrieve";
import { breaker as sharedBreaker, complexity, decideRoute, type CircuitBreaker, type Route } from "./router";
import { SSE_KEEP, sseEvent } from "./sse";
import { ungroundedNumbers, type AnswerLog } from "./log";

export const ANSWER_CAP = 1600;
const STREAM_FREE = 1400;
export const NONE_TEXT = "I do not have that in the TTC Pulse data. Ask about a route, a station, a year, a cause or the score.";
export const REFUSAL_TEXT = "I cannot answer that one.";
export const MESSAGES = {
  unavailable: "The assistant is not available now. Try again in a minute.",
  cut: "The answer stopped early. Ask again.",
  config_error: "The assistant has a configuration error."
};

// "probe" is for the eval only: it sends an id that is not a model and expects a config error.
export type ForcedRoute = "none" | "haiku" | "luna" | "sol" | "probe-anthropic" | "probe-openai";

export type AnswerInput = {
  requestId: string;
  question: string;
  mode: Mode;
  history: HistoryItem[];
  visitor: string;
  forceRoute?: ForcedRoute;
  signal: AbortSignal;
};

export type AnswerDeps = {
  keys: { anthropic?: string; openai?: string };
  escalationAllowed: () => Promise<boolean>;
  loadLive: (mode: Mode) => Promise<Chunk | null>;
  log: (entry: AnswerLog) => void;
  streams?: { anthropic: ProviderStream; openai: ProviderStream };
  breaker?: CircuitBreaker;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  firstTokenMs?: number;
  retryFirstTokenMs?: number;
  deadlineMs?: number;
  keepAliveMs?: number;
};

type Attempt = { key: ModelKey; retry: boolean; probe?: boolean };

// Holds back a "[" until its "]" arrives, then keeps only the ids that were sent.
export class CitationFilter {
  private held = "";
  readonly cited: string[] = [];
  constructor(private readonly allowed: Set<string>) {}

  push(text: string): string {
    let out = "";
    let rest = this.held + text;
    this.held = "";
    for (;;) {
      const open = rest.indexOf("[");
      if (open === -1) return out + rest;
      out += rest.slice(0, open);
      const close = rest.indexOf("]", open);
      if (close === -1) {
        if (rest.length - open > 160) {
          out += rest.slice(open);
          return out;
        }
        this.held = rest.slice(open);
        return out;
      }
      out = this.citation(out, rest.slice(open + 1, close));
      rest = rest.slice(close + 1);
    }
  }

  private citation(before: string, inner: string): string {
    const parts = inner.split(/[,;\s]+/).filter(Boolean);
    const idLike = parts.length > 0 && parts.every((p) => /^[a-z][a-z0-9-]*\d?[a-z0-9-]*$/.test(p) && p.includes("-"));
    if (!idLike) return `${before}[${inner}]`;
    const kept = parts.filter((p) => this.allowed.has(p));
    for (const id of kept) if (!this.cited.includes(id)) this.cited.push(id);
    if (!kept.length) return before.replace(/[ \t]+$/, "");
    return `${before}[${kept.join(", ")}]`;
  }

  flush(): string {
    const rest = this.held;
    this.held = "";
    return rest;
  }
}

const SENTENCE_END = /[.!?](\s*\[[^\]]*\])?(?=\s|$)/g;

// The last sentence end at or before max chars, or -1.
export function lastSentenceEnd(text: string, max: number): number {
  let end = -1;
  for (const match of text.matchAll(SENTENCE_END)) {
    const stop = match.index! + match[0].length;
    if (stop > max) break;
    end = stop;
  }
  return end;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        onTimeout();
        reject(new ProviderError("retryable", "first_token_timeout", null, `no first token in ${ms} ms`));
      }, ms);
    })
  ]).finally(() => clearTimeout(timer));
}

export function answerStream(input: AnswerInput, deps: AnswerDeps): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let closed = false;
  const write = (text: string) => {
    if (closed) return;
    writer.write(encoder.encode(text)).catch(() => {
      closed = true;
    });
  };
  const send = (event: string, data: unknown) => write(sseEvent(event, data));
  const keepAlive = setInterval(() => write(SSE_KEEP), deps.keepAliveMs ?? 10_000);

  run(input, deps, send)
    .catch((error) => {
      console.log(JSON.stringify({ chat: "crash", requestId: input.requestId, error: error instanceof Error ? error.message : String(error) }));
      send("error", { code: "unavailable", message: MESSAGES.unavailable });
    })
    .finally(() => {
      clearInterval(keepAlive);
      closed = true;
      writer.close().catch(() => undefined);
    });
  return readable;
}

function attemptsFor(route: Route, forced: ForcedRoute | undefined): Attempt[][] {
  if (forced === "probe-anthropic") return [[{ key: "haiku", retry: false, probe: true }]];
  if (forced === "probe-openai") return [[{ key: "luna", retry: false, probe: true }]];
  if (forced === "haiku" || forced === "luna" || forced === "sol") return [[{ key: forced, retry: forced !== "sol" }]];
  if (route === "sol") return [[{ key: "sol", retry: false }], [{ key: "haiku", retry: false }], [{ key: "luna", retry: true }]];
  return [[{ key: "haiku", retry: true }], [{ key: "luna", retry: true }]];
}

async function run(input: AnswerInput, deps: AnswerDeps, send: (event: string, data: unknown) => void) {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = deps.random ?? Math.random;
  const streams = deps.streams ?? { anthropic: streamAnthropic, openai: streamOpenAi };
  const breaker = deps.breaker ?? sharedBreaker;
  const started = now();
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), deps.deadlineMs ?? 25_000);
  const onAbort = () => deadline.abort();
  input.signal.addEventListener("abort", onAbort);

  const previous = input.history.filter((h) => h.role === "user").at(-1)?.text;
  const resolution = resolveEntities(input.question, input.mode, previous);
  const earlyFacets = facetsOf(input.question);
  const modes = new Set(resolution.entities.map((e) => e.mode));
  const liveMode: Mode = resolution.explicitMode ?? (modes.size === 1 ? [...modes][0] : input.mode);
  const live = earlyFacets.live ? await deps.loadLive(liveMode) : null;

  let retrieval: Retrieval = retrieve(input.question, input.mode, resolution, { budget: MODELS.haiku.contextBudget, live });
  const score = complexity(retrieval, input.question);
  let escalated = false;
  let route: Route;
  const forced = input.forceRoute;
  if (forced === "none") route = "none";
  else if (forced) route = forced === "sol" ? "sol" : "haiku";
  else {
    const hard = !retrieval.empty && score >= 4 && !retrieval.facets.live;
    const allowed = hard ? await deps.escalationAllowed() : false;
    route = decideRoute({ empty: retrieval.empty, complexity: score, live: retrieval.facets.live, escalationAllowed: () => allowed });
    escalated = route === "sol";
  }
  if (route === "sol") retrieval = retrieve(input.question, input.mode, resolution, { budget: MODELS.sol.contextBudget, live });

  const log: AnswerLog = {
    route,
    outcome: "ok",
    visitor: input.visitor,
    requestId: input.requestId,
    modeHint: input.mode,
    effectiveMode: retrieval.effectiveMode,
    topChunkId: retrieval.topChunkId,
    errorCode: "",
    question: input.question,
    model: "index",
    latencyMs: 0,
    firstTokenMs: 0,
    retrievalMs: retrieval.ms,
    contextTokens: retrieval.contextTokens,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    complexity: score,
    escalated,
    ungroundedNumbers: 0,
    fallback: false
  };
  const done = (extra: { model: string; modelName: string; truncated: boolean; usage: Usage }) => {
    log.latencyMs = now() - started;
    log.inputTokens = extra.usage.inputTokens;
    log.outputTokens = extra.usage.outputTokens;
    log.cacheReadTokens = extra.usage.cacheReadTokens;
    send("done", {
      model: extra.model,
      modelName: extra.modelName,
      route,
      fallback: log.fallback,
      latencyMs: log.latencyMs,
      firstTokenMs: log.firstTokenMs,
      inputTokens: extra.usage.inputTokens,
      outputTokens: extra.usage.outputTokens,
      cacheReadTokens: extra.usage.cacheReadTokens,
      cacheWriteTokens: extra.usage.cacheWriteTokens,
      truncated: extra.truncated,
      outcome: log.outcome,
      errorCode: log.errorCode,
      ungroundedNumbers: log.ungroundedNumbers,
      requestId: input.requestId
    });
    clearTimeout(deadlineTimer);
    input.signal.removeEventListener("abort", onAbort);
    deps.log(log);
  };

  if (route === "none") {
    log.outcome = "none";
    send("meta", { requestId: input.requestId, route, model: "index", modelName: "From the index", fallback: false, retrievalMs: retrieval.ms, chunks: 0 });
    send("delta", { text: NONE_TEXT });
    send("sources", []);
    done({ model: "index", modelName: "From the index", truncated: false, usage: NO_USAGE });
    return;
  }

  const system = stableSystem();
  const messages = [...trimHistory(input.history), { role: "user" as const, content: buildUserTurn(input.question, retrieval.chunks, retrieval.effectiveMode, new Date(now())) }];
  const allowed = new Set(retrieval.chunks.map((c) => c.id));
  const errors: string[] = [];
  let firstGroup = true;

  for (const group of attemptsFor(route, forced)) {
    const provider = MODELS[group[0].key].provider;
    if (!forced && breaker.isOpen(provider)) {
      errors.push(`${group[0].key}:circuit_open`);
      firstGroup = false;
      continue;
    }
    for (let tryIndex = 0; tryIndex < (group[0].retry ? 2 : 1); tryIndex++) {
      const attempt = group[0];
      if (deadline.signal.aborted) break;
      if (tryIndex > 0) await sleep(400 + Math.floor(random() * 300));
      const controller = new AbortController();
      const stopAttempt = () => controller.abort();
      deadline.signal.addEventListener("abort", stopAttempt);
      const key = attempt.key;
      const spec = MODELS[key];
      const apiKey = spec.provider === "anthropic" ? deps.keys.anthropic : deps.keys.openai;
      if (!apiKey) {
        errors.push(`${key}:config_error:no_key`);
        log.errorCode = "config_error";
        deadline.signal.removeEventListener("abort", stopAttempt);
        break;
      }
      const stream = (spec.provider === "anthropic" ? streams.anthropic : streams.openai)({
        model: key,
        modelId: attempt.probe ? PROBE_BAD_ID : spec.id,
        system,
        messages,
        apiKey,
        signal: controller.signal
      });
      const firstMs = tryIndex === 0 ? (deps.firstTokenMs ?? 8000) : (deps.retryFirstTokenMs ?? 6000);
      let first: IteratorResult<ProviderEvent>;
      try {
        first = await withTimeout(stream.next(), firstMs, stopAttempt);
        if (first.done) throw new ProviderError("retryable", "empty", null, "stream ended with no events");
        if (first.value.type === "end" && first.value.stop !== "refusal") throw new ProviderError("retryable", "empty", null, "no text in the answer");
      } catch (error) {
        deadline.signal.removeEventListener("abort", stopAttempt);
        controller.abort();
        if (input.signal.aborted) {
          log.outcome = "aborted";
          done({ model: key, modelName: spec.display, truncated: false, usage: NO_USAGE });
          return;
        }
        const failure = error instanceof ProviderError ? error : new ProviderError("retryable", "network", null, String(error));
        errors.push(`${key}:${failure.code}${failure.status ? `:${failure.status}` : ""}`);
        if (!attempt.probe) breaker.fail(spec.provider);
        if (failure.kind === "config") {
          log.errorCode = "config_error";
          console.log(JSON.stringify({ chat: "config_error", requestId: input.requestId, model: key, status: failure.status }));
          break;
        }
        continue;
      }

      // Committed to this model. No model change after this point.
      breaker.success(spec.provider);
      log.model = key;
      log.fallback = !firstGroup;
      log.firstTokenMs = now() - started;
      send("meta", { requestId: input.requestId, route, model: key, modelName: spec.display, fallback: log.fallback, retrievalMs: retrieval.ms, chunks: retrieval.chunks.length, attempts: errors });

      const filter = new CitationFilter(allowed);
      let text = "";
      let emitted = 0;
      let truncated = false;
      let usage: Usage = NO_USAGE;
      let stop: "end" | "max_tokens" | "refusal" | "cut" = "end";
      // Text streams freely up to 1,400 chars. After that, it goes out one full sentence at a time, and stops at 1,600.
      const emit = (piece: string, final = false) => {
        text += filter.push(piece);
        if (final) text += filter.flush();
        let target = text.length;
        if (text.length > STREAM_FREE) {
          target = final && text.length <= ANSWER_CAP ? text.length : Math.max(lastSentenceEnd(text, ANSWER_CAP), emitted);
        }
        if (text.length > ANSWER_CAP) truncated = true;
        if (target > emitted) {
          send("delta", { text: text.slice(emitted, target) });
          emitted = target;
        }
        return text.length > ANSWER_CAP;
      };

      try {
        let event: IteratorResult<ProviderEvent> = first;
        for (;;) {
          if (event.done) throw new ProviderError("retryable", "stream_ended", null, "stream ended");
          const value = event.value;
          if (value.type === "text") {
            if (emit(value.text)) {
              controller.abort();
              break;
            }
          } else {
            usage = value.usage;
            stop = value.stop;
            break;
          }
          event = await stream.next();
        }
      } catch {
        // A failure after the first token: keep the text that arrived, and do not change the model.
        stop = "cut";
      } finally {
        deadline.signal.removeEventListener("abort", stopAttempt);
      }
      emit("", true);
      const visible = text.slice(0, emitted);
      log.ungroundedNumbers = ungroundedNumbers(visible, retrieval.chunks, input.question);
      if (stop === "refusal") {
        log.outcome = "refusal";
        send("error", { code: "refusal", message: REFUSAL_TEXT });
      } else if (stop === "cut") {
        log.outcome = input.signal.aborted ? "aborted" : "cut";
        log.errorCode = "cut";
        send("error", { code: "cut", message: MESSAGES.cut });
      } else if (stop === "max_tokens" || truncated) {
        log.outcome = "truncated";
        truncated = true;
      }
      const sources = filter.cited
        .filter((id) => visible.includes(id))
        .map((id) => retrieval.chunks.find((c) => c.id === id)!)
        .map((c) => ({ id: c.id, label: c.label, href: c.href }));
      send("sources", sources);
      done({ model: key, modelName: spec.display, truncated, usage });
      return;
    }
    firstGroup = false;
  }

  // Every attempt failed before the first token.
  const configOnly = errors.length > 0 && errors.every((e) => e.includes("config_error"));
  log.outcome = forced && configOnly ? "config_error" : "unavailable";
  log.errorCode = log.errorCode || "unavailable";
  const code = forced && configOnly ? "config_error" : "unavailable";
  send("meta", { requestId: input.requestId, route, model: "", modelName: "", fallback: false, retrievalMs: retrieval.ms, chunks: retrieval.chunks.length, attempts: errors });
  send("error", { code, message: MESSAGES[code], attempts: errors });
  done({ model: "", modelName: "", truncated: false, usage: NO_USAGE });
}
