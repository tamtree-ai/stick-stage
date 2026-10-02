import React, { useId } from "react";
import { darken } from "../../lib/color";
import { f2, type Vec2 } from "../../lib/math";
import type { Toon } from "./schema";

/** Toon units per figure px: the designs were drawn on a 610 px figure. */
export const TOON_UNIT_PX = 610;

/** What every toon part needs: the toon block, units → px, the outline in px and the ink. */
export type Pen = { t: Toon; u: number; o: number; ink: string };

export const makePen = (t: Toon, figurePx: number): Pen => {
  const u = figurePx / TOON_UNIT_PX;
  return { t, u, o: t.outline * u, ink: t.ink };
};

/** The back-side tone of a garment (or skin). */
export const shadeOf = (c: { fill: string; shade?: string }): string => c.shade ?? darken(c.fill, 0.16);

export const polyline = (pts: readonly Vec2[]): string =>
  pts.map((p, i) => `${i ? "L" : "M"} ${f2(p.x)} ${f2(p.y)}`).join(" ");

/** An outlined round-capped stroke: ink underneath, fill on top. `w` is the fill width in px. */
export const Tube: React.FC<{ d: string; w: number; fill: string; pen: Pen; cap?: "round" | "butt" }> = ({ d, w, fill, pen, cap = "round" }) => (
  <g fill="none" strokeLinecap={cap} strokeLinejoin="round">
    <path d={d} stroke={pen.ink} strokeWidth={w + 2 * pen.o} />
    <path d={d} stroke={fill} strokeWidth={w} />
  </g>
);

/**
 * A filled, outlined shape with a cel-shade band on its back side (x < `cut`, local space).
 * Without `shade` it is a plain outlined fill.
 */
export const Shaded: React.FC<{ d: string; fill: string; shade?: string; cut?: number; pen: Pen; sw?: number }> = ({
  d,
  fill,
  shade,
  cut = 0,
  pen,
  sw,
}) => {
  const id = "tsh" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const w = sw ?? pen.o;
  return (
    <g strokeLinejoin="round">
      <path d={d} fill={fill} stroke={pen.ink} strokeWidth={w} />
      {shade ? (
        <>
          <clipPath id={id}>
            <path d={d} />
          </clipPath>
          <rect clipPath={`url(#${id})`} x={cut - 4000} y={-4000} width={4000} height={8000} fill={shade} />
          <path d={d} fill="none" stroke={pen.ink} strokeWidth={w} />
        </>
      ) : null}
    </g>
  );
};

/** A five-point star, outlined. */
export const Star: React.FC<{ x: number; y: number; r: number; fill: string; pen: Pen; sw?: number }> = ({ x, y, r, fill, pen, sw }) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? "L" : "M"}${f2(x + rr * Math.cos(a))},${f2(y + rr * Math.sin(a))}`;
  }
  return <path d={d + "Z"} fill={fill} stroke={pen.ink} strokeWidth={sw ?? pen.o * 0.6} strokeLinejoin="round" />;
};
