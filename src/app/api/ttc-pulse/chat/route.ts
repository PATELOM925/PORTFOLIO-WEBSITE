import { answerStream, type ForcedRoute } from "@/lib/chat/answer";
import { chatEnv, secret } from "@/lib/chat/cf";
import { MAX_BODY_BYTES, checkLimits, escalationAllowed, isEvalRequest, validateBody, verifyTurnstile, visitorKey } from "@/lib/chat/guard";
import { loadLiveChunk } from "@/lib/chat/live-chunk";
import { writeAnswer } from "@/lib/chat/log";

export const dynamic = "force-dynamic";

const FORCED: ForcedRoute[] = ["none", "haiku", "luna", "sol", "probe-anthropic", "probe-openai"];
const noted = new Set<string>();
// One log line for each isolate when an optional part is not set.
function noteOnce(key: string) {
  if (noted.has(key)) return;
  noted.add(key);
  console.log(JSON.stringify({ chat: "config", [key.split("=")[0]]: key.split("=")[1] }));
}

const json = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function POST(request: Request) {
  const env = chatEnv();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json(400, "too_large", "The request is too large.");
  const checked = validateBody(await request.text());
  if (!checked.ok) return json(checked.status, checked.code, checked.message);
  const body = checked.body;

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const salt = secret("CHAT_SALT");
  if (!salt) noteOnce("salt=missing");
  const visitor = await visitorKey(ip, request.headers.get("user-agent") ?? "", salt ?? "dev-salt");
  const isEval = isEvalRequest(request.headers.get("x-chat-eval"), secret("CHAT_EVAL_KEY"));

  const limits = await checkLimits(env, visitor, { skipVisitor: isEval });
  if (!limits.ok) return json(limits.status, limits.code, limits.message);

  if (!isEval) {
    const turnstile = await verifyTurnstile(body.turnstile, secret("TURNSTILE_SECRET"), ip);
    if (turnstile === "skipped") noteOnce("turnstile=skipped");
    if (turnstile === "failed") return json(403, "turnstile", "Verification failed. Reload the page.");
  }

  const forceHeader = request.headers.get("x-chat-eval-route") as ForcedRoute | null;
  const forceRoute = isEval && forceHeader && FORCED.includes(forceHeader) ? forceHeader : undefined;
  const origin = new URL(request.url).origin;
  const stream = answerStream(
    { requestId: crypto.randomUUID(), question: body.question, mode: body.mode, history: body.history, visitor, forceRoute, signal: request.signal },
    {
      keys: { anthropic: secret("ANTHROPIC_API_KEY"), openai: secret("OPENAI_API_KEY") },
      escalationAllowed: () => escalationAllowed(env, visitor),
      loadLive: (mode) => loadLiveChunk(origin, mode),
      log: (entry) => writeAnswer(env, entry)
    }
  );
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" }
  });
}
