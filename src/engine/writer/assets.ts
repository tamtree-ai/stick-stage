import { propMeta } from "../catalog";
import type { Action, Beat, SkitDoc } from "../director/schema";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";

/**
 * The missing-asset report: everything a story asks for that the catalog can't draw, each with
 * the cheapest fix on the fallback ladder (plan: shape-toon stories). It never throws; the
 * compiler's own diagnostics still decide whether a document renders.
 *
 * Rungs, cheapest first:
 * - `near`: something close exists; use it (the suggestion).
 * - `spec`: a new shape character written as a spec in the skit's `characters` (minutes).
 * - `place`: describe the place instead of naming a set (`place`, story kit).
 * - `draw`: a new prop or part, drawn once and added to the library (owner approves).
 * - `cheat`: stage around it (cut away, narrate it, hold a still pose).
 */
export type AssetKind = "character" | "prop" | "pose" | "expression" | "set";
export type Rung = "near" | "spec" | "place" | "draw" | "cheat";
export type MissingAsset = { kind: AssetKind; id: string; path: string; rung: Rung; suggestion?: string; note: string };

export type AssetSource = { lib: Library; sets: Readonly<Record<string, SetDef>> };

const lev = (a: string, b: string): number => {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length]!;
};

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** The closest known id: an alias or word match first, then a small edit distance. */
export const nearest = (want: string, known: readonly { id: string; also?: readonly string[] }[]): string | undefined => {
  const w = want.toLowerCase();
  const ws = words(want);
  let best: { id: string; score: number } | undefined;
  for (const k of known) {
    const names = [k.id, ...(k.also ?? [])].map((n) => n.toLowerCase());
    let score = Infinity;
    for (const n of names) {
      if (n === w) score = 0;
      else if (n.includes(w) || w.includes(n)) score = Math.min(score, 1);
      else if (words(n).some((x) => ws.includes(x))) score = Math.min(score, 1.5);
      else score = Math.min(score, lev(w, n));
    }
    if (!best || score < best.score) best = { id: k.id, score };
  }
  return best && best.score <= Math.max(2, Math.floor(w.length / 4)) ? best.id : undefined;
};

/** Every id a story names, with where it is named. */
const mentions = (doc: SkitDoc) => {
  const out: { kind: AssetKind; id: string; path: string }[] = [];
  const add = (kind: AssetKind, id: string | undefined, path: string) => id && out.push({ kind, id, path });
  if (doc.set) add("set", doc.set, "set");
  doc.cast.forEach((c, i) => {
    add("character", c.character, `cast[${i}].character`);
    add("pose", c.pose, `cast[${i}].pose`);
    add("expression", c.expression, `cast[${i}].expression`);
    add("prop", c.holding?.prop, `cast[${i}].holding.prop`);
  });
  const beat = (b: Beat, at: string) => {
    add("expression", b.expression, `${at}.expression`);
    b.actions.forEach((a: Action, k) => {
      const p = `${at}.actions[${k}]`;
      if (a.do === "pose") add("pose", a.pose, `${p}.pose`);
      if (a.do === "expression") add("expression", a.expression, `${p}.expression`);
      if (a.do === "hold") add("prop", a.prop, `${p}.prop`);
    });
  };
  doc.beats?.forEach((b, j) => beat(b, `beats[${j}]`));
  doc.scenes?.forEach((sc, s) => {
    if (sc.set) add("set", sc.set, `scenes[${s}].set`);
    sc.cast?.forEach((c, i) => {
      add("pose", c.pose, `scenes[${s}].cast[${i}].pose`);
      add("expression", c.expression, `scenes[${s}].cast[${i}].expression`);
      add("prop", c.holding?.prop, `scenes[${s}].cast[${i}].holding.prop`);
    });
    sc.beats.forEach((b, j) => beat(b, `scenes[${s}].beats[${j}]`));
  });
  return out;
};

export const missingAssets = (doc: SkitDoc, src: AssetSource): MissingAsset[] => {
  const custom = new Set((doc.characters ?? []).map((c) => c.id));
  const customProps = new Set((doc.props ?? []).map((p) => p.id));
  const props = Object.values(src.lib.props).map((d) => {
    const m = propMeta(d);
    return { id: m.id, also: [m.name, ...m.aliases, ...m.tags] };
  });
  const ids = (r: Readonly<Record<string, unknown>>) => Object.keys(r).map((id) => ({ id }));
  const seen = new Set<string>();
  const out: MissingAsset[] = [];
  for (const m of mentions(doc)) {
    const key = `${m.kind}:${m.id}`;
    const report = (rung: Rung, note: string, suggestion?: string) => {
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ ...m, rung, note, ...(suggestion ? { suggestion } : {}) });
    };
    switch (m.kind) {
      case "character":
        if (!src.lib.characters[m.id] && !custom.has(m.id))
          report("spec", `write "${m.id}" as a shape spec in "characters" (style.build "shape", shape.color, a few part kinds)`, nearest(m.id, ids(src.lib.characters)));
        break;
      case "prop":
        if (!src.lib.props[m.id] && !customProps.has(m.id)) {
          const near = nearest(m.id, props);
          if (near) report("near", `no "${m.id}" prop; "${near}" is close`, near);
          else report("draw", `no "${m.id}" prop or anything like it: draw it once (owner approves), or narrate it instead`);
        }
        break;
      case "pose":
        if (!src.lib.poses[m.id]) {
          const near = nearest(m.id, ids(src.lib.poses));
          report(near ? "near" : "cheat", near ? `no "${m.id}" pose; "${near}" is close` : `no "${m.id}" pose: stage it with an expression and a symbol, or narrate it`, near);
        }
        break;
      case "expression":
        if (!src.lib.expressions[m.id]) {
          const near = nearest(m.id, ids(src.lib.expressions));
          report(near ? "near" : "cheat", near ? `no "${m.id}" expression; "${near}" is close` : `no "${m.id}" expression`, near);
        }
        break;
      case "set":
        if (!src.sets[m.id]) report("place", `no "${m.id}" set: describe it as a "place" (setting, time, features)`, nearest(m.id, ids(src.sets)));
        break;
    }
  }
  return out;
};
