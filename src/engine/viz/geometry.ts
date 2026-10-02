/**
 * Figure geometry shared by the drawers and the compiler (anchors for looks, points and
 * callouts). Pure maths, no React, so the core can use it.
 */
import { clamp } from "../lib/math";
import type { FigureTrack, PxRect } from "./track";
import type { Typeset } from "./typeset";

/** Base text size for a figure box (px). `unit` = frame width / 1080. */
export const figureFontSize = (rect: Pick<PxRect, "w" | "h">, unit: number) =>
  clamp(Math.min(rect.w, rect.h) * 0.075, 28 * unit, 46 * unit);

/** Plot area inside the figure box: room on the left and bottom for tick labels. */
export const plotFrame = (w: number, h: number, fs: number) => ({
  x0: fs * 2.4,
  x1: w - fs * 0.8,
  y0: h - fs * 1.9,
  y1: fs * 0.8,
});

/** Ellipse size and the star's focus for an orbit figure. */
export const orbitGeometry = (w: number, h: number, e: number, fs: number) => {
  const pad = fs * 1.2;
  const k = Math.sqrt(1 - e * e);
  const a = Math.min((w - 2 * pad) / 2, (h - 2 * pad) / (2 * k));
  return { a, b: a * k, fx: w / 2 + a * e, fy: h / 2 };
};

/** Where a typeset equation lands in its box: scale and offset from MathJax units. */
export const equationFit = (t: Typeset, w: number, h: number) => {
  const [vx, vy, vw, vh] = t.viewBox;
  const s = Math.min(w / vw, h / vh);
  return { s, ox: (w - vw * s) / 2 - vx * s, oy: (h - vh * s) / 2 - vy * s };
};

const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const pair = (v: unknown, d: [number, number]): [number, number] =>
  Array.isArray(v) && v.length === 2 ? [num(v[0], d[0]), num(v[1], d[1])] : d;

export const GENERIC_ANCHORS = ["center", "top", "bottom", "left", "right"] as const;

/** Named points on a figure, box-local px. */
export const localAnchors = (
  f: Pick<FigureTrack, "kind" | "rect" | "base" | "typeset">,
  unit: number,
): Record<string, { x: number; y: number }> => {
  const { w, h } = f.rect;
  const out: Record<string, { x: number; y: number }> = {
    center: { x: w / 2, y: h / 2 },
    top: { x: w / 2, y: 0 },
    bottom: { x: w / 2, y: h },
    left: { x: 0, y: h / 2 },
    right: { x: w, y: h / 2 },
  };
  const fs = figureFontSize(f.rect, unit);
  const p = f.base;
  if (f.kind === "orbit") {
    const e = num(p.e, 0.5);
    const g = orbitGeometry(w, h, e, fs);
    out.star = { x: g.fx, y: g.fy };
    out.perihelion = { x: g.fx + g.a * (1 - e), y: g.fy };
    out.aphelion = { x: g.fx - g.a * (1 + e), y: g.fy };
  }
  if (f.kind === "plot" || f.kind === "axes") {
    const fr = plotFrame(w, h, fs);
    const xr = pair(p.x, [0, 10]);
    const yr = pair(p.y, [0, 10]);
    const ox = fr.x0 + ((clamp(0, xr[0], xr[1]) - xr[0]) / (xr[1] - xr[0])) * (fr.x1 - fr.x0);
    const oy = fr.y0 + ((clamp(0, yr[0], yr[1]) - yr[0]) / (yr[1] - yr[0])) * (fr.y1 - fr.y0);
    out.origin = { x: ox, y: oy };
  }
  if (f.kind === "equation" && f.typeset) {
    const fit = equationFit(f.typeset, w, h);
    for (const part of f.typeset.parts) {
      if (!part.cls) continue;
      const [bx, by, bw, bh] = part.box;
      out[part.cls] = { x: fit.ox + (bx + bw / 2) * fit.s, y: fit.oy + (by + bh / 2) * fit.s };
    }
  }
  return out;
};

/** A figure anchor in stage px (`undefined` when the figure has no such point). */
export const figureAnchor = (
  f: Pick<FigureTrack, "kind" | "rect" | "base" | "typeset">,
  name: string | undefined,
  unit: number,
): { x: number; y: number } | undefined => {
  const local = localAnchors(f, unit)[name ?? "center"];
  return local ? { x: f.rect.x + local.x, y: f.rect.y + local.y } : undefined;
};
