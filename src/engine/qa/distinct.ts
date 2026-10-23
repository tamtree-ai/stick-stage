import { proportionsOf, shapeOf, toonOf } from "../rig/build";
import { lookOf } from "../rig/shape/look";
import type { Character } from "../rig/schema";

/** How unlike two characters are. Small numbers are twins. */
export type Distance = { silhouette: number; color: number };

const hex = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  const n = s.length <= 4 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
};

/** RGB distance between two hex colours (0–441). */
export const colorDist = (a: string, b: string): number => {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
};

/** The colour that reads first: the outer layer or top of a toon, the bean of a stick figure. */
const fill = (c: Character): string => {
  const sh = shapeOf(c);
  if (sh) return lookOf(sh).body;
  const t = toonOf(c);
  if (t) return (t.outer ?? t.top).fill;
  return c.style.torso.style === "bean" ? c.style.torso.fill : c.style.headFill;
};
const skin = (c: Character): string => {
  const sh = shapeOf(c);
  return sh ? lookOf(sh).head : (toonOf(c)?.skin ?? c.style.headFill);
};

/** Shape cues a silhouette shows: ears, body, tail, muzzle. */
const shapeCues = (a: Character, b: Character): number => {
  const s = shapeOf(a);
  const t = shapeOf(b);
  if (!s || !t) return s || t ? 0.35 : 0;
  return (s.ears.kind === t.ears.kind ? 0 : 0.2) + (s.body.kind === t.body.kind ? 0 : 0.1) + (s.tail.kind === t.tail.kind ? 0 : 0.1) + (s.muzzle.kind === t.muzzle.kind ? 0 : 0.1);
};

/** Toon shape cues a silhouette shows: the hair mass, the outer layer, skirt vs trousers. */
const toonShape = (a: Character, b: Character): number => {
  const s = toonOf(a);
  const t = toonOf(b);
  if (!s || !t) return s || t ? 0.35 : 0;
  return (s.hair.kind === t.hair.kind ? 0 : 0.2) + (s.outer?.kind === t.outer?.kind ? 0 : 0.1) + (s.bottom.kind === t.bottom.kind ? 0 : 0.2);
};

/** Silhouette (proportions, torso style, toon shape cues) plus colour. The house cast clears both floors. */
export const characterDistance = (a: Character, b: Character): Distance => {
  const p = proportionsOf(a);
  const q = proportionsOf(b);
  const silhouette =
    Math.abs(p.height - q.height) +
    Math.abs(p.headRadius - q.headRadius) * 4 +
    Math.abs(p.torso - q.torso) +
    (shapeOf(a) || shapeOf(b) ? shapeCues(a, b) : toonOf(a) || toonOf(b) ? toonShape(a, b) : a.style.torso.style === b.style.torso.style ? 0 : 0.35);
  const color = colorDist(skin(a), skin(b)) + colorDist(fill(a), fill(b)) * 0.5;
  return { silhouette: +silhouette.toFixed(3), color: +color.toFixed(1) };
};

/** Below both of these, two characters in one skit read as the same person. */
export const DISTINCT_SILHOUETTE = 0.08;
export const DISTINCT_COLOR = 28;

export const tooAlike = (d: Distance): boolean => d.silhouette < DISTINCT_SILHOUETTE && d.color < DISTINCT_COLOR;
