"""Build the TTC network basemap for the TTC Pulse maps.

Input: an unzipped TTC GTFS folder (City of Toronto Open Data, "TTC Routes and Schedules").
Output: src/demos/ttc-pulse/data/network.json with SVG paths for subway, streetcar and bus lines.

Run: python3 scripts/build_ttc_network.py /path/to/gtfs
"""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

WIDTH = 1000  # viewBox width; the height follows from the bounds.
TOLERANCE = {"subway": 0.00012, "streetcar": 0.00025, "bus": 0.0005}  # degrees, about 10 m, 20 m and 40 m
OUT = Path(__file__).resolve().parent.parent / "src/demos/ttc-pulse/data/network.json"


def simplify(points: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    """Douglas-Peucker line simplification."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = points[a], points[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-12
        best, index = -1.0, -1
        for i in range(a + 1, b):
            x, y = points[i]
            dist = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if dist > best:
                best, index = dist, i
        if best > tol and index > 0:
            keep[index] = True
            stack += [(a, index), (index, b)]
    return [p for p, k in zip(points, keep) if k]


def main(gtfs: Path) -> None:
    routes = {r["route_id"]: r for r in csv.DictReader(open(gtfs / "routes.txt", encoding="utf-8-sig"))}
    # The most used shape for each route, in direction 0.
    use: dict[str, Counter] = defaultdict(Counter)
    for t in csv.DictReader(open(gtfs / "trips.txt", encoding="utf-8-sig")):
        if t["direction_id"] in ("0", ""):
            use[t["route_id"]][t["shape_id"]] += 1
    wanted = {counter.most_common(1)[0][0]: route for route, counter in use.items() if counter}

    shapes: dict[str, list[tuple[int, float, float]]] = defaultdict(list)
    for s in csv.DictReader(open(gtfs / "shapes.txt", encoding="utf-8-sig")):
        if s["shape_id"] in wanted:
            shapes[s["shape_id"]].append((int(s["shape_pt_sequence"]), float(s["shape_pt_lon"]), float(s["shape_pt_lat"])))

    lines = []
    for shape_id, pts in shapes.items():
        route = routes[wanted[shape_id]]
        kind = {"1": "subway", "0": "streetcar"}.get(route["route_type"], "bus")
        # Lines 5 and 6 are light rail (route_type 0) but run as rapid transit lines, so draw them with the subway.
        if route["route_long_name"].startswith("Line "):
            kind = "subway"
        pts.sort()
        lines.append((kind, route, [(lon, lat) for _, lon, lat in pts]))

    lons = [lon for _, _, pts in lines for lon, _ in pts]
    lats = [lat for _, _, pts in lines for _, lat in pts]
    lon0, lon1, lat0, lat1 = min(lons), max(lons), min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    scale = WIDTH / ((lon1 - lon0) * kx)
    height = round((lat1 - lat0) * scale)

    def path(pts: list[tuple[float, float]], tol: float) -> str:
        out = []
        for i, (lon, lat) in enumerate(simplify(pts, tol)):
            x = round((lon - lon0) * kx * scale, 1)
            y = round((lat1 - lat) * scale, 1)
            out.append(f"{'M' if i == 0 else 'L'}{x:g} {y:g}")
        return "".join(out)

    subway = []
    streetcar: list[str] = []
    bus: list[str] = []
    for kind, route, pts in sorted(lines, key=lambda line: line[1]["route_id"]):
        d = path(pts, TOLERANCE[kind])
        if kind == "subway":
            subway.append({"id": route["route_short_name"], "name": route["route_long_name"], "color": f"#{route['route_color'] or '888888'}", "d": d})
        elif kind == "streetcar":
            streetcar.append(d)
        else:
            bus.append(d)

    data = {
        "source": "TTC GTFS, City of Toronto Open Data",
        "width": WIDTH,
        "height": height,
        "projection": {"lon0": lon0, "lat1": lat1, "kx": kx, "scale": scale},
        "subway": subway,
        "streetcar": "".join(streetcar),
        "bus": "".join(bus),
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"{OUT}: {OUT.stat().st_size / 1024:.0f} KB, {len(subway)} subway, {len(streetcar)} streetcar, {len(bus)} bus routes, {WIDTH}x{height}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
