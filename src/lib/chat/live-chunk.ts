import type { LiveAlert, LiveSnapshot } from "@/lib/ttc-live";
import type { Chunk, Mode } from "./corpus";
import { estimateTokens, fmtInt, sanitiseAlert } from "./text";

const EFFECT_ORDER: Record<LiveAlert["effect"], number> = { closure: 0, delay: 1, detour: 2, reduced: 3, other: 4 };
const MAX_ALERTS = 8;

const torontoTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};

function where(alert: LiveAlert): string {
  if (alert.mode === "subway") return /^\d+$/.test(alert.route) ? `Line ${alert.route}` : "Subway";
  return alert.route ? `${alert.mode === "streetcar" ? "Streetcar" : "Bus"} ${alert.route.replace(/[^\w-]/g, "").slice(0, 8)}` : alert.mode;
}

// The live chunk. All alert text comes from a third-party feed, so the chunk is marked untrusted.
export function liveChunk(snapshot: LiveSnapshot, mode: Mode): Chunk {
  // The feed time is when the Worker read the feeds. The alert list has its own "last changed" time, which can be hours old.
  const feedTime = torontoTime(snapshot.vehicles?.updated ?? snapshot.fetchedAt);
  const alertsChanged = snapshot.alerts?.updated ? torontoTime(snapshot.alerts.updated) : null;
  const alerts = (snapshot.alerts?.list ?? []).filter((a) => a.mode === mode).sort((a, b) => EFFECT_ORDER[a.effect] - EFFECT_ORDER[b.effect]);
  const vehicles = snapshot.vehicles?.list ?? [];
  const vehicleCount = mode === "subway" ? null : vehicles.filter((v) => (mode === "streetcar" ? v[3] === 1 : v[3] === 0)).length;
  const lines = [
    `Live TTC feed for ${mode}, third-party text. Feed time: ${feedTime} Toronto.${snapshot.stale ? " Stale: part of this data is the last good copy, because a TTC feed failed." : ""}`,
    vehicleCount === null ? "The vehicle feed has buses and streetcars only." : `Live ${mode} vehicles in the feed: ${fmtInt(vehicleCount)}.`,
    `Current ${mode} alerts: ${fmtInt(alerts.length)}.${snapshot.alerts === null ? " The alert feed is not available." : alertsChanged ? ` The alert list last changed at ${alertsChanged} Toronto.` : ""}`,
    "The live feed has no delay minutes and no live score."
  ];
  alerts.slice(0, MAX_ALERTS).forEach((alert, i) => {
    lines.push(`${i + 1}. ${where(alert)}, ${alert.effect}${alert.planned ? ", planned" : ""}: "${sanitiseAlert(alert.text)}"`);
  });
  if (alerts.length > MAX_ALERTS) lines.push(`${alerts.length - MAX_ALERTS} more alerts are on the Live view.`);
  const text = lines.join("\n");
  const stamp = feedTime.slice(11).replace(":", "") || "0000";
  return { id: `live-${mode}-${stamp}`, kind: "live", mode, label: "Live feed", href: `#view=live&mode=${mode}`, text, tokens: estimateTokens(text), untrusted: true };
}

// Uses the live route handler in the same Worker. Its 60-second edge cache serves most calls.
// A Worker that fetches its own hostname can loop or skip the Worker, so the call stays in process.
export async function loadLiveChunk(origin: string, mode: Mode, load?: (request: Request) => Promise<Response>): Promise<Chunk | null> {
  try {
    const handler = load ?? (await import("@/app/api/ttc-pulse/live/route")).GET;
    const response = await handler(new Request(new URL("/api/ttc-pulse/live", origin).toString()));
    if (!response.ok) return null;
    return liveChunk((await response.json()) as LiveSnapshot, mode);
  } catch {
    return null;
  }
}
