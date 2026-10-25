import { loadLiveSnapshot, type LiveSnapshot } from "@/lib/ttc-live";

export const dynamic = "force-dynamic";

const FRESH_SECONDS = 60;
const LAST_GOOD_SECONDS = 24 * 60 * 60;

type EdgeCache = { match(key: Request): Promise<Response | undefined>; put(key: Request, value: Response): Promise<void> };
type Ctx = { waitUntil?: (promise: Promise<unknown>) => void };

// On Cloudflare, keep one copy per data centre for 60 seconds, so the TTC feeds get at most one request a minute from each.
// Keep a second copy for a day. If the TTC feeds fail, the page shows that copy and its feed time.
function edgeCache(): EdgeCache | null {
  const store = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return store?.default ?? null;
}

function later(promise: Promise<unknown>) {
  const context = (globalThis as Record<symbol, { ctx?: Ctx } | undefined>)[Symbol.for("__cloudflare-context__")];
  if (context?.ctx?.waitUntil) context.ctx.waitUntil(promise);
  else return promise;
}

function json(body: unknown, maxAge: number, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store" }
  });
}

export async function GET(request: Request) {
  const cache = edgeCache();
  const fresh = new Request(new URL("/api/ttc-pulse/live?fresh", request.url).toString());
  const last = new Request(new URL("/api/ttc-pulse/live?last", request.url).toString());
  if (cache) {
    const hit = await cache.match(fresh);
    if (hit) return hit;
  }

  const snapshot = await loadLiveSnapshot();
  const complete = snapshot.alerts !== null && snapshot.vehicles !== null;
  if (complete) {
    const response = json(snapshot, FRESH_SECONDS);
    if (cache) await later(Promise.all([cache.put(fresh, response.clone()), cache.put(last, json(snapshot, LAST_GOOD_SECONDS))]));
    return response;
  }

  // A feed failed. Fill the gap from the last good copy, and mark it stale.
  const previous = cache ? await cache.match(last) : undefined;
  if (previous) {
    const old = (await previous.json()) as LiveSnapshot;
    const merged: LiveSnapshot & { stale: boolean } = {
      ...snapshot,
      alerts: snapshot.alerts ?? old.alerts,
      vehicles: snapshot.vehicles ?? old.vehicles,
      stale: true
    };
    return json(merged, 0);
  }
  return json({ ...snapshot, stale: true }, 0, snapshot.alerts || snapshot.vehicles ? 200 : 502);
}
