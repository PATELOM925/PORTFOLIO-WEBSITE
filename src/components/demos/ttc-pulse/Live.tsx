"use client";

import { useEffect, useMemo, useState } from "react";
import entitiesFile from "@/demos/ttc-pulse/data/entities.json";
import stationsFile from "@/demos/ttc-pulse/data/stations.json";
import type { LiveAlert, LiveEffect, LiveSnapshot } from "@/lib/ttc-live";
import { NetworkMap, Swatch, formatCount, type MapPoint } from "./charts";
import styles from "./TtcPulse.module.css";
import { Kpis, Panel } from "./ui";

type Mode = "bus" | "streetcar" | "subway";
type Entity = { id: string; name: string; events: number };

const ENTITIES = entitiesFile as unknown as Record<Mode, Entity[]>;
const REFRESH_MS = 60_000;
const EFFECT_WORD: Record<LiveEffect, string> = { delay: "Slow zone", detour: "Detour", closure: "No service", reduced: "Reduced service", other: "Notice" };
const EFFECT_PLURAL: Record<LiveEffect, string> = { delay: "slow zones", detour: "detours", closure: "closures", reduced: "service cuts", other: "notices" };
const EFFECT_ORDER: Record<LiveEffect, number> = { closure: 0, reduced: 1, detour: 2, delay: 3, other: 4 };
const key = (name: string) => name.toLowerCase().replace(/ station$/, "").replace(/[^a-z0-9]/g, "");

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" }) : "unknown";

export function useLiveSnapshot(): { data: LiveSnapshot | null; failed: boolean } {
  const [data, setData] = useState<LiveSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/ttc-pulse/live", { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as LiveSnapshot;
        if (!stop) {
          setData(next);
          setFailed(false);
        }
      } catch {
        if (!stop) setFailed(true);
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);
  return { data, failed };
}

// Group alerts with the same route and effect, for example ten slow zones on Line 1.
function groupAlerts(list: LiveAlert[]) {
  const groups = new Map<string, { first: LiveAlert; count: number }>();
  for (const alert of list) {
    const id = `${alert.mode}-${alert.route}-${alert.effect}`;
    const group = groups.get(id);
    if (group) group.count += 1;
    else groups.set(id, { first: alert, count: 1 });
  }
  return [...groups.values()].sort((a, b) => EFFECT_ORDER[a.first.effect] - EFFECT_ORDER[b.first.effect]);
}

const routeLabel = (alert: LiveAlert) => (alert.mode === "subway" ? `Line ${alert.route}` : alert.route);

