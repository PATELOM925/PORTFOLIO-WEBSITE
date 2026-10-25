import { chatEnv, secret } from "@/lib/chat/cf";
import { MemoryLimiter, visitorKey } from "@/lib/chat/guard";
import { writeFeedback } from "@/lib/chat/log";

export const dynamic = "force-dynamic";

// Votes are cheap, so an in-memory limit for each isolate is enough.
const limiter = new MemoryLimiter(30, 60_000);

const reply = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 512) return reply(400);
  let data: { requestId?: unknown; vote?: unknown };
  try {
    data = JSON.parse(await request.text());
  } catch {
    return reply(400);
  }
  const { requestId, vote } = data ?? {};
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/.test(requestId)) return reply(400);
  if (vote !== "up" && vote !== "down") return reply(400);
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const visitor = await visitorKey(ip, request.headers.get("user-agent") ?? "", secret("CHAT_SALT") ?? "dev-salt");
  if (!(await limiter.limit({ key: visitor })).success) return reply(429);
  writeFeedback(chatEnv(), { requestId, vote, visitor });
  return reply(204);
}
