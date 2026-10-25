"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { SseParser } from "@/lib/chat/sse";
import styles from "./Ask.module.css";
import { Panel } from "./ui";

type Mode = "bus" | "streetcar" | "subway";
type Source = { id: string; label: string; href: string };
type Meta = { modelName: string; latencyMs: number; fallback: boolean; route: string };
type Turn = {
  key: string;
  question: string;
  mode: Mode;
  answer: string;
  sources: Source[];
  status: "reading" | "streaming" | "done" | "error";
  error?: string;
  meta?: Meta;
  requestId?: string;
  vote?: "up" | "down";
};

const STORE_KEY = "ttc-ask";
const MAX_TURNS = 10;
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const CHIPS: Record<Mode, [string, string][]> = {
  bus: [
    ["Worst route", "Which bus route has the most delay events?"],
    ["Worst in 2023", "Which bus route had the most delays in 2023?"],
    ["32 vs 52", "Compare routes 32 and 52."],
    ["Top cause", "What is the top bus delay cause?"],
    ["Rush hours", "What share of bus delays fall in rush hours?"],
    ["Score fault", "Which bus route ranks first on the raw score, and why is that a problem?"]
  ],
  streetcar: [
    ["Worst route", "Which streetcar route has the most delay events?"],
    ["501 vs 504", "Compare 501 Queen and 504 King."],
    ["Top cause", "What is the top streetcar delay cause?"],
    ["Peak hour", "What is the busiest hour for streetcar delays?"],
    ["Worst in 2022", "Which streetcar route had the most delays in 2022?"],
    ["Rush share", "What is the rush-hour share for streetcars?"]
  ],
  subway: [
    ["Worst station", "Which subway station has the most delays?"],
    ["Line 1 vs 2", "Compare Line 1 and Line 2."],
    ["Yonge at 22:00", "Why does Yonge station have so many delays at 22:00?"],
    ["Busiest hour", "What is the busiest hour for subway delays?"],
    ["Alerts now", "Are there any subway alerts right now?"],
    ["What is k", "What is k for subway stations?"]
  ]
};

const ERRORS: Record<string, string> = {
  rate: "Eight questions a minute. Wait a moment.",
  turnstile: "Verification failed. Reload the page.",
  unavailable: "The assistant is not available now. Try again in a minute.",
  cut: "The answer stopped early. Ask again.",
  refusal: "I cannot answer that one.",
  config_error: "The assistant is not available now. Try again in a minute."
};

function loadTurns(): Turn[] {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const turns = raw ? (JSON.parse(raw) as Turn[]) : [];
    // A reload stops a stream. Mark it as cut.
    return turns.map((t) => (t.status === "reading" || t.status === "streaming" ? { ...t, status: "error", error: ERRORS.cut } : t));
  } catch {
    return [];
  }
}

// Turnstile, only when a site key is set at build time.
type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
};
let turnstileScript: Promise<TurnstileApi | null> | null = null;
function loadTurnstile(): Promise<TurnstileApi | null> {
  if (!SITE_KEY) return Promise.resolve(null);
  turnstileScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve((window as unknown as { turnstile?: TurnstileApi }).turnstile ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return turnstileScript;
}

function useTurnstile() {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string; waiting: ((token: string) => void) | null } | null>(null);
  useEffect(() => {
    if (!SITE_KEY) return;
    let gone = false;
    loadTurnstile().then((api) => {
      if (!api || gone || !box.current) return;
      const state: { api: TurnstileApi; id: string; waiting: ((token: string) => void) | null } = { api, id: "", waiting: null };
      state.id = api.render(box.current, {
        sitekey: SITE_KEY,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token: string) => {
          state.waiting?.(token);
          state.waiting = null;
        },
        "error-callback": () => {
          state.waiting?.("");
          state.waiting = null;
        }
      });
      widget.current = state;
    });
    return () => {
      gone = true;
    };
  }, []);
  const token = useCallback(async (): Promise<string | undefined> => {
    const w = widget.current;
    if (!w) return undefined;
    w.api.reset(w.id);
    const value = await new Promise<string>((resolve) => {
      w.waiting = resolve;
      w.api.execute(w.id);
      setTimeout(() => resolve(""), 15_000);
    });
    return value || undefined;
  }, []);
  return { box, token };
}

