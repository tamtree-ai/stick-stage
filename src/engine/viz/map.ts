/**
 * The `map` figure's world (baked Natural Earth, `pnpm map:data`) and the compile step that
 * turns `zoom` (a code, codes or a lon/lat box) into a numeric `view`, so a `set` cue that
 * changes `zoom` tweens the camera over the map instead of jumping.
 */
import world from "../../data/maps/world-110m.json";
import type { Diagnostic } from "../director/diagnostics";
import { projectBox, WORLD_VIEW } from "./geo";
import type { FigureTrack, Params } from "./track";

export type Region = { id: string; name: string; continent: string; box: number[]; d: string };
export const REGIONS: readonly Region[] = world.regions;
export const REGION_BY_ID: ReadonlyMap<string, Region> = new Map(REGIONS.map((r) => [r.id, r]));
export const MAP_SOURCE = world.source;

type Box = [number, number, number, number];

/** A `zoom` → map-units box with a margin, or an error. */
export const viewOf = (zoom: unknown): Box | string => {
  if (zoom === undefined || zoom === "world") return WORLD_VIEW;
  if (Array.isArray(zoom) && zoom.length === 4 && zoom.every((v) => typeof v === "number")) return pad(projectBox(zoom as number[]));
  const ids = typeof zoom === "string" ? [zoom] : (zoom as string[]);
  const missing = ids.filter((id) => !REGION_BY_ID.has(id));
  if (missing.length) return `no country ${missing.map((m) => `"${m}"`).join(", ")} on the map`;
  const boxes = ids.map((id) => REGION_BY_ID.get(id)!.box);
  return pad([Math.min(...boxes.map((b) => b[0]!)), Math.min(...boxes.map((b) => b[1]!)), Math.max(...boxes.map((b) => b[2]!)), Math.max(...boxes.map((b) => b[3]!))]);
};

const pad = ([x0, y0, x1, y1]: Box): Box => {
  const m = Math.max(x1 - x0, y1 - y0) * 0.18 + 20;
  return [x0 - m, y0 - m, x1 + m, y1 + m];
};

/** Fill each map track's `view` from its `zoom`, in the base params and every key. */
export const resolveMapViews = (tracks: FigureTrack[], diags: Diagnostic[], pathOf: (id: string) => string): void =>
  tracks.forEach((t) => {
    if (t.kind !== "map") return;
    const withView = (p: Params): Params => {
      const v = viewOf(p.zoom);
      if (typeof v === "string") {
        diags.push({ level: "error", code: "map-zoom", path: `${pathOf(t.id)}.params.zoom`, message: v, expected: `"world", an ISO alpha-3 code, a list of codes, or [lon0, lat0, lon1, lat1]` });
        return p;
      }
      return { ...p, view: v };
    };
    t.base = withView(t.base);
    t.keys = t.keys.map((k) => ({ ...k, params: withView(k.params) }));
  });
