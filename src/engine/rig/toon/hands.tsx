import React from "react";
import { f2, type Vec2 } from "../../lib/math";
import type { Pen } from "./kit";
import type { HandShape } from "./schema";

export type { HandShape } from "./schema";

/** A capsule from a to b, `w` wide, in toon units. Fingers point along +x; the thumb is on −y. */
type Capsule = readonly [a: readonly [number, number], b: readonly [number, number], w: number];

const PALM: Capsule = [[6, 0], [16, 0], 30];

const SHAPES: Record<Exclude<HandShape, "hold">, readonly Capsule[]> = {
  open: [PALM, [[18, -9], [40, -11], 8], [[19, -3], [43, -3], 8], [[19, 3], [42, 4], 8], [[17, 9], [36, 11], 8], [[8, -10], [18, -24], 9]],
  wave: [PALM, [[18, -8], [36, -22], 8], [[20, -3], [43, -8], 8], [[20, 3], [43, 6], 8], [[17, 8], [35, 19], 8], [[6, -11], [8, -29], 9]],
  fist: [[[6, 0], [18, 0], 32], [[10, -13], [22, -9], 10]],
  point: [PALM, [[17, -8], [46, -9], 9], [[8, -12], [20, -12], 9]],
  thumb: [[[6, 0], [18, 0], 30], [[6, -12], [5, -34], 10]],
  palmup: [PALM, [[18, 8], [40, 10], 8], [[19, 3], [43, 4], 8], [[19, -3], [42, -2], 8], [[17, -8], [36, -7], 8], [[8, 10], [16, 22], 9]],
};

/** Fingertips that show a nail, per shape (indexes into the shape's capsules). */
const NAILED: Partial<Record<HandShape, readonly number[]>> = { open: [1, 2, 3, 4], wave: [1, 2, 3, 4], palmup: [1, 2, 3, 4], point: [1] };

export type HandProps = {
  shape: HandShape;
  /** Wrist in figure px. */
  at: Vec2;
  /** Screen direction of the forearm, degrees (atan2). */
  angle: number;
  /** Mirror across the forearm: puts the thumb on the other side. */
  flip: boolean;
  skin: string;
  nails?: string;
  pen: Pen;
};

/** One toon hand: outlined capsules (palm, fingers, thumb) in skin. */
export const Hand: React.FC<HandProps> = ({ shape, at, angle, flip, skin, nails, pen }) => {
  const caps = SHAPES[shape === "hold" ? "fist" : shape];
  const o = pen.t.outline;
  const seg = ([a, b]: Capsule) => `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;
  return (
    <g transform={`translate(${f2(at.x)} ${f2(at.y)}) rotate(${f2(angle)}) scale(${f2(pen.u)} ${f2(flip ? -pen.u : pen.u)})`} strokeLinecap="round">
      {caps.map((c, i) => (
        <path key={`o${i}`} d={seg(c)} stroke={pen.ink} strokeWidth={c[2] + 2 * o} />
      ))}
      {caps.map((c, i) => (
        <path key={`f${i}`} d={seg(c)} stroke={skin} strokeWidth={c[2]} />
      ))}
      {nails
        ? (NAILED[shape] ?? []).map((i) => {
            const tip = caps[i]![1];
            return <circle key={`n${i}`} cx={tip[0] - 1} cy={tip[1]} r={3.2} fill={nails} />;
          })
        : null}
    </g>
  );
};
