// Live TTC data for the TTC Pulse dashboard.
// Sources: the TTC alert API (JSON) and the GTFS-Realtime vehicle positions feed (protobuf).

export const ALERTS_URL = "https://alerts.ttc.ca/api/alerts/live-alerts";
export const VEHICLES_URL = "https://bustime.ttc.ca/gtfsrt/vehicles";

export type LiveMode = "bus" | "streetcar" | "subway";
export type LiveEffect = "delay" | "detour" | "closure" | "reduced" | "other";

export type LiveAlert = {
  id: string;
  mode: LiveMode;
  route: string;
  effect: LiveEffect;
  severity: string;
  planned: boolean;
  text: string;
  from: string | null;
  to: string | null;
  // Subway only: the station names in the affected section.
  stations: string[];
  start: string | null;
  end: string | null;
};

// One vehicle: [longitude, latitude, route id, mode code (0 bus, 1 streetcar)].
export type LiveVehicle = [number, number, string, 0 | 1];

export type LiveSnapshot = {
  fetchedAt: string;
  alerts: { updated: string | null; list: LiveAlert[]; elevators: number } | null;
  vehicles: { updated: string | null; list: LiveVehicle[] } | null;
  errors: string[];
  // True when part of the data comes from the last good copy, because a TTC feed failed.
  stale?: boolean;
};

// Streetcar route numbers: 501 to 599, and the night streetcars.
const NIGHT_STREETCARS = new Set(["301", "304", "305", "306", "310", "312"]);
export function routeMode(route: string): Exclude<LiveMode, "subway"> {
  const n = Number(route);
  return (n >= 501 && n <= 599) || NIGHT_STREETCARS.has(route) ? "streetcar" : "bus";
}

const EFFECTS: Record<string, LiveEffect> = {
  SIGNIFICANT_DELAYS: "delay",
  DETOUR: "detour",
  NO_SERVICE: "closure",
  REDUCED_SERVICE: "reduced",
  MODIFIED_SERVICE: "reduced",
  STOP_MOVED: "detour"
};