// Citations come as [id, id]. They show as small numbers that match the source pills.
function renderAnswer(text: string, sources: Source[]): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(/\s?\[([a-z0-9, -]+)\]/g)) {
    parts.push(text.slice(last, match.index));
    const numbers = match[1]
      .split(/,\s*/)
      .map((id) => sources.findIndex((s) => s.id === id) + 1)
      .filter((n) => n > 0);
    if (numbers.length) {
      parts.push(
        <sup key={match.index} className={styles.cite}>
          {numbers.join(",")}
        </sup>
      );
    }
    last = match.index! + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

const metaLine = (meta: Meta, sources: number) =>
  meta.route === "none"
    ? `From the index, ${(meta.latencyMs / 1000).toFixed(1)} s`
    : `${meta.modelName}${meta.fallback ? " (fallback)" : ""}, ${(meta.latencyMs / 1000).toFixed(1)} s, ${sources} ${sources === 1 ? "source" : "sources"}`;

export function AskView({ mode }: { mode: Mode }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { box, token } = useTurnstile();

  useEffect(() => setTurns(loadTurns()), []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
    } catch {
      // Storage can be full or blocked. The transcript then lasts for this view only.
    }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns]);
  useEffect(() => () => abort.current?.abort(), []);

  const update = (key: string, change: (t: Turn) => Turn) => setTurns((list) => list.map((t) => (t.key === key ? change(t) : t)));

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const key = `${Date.now()}`;
    const history = turns
      .filter((t) => t.status === "done" && t.answer)
      .slice(-2)
      .flatMap((t) => [
        { role: "user", text: t.question.slice(0, 500) },
        { role: "assistant", text: t.answer.slice(0, 600) }
      ]);
    setTurns((list) => [...list, { key, question: q, mode, answer: "", sources: [], status: "reading" as const }].slice(-MAX_TURNS));
    setDraft("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/ttc-pulse/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, mode, history, turnstile: await token() }),
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        const code = response.status === 429 ? "rate" : response.status === 403 ? "turnstile" : "unavailable";
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        update(key, (t) => ({ ...t, status: "error", error: response.status === 400 ? (body?.error?.message ?? ERRORS.unavailable) : ERRORS[code] }));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseParser();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const message of parser.push(decoder.decode(value, { stream: true }))) {
          const data = JSON.parse(message.data);
          if (message.event === "meta") update(key, (t) => ({ ...t, requestId: data.requestId }));
          else if (message.event === "delta") update(key, (t) => ({ ...t, status: t.status === "error" ? t.status : "streaming", answer: t.answer + data.text }));
          else if (message.event === "sources") update(key, (t) => ({ ...t, sources: data }));
          else if (message.event === "error") update(key, (t) => ({ ...t, status: "error", error: ERRORS[data.code] ?? data.message }));
          else if (message.event === "done")
            update(key, (t) => ({
              ...t,
              status: t.status === "error" ? "error" : "done",
              requestId: data.requestId,
              meta: { modelName: data.modelName, latencyMs: data.latencyMs, fallback: data.fallback, route: data.route }
            }));
        }
      }
      // The stream ended with no done or error event, for example when the Worker stopped.
      update(key, (t) => (t.status === "done" || t.status === "error" ? t : { ...t, status: "error", error: ERRORS.cut }));
    } catch {
      update(key, (t) => (t.status === "done" ? t : { ...t, status: "error", error: controller.signal.aborted ? "Stopped." : ERRORS.unavailable }));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function vote(turn: Turn, value: "up" | "down") {
    if (!turn.requestId || turn.vote) return;
    update(turn.key, (t) => ({ ...t, vote: value }));
    fetch("/api/ttc-pulse/chat/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: turn.requestId, vote: value }) }).catch(() => undefined);
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <div className={styles.wrap}>
      <Panel title="Ask the data" note="answers cite the dashboard">
        <div className={styles.transcript} ref={scroller} aria-live="polite">
          {turns.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyMark} aria-hidden="true">
                ?
              </span>
              <p>Ask about a route, a station, a year, a cause or the score.</p>
            </div>
          ) : null}
          {turns.map((turn) => (
            <Fragment key={turn.key}>
              <p className={styles.question}>
                <span className={styles.modeTag}>{turn.mode}</span>
                {turn.question}
              </p>
              <div className={styles.answer}>
                {turn.status === "reading" ? (
                  <p className={styles.reading}>
                    <span className={styles.dots} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    Reading the data
                  </p>
                ) : null}
                {turn.answer ? <p className={styles.text}>{renderAnswer(turn.answer, turn.sources)}</p> : null}
                {turn.status === "error" && turn.error ? <p className={styles.error}>{turn.error}</p> : null}
                {turn.sources.length ? (
                  <ul className={styles.sources} aria-label="Sources">
                    {turn.sources.map((source, i) => (
                      <li key={source.id}>
                        <a href={source.href} className={styles.source}>
                          <b>{i + 1}</b>
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {turn.meta ? (
                  <div className={styles.metaRow}>
                    <span>{metaLine(turn.meta, turn.sources.length)}</span>
                    {turn.meta.route !== "none" && turn.requestId ? (
                      <span className={styles.votes} role="group" aria-label="Rate this answer">
                        <button type="button" aria-pressed={turn.vote === "up"} disabled={Boolean(turn.vote)} onClick={() => vote(turn, "up")}>
                          Good
                        </button>
                        <button type="button" aria-pressed={turn.vote === "down"} disabled={Boolean(turn.vote)} onClick={() => vote(turn, "down")}>
                          Wrong
                        </button>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Fragment>
          ))}
        </div>

        <div className={styles.chips} role="group" aria-label="Example questions">
          {CHIPS[mode].map(([label, question]) => (
            <button key={label} type="button" className={styles.chip} disabled={busy} onClick={() => ask(question)} title={question}>
              {label}
            </button>
          ))}
        </div>

        <form className={styles.inputRow} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="ttc-ask-input">
            Question
          </label>
          <input
            id="ttc-ask-input"
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={mode === "subway" ? "Try: how late is Kennedy?" : mode === "streetcar" ? "Try: how late is 504 King?" : "Try: how late is route 29?"}
            autoComplete="off"
          />
          {busy ? (
            <button type="button" className={styles.stop} onClick={() => abort.current?.abort()}>
              Stop
            </button>
          ) : (
            <button type="submit" className={styles.send} disabled={draft.trim().length < 3}>
              Ask
            </button>
          )}
        </form>
        <div ref={box} className={styles.turnstile} />
        <p className={styles.privacy}>Questions are logged without personal data to improve answers. Eight questions a minute.</p>
      </Panel>
    </div>
  );
}
