/**
 * Bakes the `map` figure's world: Natural Earth 1:110m countries (public domain) → projected
 * SVG paths in src/data/maps/world-110m.json. No network: download the GeoJSON first.
 *   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
 *   pnpm map:data ne_110m_admin_0_countries.geojson
 */
import fs from "node:fs";
import path from "node:path";
import { project } from "../src/engine/viz/geo";

type Ring = [number, number][];
type Feature = { properties: Record<string, string | number | null>; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] } };

const src = process.argv[2];
if (!src) throw new Error("usage: pnpm map:data <ne_110m_admin_0_countries.geojson>");
const fc = JSON.parse(fs.readFileSync(src, "utf8")) as { features: Feature[] };

const area = (r: [number, number][]) => Math.abs(r.reduce((a, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]!; return a + x * y2 - x2 * y; }, 0) / 2);

const regions = fc.features.flatMap((f) => {
  const p = f.properties;
  // NE leaves ISO_A3 as -99 for a few (France, Norway): fall back to the admin code.
  const id = String(p.ISO_A3 !== "-99" ? p.ISO_A3 : p.ADM0_A3);
  if (id === "ATA") return [];
  const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][];
  const projected = polys.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => project(lon, lat).map((v) => Math.round(v)) as [number, number])));
  const d = projected.map((poly) => poly.map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join("L")}Z`).join("")).join("");
  // The zoom box covers the main landmass and anything near its size (not French Guiana for France).
  const biggest = Math.max(...projected.map((poly) => area(poly[0]!)));
  const main = projected.filter((poly) => area(poly[0]!) >= biggest * 0.25).flatMap((poly) => poly[0]!);
  const xs = main.map((q) => q[0]);
  const ys = main.map((q) => q[1]);
  return [{ id, name: String(p.NAME), continent: String(p.CONTINENT), box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], d }];
});
regions.sort((a, b) => a.id.localeCompare(b.id));
const out = path.resolve(import.meta.dirname, "../src/data/maps/world-110m.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ source: "Natural Earth 1:110m Admin 0 countries (public domain), naturalearthdata.com", projection: "natural-earth-1 x1000", regions }) + "\n");
console.log(`${regions.length} regions → ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
