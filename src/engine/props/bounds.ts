import type { CodedKind, DrawnPart, PropDef } from "./schema";
import { isDrawn } from "./schema";
import { pathPoints } from "./path";

/**
 * Prop outlines in prop-local space: origin = grip point (where the hand is), up = −y,
 * in units of `u`. Used to rest a dropped prop on the floor.
 */
export const PROP_BOUNDS: Record<CodedKind, { x0: number; x1: number; y0: number; y1: number }> = {
  phone: { x0: -0.03, x1: 0.03, y0: -0.085, y1: 0.025 },
  mic: { x0: -0.03, x1: 0.03, y0: -0.12, y1: 0.04 },
  cup: { x0: -0.02, x1: 0.1, y0: -0.05, y1: 0.035 },
  laptop: { x0: -0.1, x1: 0.1, y0: -0.13, y1: 0.012 },
  sign: { x0: -0.15, x1: 0.15, y0: -0.49, y1: 0.06 },
};

export type PropBox = { x0: number; x1: number; y0: number; y1: number };

const empty = (): PropBox => ({ x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });

const add = (b: PropBox, x: number, y: number) => {
  b.x0 = Math.min(b.x0, x);
  b.x1 = Math.max(b.x1, x);
  b.y0 = Math.min(b.y0, y);
  b.y1 = Math.max(b.y1, y);
};

/** SVG clockwise rotation around a center, matching `rotate(deg cx cy)`. */
const rot = (x: number, y: number, cx: number, cy: number, deg: number): [number, number] => {
  if (!deg) return [x, y];
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + dx * c + dy * s, cy - dx * s + dy * c];
};

const grow = (b: PropBox, xs: number[], ys: number[], cx: number, cy: number, angle?: number) => {
  for (let i = 0; i < xs.length; i++) {
    const [x, y] = rot(xs[i]!, ys[i]!, cx, cy, angle ?? 0);
    add(b, x, y);
  }
};

const partBox = (part: DrawnPart, b: PropBox) => {
  const angle = part.angle;
  if (part.shape === "rect") {
    const cx = part.x + part.w / 2;
    const cy = part.y + part.h / 2;
    grow(b, [part.x, part.x + part.w, part.x, part.x + part.w], [part.y, part.y, part.y + part.h, part.y + part.h], cx, cy, angle);
  } else if (part.shape === "circle") {
    grow(b, [part.x - part.r, part.x + part.r], [part.y, part.y], part.x, part.y, angle);
    grow(b, [part.x, part.x], [part.y - part.r, part.y + part.r], part.x, part.y, angle);
  } else if (part.shape === "ellipse") {
    grow(b, [part.x - part.rx, part.x + part.rx], [part.y, part.y], part.x, part.y, angle);
    grow(b, [part.x, part.x], [part.y - part.ry, part.y + part.ry], part.x, part.y, angle);
  } else if (part.shape === "poly") {
    const cx = part.points.reduce((s, p) => s + p[0], 0) / part.points.length;
    const cy = part.points.reduce((s, p) => s + p[1], 0) / part.points.length;
    for (const [x, y] of part.points) {
      const [rx, ry] = rot(x, y, cx, cy, angle ?? 0);
      add(b, rx, ry);
    }
  } else if (part.shape === "line") {
    const cx = (part.x1 + part.x2) / 2;
    const cy = (part.y1 + part.y2) / 2;
    grow(b, [part.x1, part.x2], [part.y1, part.y2], cx, cy, angle);
  } else {
    const pts = pathPoints(part.d);
    if (!pts.length) return;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    for (const p of pts) {
      const [x, y] = rot(p.x, p.y, cx, cy, angle ?? 0);
      add(b, x, y);
    }
  }
};

/** Axis-aligned bounds of a drawn prop's parts, in prop units. */
export const drawnBounds = (parts: readonly DrawnPart[]): PropBox => {
  const b = empty();
  for (const part of parts) partBox(part, b);
  if (!Number.isFinite(b.x0)) return { x0: 0, x1: 0, y0: 0, y1: 0 };
  return b;
};

/** Coded kinds use the hand-kept table. Drawn kinds are measured from their parts. */
export const propBounds = (def: PropDef): PropBox => (isDrawn(def) ? drawnBounds(def.parts) : PROP_BOUNDS[def.kind]);
