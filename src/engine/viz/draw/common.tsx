import React from "react";
import { clamp, f2 } from "../../lib/math";
import type { VizTheme } from "../theme";

/** What every drawer gets: its params, its box in px (origin top-left), and the moment. */
export type DrawProps<P> = {
  p: P;
  w: number;
  h: number;
  theme: VizTheme;
  /** Reveal progress 0…1. */
  reveal: number;
  /** Seconds since the figure appeared. */
  t: number;
  fontFamily?: string;
  /** Frame px per stage px of the 1080-wide reference (strokes and text scale with it). */
  unit: number;
};

/** Linear map from a math range to px. */
export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Part of the reveal assigned to one step: 0 before `from`, 1 after `to`. */
export const phase = (reveal: number, from: number, to: number) =>
  clamp((reveal - from) / Math.max(1e-6, to - from), 0, 1);

export const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dashed?: boolean;
  head?: number;
}> = ({ x1, y1, x2, y2, color, width, dashed, head }) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return null;
  const hl = Math.min(head ?? width * 4.2, len * 0.45);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * hl;
  const by = y2 - uy * hl;
  const px = -uy * hl * 0.55;
  const py = ux * hl * 0.55;
  return (
    <g>
      <line
        x1={f2(x1)}
        y1={f2(y1)}
        x2={f2(bx)}
        y2={f2(by)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? `${f2(width * 2.2)} ${f2(width * 2)}` : undefined}
      />
      <polygon
        points={`${f2(x2)},${f2(y2)} ${f2(bx + px)},${f2(by + py)} ${f2(bx - px)},${f2(by - py)}`}
        fill={color}
        stroke={color}
        strokeWidth={width * 0.5}
        strokeLinejoin="round"
      />
    </g>
  );
};

/** Text with a halo in the ground colour, so it reads over lines. */
export const Txt: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  halo: string;
  children: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  italic?: boolean;
  fontFamily?: string;
  opacity?: number;
}> = ({
  x,
  y,
  size,
  color,
  halo,
  children,
  anchor = "middle",
  weight = 700,
  italic,
  fontFamily,
  opacity,
}) => (
  <text
    x={f2(x)}
    y={f2(y)}
    fontSize={f2(size)}
    fontFamily={fontFamily}
    fontWeight={weight}
    fontStyle={italic ? "italic" : undefined}
    textAnchor={anchor}
    dominantBaseline="middle"
    fill={color}
    stroke={halo}
    strokeWidth={f2(size * 0.18)}
    paintOrder="stroke"
    strokeLinejoin="round"
    opacity={opacity}
  >
    {children}
  </text>
);

/** Polyline path from points. */
export const pathOf = (pts: readonly { x: number; y: number }[]): string =>
  pts.length ? `M ${pts.map((q) => `${f2(q.x)} ${f2(q.y)}`).join(" L ")}` : "";

/** Nice tick values for a range (1, 2, 5 × 10^k), at most ~`target` of them. */
export const ticks = (lo: number, hi: number, target = 6): number[] => {
  const span = hi - lo;
  if (!(span > 0)) return [];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= target) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step)
    out.push(+v.toFixed(10));
  return out;
};

/** Short number text: 1000 → "1000", 0.5 → "0.5", 1e6 → "10⁶". */
export const numText = (v: number): string => {
  if (v !== 0 && (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3))
    return `10${sup(Math.round(Math.log10(Math.abs(v))))}`;
  return String(+v.toFixed(3));
};

const SUP: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};
/** Integer → superscript digits ("−15" → "⁻¹⁵"). */
export const sup = (n: number): string =>
  String(n)
    .split("")
    .map((c) => SUP[c] ?? c)
    .join("");
