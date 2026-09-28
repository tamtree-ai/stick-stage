import type { Character } from "../rig/schema";

/** How unlike two characters are. Small numbers are twins. */
export type Distance = { silhouette: number; color: number };

const hex = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  const n = s.length <= 4 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
};

const colorDist = (a: string, b: string): number => {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
};

const fill = (c: Character): string => (c.style.torso.style === "bean" ? c.style.torso.fill : c.style.headFill);

/** Silhouette (proportions and torso style) plus colour. The house cast clears both floors. */
export const characterDistance = (a: Character, b: Character): Distance => {
  const p = a.proportions;
  const q = b.proportions;
  const silhouette =
    Math.abs(p.height - q.height) +
    Math.abs(p.headRadius - q.headRadius) * 4 +
    Math.abs(p.torso - q.torso) +
    (a.style.torso.style === b.style.torso.style ? 0 : 0.35);
  const color = colorDist(a.style.headFill, b.style.headFill) + colorDist(fill(a), fill(b)) * 0.5;
  return { silhouette: +silhouette.toFixed(3), color: +color.toFixed(1) };
};

/** Below both of these, two characters in one skit read as the same person. */
export const DISTINCT_SILHOUETTE = 0.08;
export const DISTINCT_COLOR = 28;

export const tooAlike = (d: Distance): boolean => d.silhouette < DISTINCT_SILHOUETTE && d.color < DISTINCT_COLOR;