type RawAlert = {
  id?: unknown;
  route?: unknown;
  routeType?: unknown;
  effect?: unknown;
  severity?: unknown;
  alertType?: unknown;
  headerText?: unknown;
  title?: unknown;
  stopStart?: unknown;
  stopEnd?: unknown;
  stopIDList?: unknown;
  activePeriodGroup?: unknown;
  activePeriod?: { start?: unknown; end?: unknown };
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const orNull = (value: unknown) => text(value) || null;
// The site rule bans en and em dashes in copy, and the TTC text uses them.
const clean = (value: string) => value.replace(/\s*[–—]\s*/g, ", ").replace(/\s+/g, " ").trim();

export function normaliseAlerts(body: unknown): NonNullable<LiveSnapshot["alerts"]> {
  const data = (body ?? {}) as { lastUpdated?: unknown; routes?: unknown; accessibility?: unknown };
  const routes = Array.isArray(data.routes) ? (data.routes as RawAlert[]) : [];
  const list: LiveAlert[] = [];
  for (const raw of routes) {
    const groups = Array.isArray(raw.activePeriodGroup) ? raw.activePeriodGroup : [];
    if (!groups.includes("Current")) continue;
    const effect = EFFECTS[text(raw.effect)];
    // NO_EFFECT alerts say that regular service is back. Skip them.
    if (!effect && text(raw.effect) === "NO_EFFECT") continue;
    const type = text(raw.routeType).toLowerCase();
    const route = text(raw.route);
    const mode: LiveMode = type === "subway" ? "subway" : type === "streetcar" ? "streetcar" : routeMode(route);
    list.push({
      id: text(raw.id) || `${route}-${list.length}`,
      mode,
      route,
      effect: effect ?? "other",
      severity: text(raw.severity),
      planned: text(raw.alertType) === "Planned",
      text: clean(text(raw.headerText) || text(raw.title)),
      from: orNull(raw.stopStart),
      to: orNull(raw.stopEnd),
      stations: mode === "subway" && Array.isArray(raw.stopIDList) ? raw.stopIDList.filter((name): name is string => typeof name === "string") : [],
      start: orNull(raw.activePeriod?.start),
      end: orNull(raw.activePeriod?.end)
    });
  }
  return {
    updated: orNull(data.lastUpdated),
    list,
    elevators: Array.isArray(data.accessibility) ? data.accessibility.length : 0
  };
}

// A small protobuf reader. It reads only the GTFS-Realtime fields this page uses.
// Plain loops, no generators: the Worker has a small CPU budget per request.
const utf8 = new TextDecoder();

type Cursor = { buf: Uint8Array; view: DataView; pos: number };

function varint(c: Cursor, end: number): number {
  let result = 0;
  let scale = 1;
  for (;;) {
    if (c.pos >= end) throw new Error("Truncated varint");
    const byte = c.buf[c.pos++];
    result += (byte & 0x7f) * scale;
    if (byte < 0x80) return result;
    scale *= 128;
    if (scale > 2 ** 63) throw new Error("Bad varint");
  }
}

// Returns the end offset of a length-delimited field and leaves the cursor at its start.
function open(c: Cursor, end: number): number {
  const length = varint(c, end);
  const stop = c.pos + length;
  if (stop > end) throw new Error("Truncated message");
  return stop;
}

function skip(c: Cursor, wire: number, end: number) {
  if (wire === 0) varint(c, end);
  else if (wire === 1) c.pos += 8;
  else if (wire === 2) c.pos = open(c, end);
  else if (wire === 5) c.pos += 4;
  else throw new Error(`Unknown wire type ${wire}`);
}

function readVehicle(c: Cursor, end: number): LiveVehicle | null {
  let route = "";
  let lat = NaN;
  let lon = NaN;
  while (c.pos < end) {
    const tag = varint(c, end);
    const field = tag >>> 3;
    const wire = tag & 7;
    if (field === 1 && wire === 2) {
      const stop = open(c, end);
      while (c.pos < stop) {
        const t = varint(c, stop);
        if (t >>> 3 === 5 && (t & 7) === 2) {
          const s = open(c, stop);
          route = utf8.decode(c.buf.subarray(c.pos, s));
          c.pos = s;
        } else skip(c, t & 7, stop);
      }
    } else if (field === 2 && wire === 2) {
      const stop = open(c, end);
      while (c.pos < stop) {
        const t = varint(c, stop);
        if (t === 13) lat = c.view.getFloat32((c.pos += 4) - 4, true);
        else if (t === 21) lon = c.view.getFloat32((c.pos += 4) - 4, true);
        else skip(c, t & 7, stop);
      }
    } else skip(c, wire, end);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0) return null;
  return [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4, route, route && routeMode(route) === "streetcar" ? 1 : 0];
}

export function decodeVehicles(bytes: Uint8Array): NonNullable<LiveSnapshot["vehicles"]> {
  const c: Cursor = { buf: bytes, view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), pos: 0 };
  const end = bytes.length;
  let timestamp = 0;
  const list: LiveVehicle[] = [];
  while (c.pos < end) {
    const tag = varint(c, end);
    if (tag === 10) {
      const stop = open(c, end);
      while (c.pos < stop) {
        const t = varint(c, stop);
        if (t === 24) timestamp = varint(c, stop);
        else skip(c, t & 7, stop);
      }
    } else if (tag === 18) {
      const stop = open(c, end);
      while (c.pos < stop) {
        const t = varint(c, stop);
        if (t === 34) {
          const s = open(c, stop);
          const vehicle = readVehicle(c, s);
          c.pos = s;
          if (vehicle) list.push(vehicle);
        } else skip(c, t & 7, stop);
      }
    } else skip(c, tag & 7, end);
  }
  return { updated: timestamp ? new Date(timestamp * 1000).toISOString() : null, list };
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store", headers: { "User-Agent": "iampatelom.com TTC Pulse" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
}

export async function loadLiveSnapshot(): Promise<LiveSnapshot> {
  const errors: string[] = [];
  const [alerts, vehicles] = await Promise.all([
    fetchWithTimeout(ALERTS_URL, 6000)
      .then(async (response) => normaliseAlerts(await response.json()))
      .catch((error: unknown) => {
        errors.push(`alerts: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }),
    fetchWithTimeout(VEHICLES_URL, 6000)
      .then(async (response) => decodeVehicles(new Uint8Array(await response.arrayBuffer())))
      .catch((error: unknown) => {
        errors.push(`vehicles: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      })
  ]);
  return { fetchedAt: new Date().toISOString(), alerts, vehicles, errors };
}