export function LiveView({ mode, openEntity }: { mode: Mode; openEntity: (id: string) => void }) {
  const { data, failed } = useLiveSnapshot();
  const worst = ENTITIES[mode].slice(0, 10);

  const view = useMemo(() => {
    if (!data) return null;
    const vehicles = data.vehicles?.list ?? [];
    const alerts = data.alerts?.list ?? [];
    const inService = vehicles.filter(([, , route]) => route);
    const modeCode = mode === "streetcar" ? 1 : 0;
    const worstIds = new Set(worst.map((e) => e.id));
    const perRoute = new Map<string, number>();
    for (const [, , route] of inService) perRoute.set(route, (perRoute.get(route) ?? 0) + 1);

    const alertByRoute = new Map<string, LiveAlert>();
    for (const alert of alerts) {
      const prior = alertByRoute.get(alert.route);
      if (alert.mode !== "subway" && (!prior || EFFECT_ORDER[alert.effect] < EFFECT_ORDER[prior.effect])) alertByRoute.set(alert.route, alert);
    }
    const stationAlert = new Map<string, LiveAlert>();
    for (const alert of alerts) for (const station of alert.stations) if (!stationAlert.has(key(station))) stationAlert.set(key(station), alert);

    const points: MapPoint[] = inService.map(([lon, lat, route, code], i) => {
      const hot = mode !== "subway" && code === modeCode && worstIds.has(route);
      return {
        key: `v${i}`,
        lon,
        lat,
        r: hot ? 3 : 1.6,
        tone: hot ? "accent" : mode !== "subway" && code === modeCode ? "series" : "dim",
        tip: `${code === 1 ? "Streetcar" : "Bus"} on route ${route}`
      };
    });
    if (mode === "subway") {
      for (const s of stationsFile) {
        const alert = stationAlert.get(key(s.station));
        points.push({ key: `s${s.station}`, lon: s.lon, lat: s.lat, r: alert ? 4.5 : 3, tone: alert ? "accent" : "ring", tip: alert ? `${s.station}: ${EFFECT_WORD[alert.effect]}` : s.station });
      }
    }

    const modeAlerts = alerts.filter((a) => a.mode === mode);
    const onWorst = mode === "subway" ? 0 : worst.reduce((sum, e) => sum + (perRoute.get(e.id) ?? 0), 0);
    const modeVehicles = mode === "subway" ? 0 : inService.filter(([, , , code]) => code === modeCode).length;
    return { points, perRoute, alertByRoute, stationAlert, modeAlerts, groups: groupAlerts(modeAlerts), onWorst, modeVehicles, total: inService.length };
  }, [data, mode, worst]);

  if (!data || !view) {
    return (
      <Panel title="Live" wide>
        <p className={styles.body}>{failed ? "The TTC feed does not answer now. The page tries again every minute." : "Loading the TTC feed."}</p>
      </Panel>
    );
  }

  const noVehicles = !data.vehicles;
  const vehicleCount = (n: number) => (noVehicles ? "n/a" : formatCount(n));
  const feedTime = clock(data.vehicles?.updated ?? data.alerts?.updated ?? data.fetchedAt);
  const unit = mode === "subway" ? "Stations" : "Routes";
  return (
    <>
      <p className={styles.liveLine}>
        <span className={data.stale ? styles.liveDotStale : styles.liveDot} aria-hidden="true" />
        {data.stale ? `Feed unavailable, showing ${feedTime}` : `Live, TTC feed ${feedTime}`}
      </p>
      <Kpis
        items={
          mode === "subway"
            ? [
                [vehicleCount(view.total), "Buses and streetcars out"],
                [formatCount(view.modeAlerts.length), "Subway alerts"],
                [formatCount(view.modeAlerts.filter((a) => a.effect === "closure" || a.effect === "reduced").length), "Closures"],
                [formatCount(view.modeAlerts.filter((a) => a.effect === "delay").length), "Slow zones"]
              ]
            : [
                [vehicleCount(view.modeVehicles), mode === "bus" ? "Buses out now" : "Streetcars out now"],
                [vehicleCount(view.onWorst), "On the 10 worst routes"],
                [formatCount(view.modeAlerts.length), `${mode === "bus" ? "Bus" : "Streetcar"} alerts`],
                [formatCount(view.modeAlerts.filter((a) => a.effect === "detour").length), "Detours"]
              ]
        }
      />
      <div className={styles.grid}>
        <Panel title={mode === "subway" ? "Subway now" : "Fleet now"} note={mode === "subway" ? "stations with an alert in gold" : "every dot is a vehicle"} wide>
          <NetworkMap points={view.points} label={`Map of TTC vehicles now, ${mode}`}>
            {mode === "subway" ? (
              <>
                <Swatch tone="accent">alert</Swatch>
                <Swatch tone="ring">station</Swatch>
                <Swatch tone="dim">bus or streetcar</Swatch>
              </>
            ) : (
              <>
                <Swatch tone="accent">10 worst routes</Swatch>
                <Swatch tone="series">other {mode === "bus" ? "buses" : "streetcars"}</Swatch>
                <Swatch tone="dim">{mode === "bus" ? "streetcars" : "buses"}</Swatch>
              </>
            )}
          </NetworkMap>
        </Panel>
        <Panel title={`Worst ${unit.toLowerCase()} now`} note="history against now">
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{unit.slice(0, -1)}</th>
                  <th className={styles.num}>{mode === "subway" ? "Delays" : "Out now"}</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {worst.map((e) => {
                  const alert = mode === "subway" ? view.stationAlert.get(key(e.name)) : view.alertByRoute.get(e.id);
                  return (
                    <tr key={e.id}>
                      <td>
                        <button type="button" className={styles.inlineLink} onClick={() => openEntity(e.id)}>
                          {mode === "subway" ? e.name : `${e.id} ${e.name}`}
                        </button>
                      </td>
                      <td className={styles.num}>{mode === "subway" ? formatCount(e.events) : formatCount(view.perRoute.get(e.id) ?? 0)}</td>
                      <td>{alert ? <span className={styles.effect}>{EFFECT_WORD[alert.effect]}</span> : <span className={styles.muted}>none</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Alerts now" note={view.groups.length ? `${view.modeAlerts.length} from the TTC` : undefined} wide>
          {view.groups.length ? (
            <ul className={styles.alerts}>
              {view.groups.slice(0, 8).map(({ first, count }) => (
                <li key={first.id}>
                  <span className={styles.routeBadge}>{routeLabel(first)}</span>
                  <span className={styles.effect}>{count > 1 ? `${count} ${EFFECT_PLURAL[first.effect]}` : EFFECT_WORD[first.effect]}</span>
                  <span className={styles.alertText}>{first.text.replace(/^[^:]{1,40}:\s*/, "")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.body}>No {mode} alerts now.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
