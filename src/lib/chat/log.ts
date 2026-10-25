import type { ChatEnv } from "./cf";
import type { Chunk } from "./corpus";
import { numbersIn, redact } from "./text";

export type AnswerLog = {
  route: string;
  outcome: string;
  visitor: string;
  requestId: string;
  modeHint: string;
  effectiveMode: string;
  topChunkId: string;
  errorCode: string;
  question: string;
  model: string;
  latencyMs: number;
  firstTokenMs: number;
  retrievalMs: number;
  contextTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  complexity: number;
  escalated: boolean;
  ungroundedNumbers: number;
  fallback: boolean;
};

// Numbers in the answer that are in no chunk that was sent. Citation ids and the question do not count.
export function ungroundedNumbers(answer: string, chunks: Chunk[], question = ""): number {
  const known = new Set([...chunks.flatMap((c) => numbersIn(c.text)), ...numbersIn(question)]);
  const visible = answer.replace(/\[[^\]]*\]/g, " ");
  return numbersIn(visible).filter((n) => !known.has(n)).length;
}

export function writeAnswer(env: ChatEnv, log: AnswerLog): void {
  const point = {
    blobs: [log.route, log.outcome, log.visitor, log.requestId, log.modeHint, log.effectiveMode, log.topChunkId, log.errorCode, redact(log.question), log.model],
    doubles: [log.latencyMs, log.firstTokenMs, log.retrievalMs, log.contextTokens, log.inputTokens, log.outputTokens, log.cacheReadTokens, log.complexity, log.escalated ? 1 : 0, log.ungroundedNumbers, log.fallback ? 1 : 0],
    indexes: [log.route]
  };
  if (env.CHAT_ANALYTICS?.writeDataPoint) {
    try {
      env.CHAT_ANALYTICS.writeDataPoint(point);
      return;
    } catch {
      // Fall through to the Workers log.
    }
  }
  console.log(JSON.stringify({ chat: "answer", ...log, question: redact(log.question) }));
}

export function writeFeedback(env: ChatEnv, entry: { requestId: string; vote: "up" | "down"; visitor: string }): void {
  const point = { blobs: ["feedback", entry.vote, entry.visitor, entry.requestId], doubles: [entry.vote === "up" ? 1 : -1], indexes: ["feedback"] };
  if (env.CHAT_ANALYTICS?.writeDataPoint) {
    try {
      env.CHAT_ANALYTICS.writeDataPoint(point);
      return;
    } catch {
      // Fall through to the Workers log.
    }
  }
  console.log(JSON.stringify({ chat: "feedback", ...entry }));
}
