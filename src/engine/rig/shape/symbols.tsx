import React from "react";
import type { SymbolId } from "../../face/schema";
import { clamp, f2 } from "../../lib/math";

/**
 * The shape tier's own tears, sweat and blush: flat fills with a highlight, no outline, so they
 * match the figures (the shared `Symbols` draws outlined marks for the stick and toon tiers).
 * Head-local px, radius `R`, facing +x.
 */

const WATER = "#a9d8f2";
const SHINE = "#eef8fd";
/** These three are drawn here; the rest (!, ?, anger, speed lines, spray) stay with `Symbols`. */
export const SHAPE_DRAWN_SYMBOLS: readonly SymbolId[] = ["tears", "sweat", "blush"];

/** A rounded drop pointing up, `r` its round end's radius, centred on its round end. */
const Drop: React.FC<{ x: number; y: number; r: number; opacity?: number }> = ({
  x,
  y,
  r,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    <path
      d={`M${f2(x)},${f2(y - r * 1.9)} C${f2(x + r * 0.35)},${f2(y - r * 1.2)} ${f2(x + r)},${f2(y - r * 0.6)} ${f2(x + r)},${f2(y)} A${f2(r)},${f2(r)} 0 0 1 ${f2(x - r)},${f2(y)} C${f2(x - r)},${f2(y - r * 0.6)} ${f2(x - r * 0.35)},${f2(y - r * 1.2)} ${f2(x)},${f2(y - r * 1.9)} Z`}
      fill={WATER}
    />
    <ellipse cx={x - r * 0.35} cy={y - r * 0.2} rx={r * 0.22} ry={r * 0.32} fill={SHINE} />
  </g>
);

/** Tears: a drop wells up under each eye, runs down the cheek and fades, again and again. */
const Tears: React.FC<{ eyes: readonly number[]; eyeY: number; R: number; frame: number }> = ({
  eyes,
  eyeY,
  R,
  frame,
}) => (
  <g>
    {eyes.map((x, i) => {
      const cycle = 34;
      const t = ((frame + i * 15) % cycle) / cycle;
      const grow = clamp(t / 0.25, 0, 1);
      const run = clamp((t - 0.25) / 0.75, 0, 1);
      const r = 0.06 * R * (0.5 + 0.5 * grow);
      return (
        <Drop
          key={i}
          x={x - 0.02 * R}
          y={eyeY + 0.18 * R + run * 0.5 * R}
          r={r}
          opacity={1 - run * run}
        />
      );
    })}
  </g>
);

export const ShapeSymbols: React.FC<{
  symbols: readonly SymbolId[];
  R: number;
  eyes: readonly number[];
  eyeY: number;
  frame: number;
  /** Frames since each symbol appeared, for its entry. */
  ageOf: (id: SymbolId) => number;
  cheeks: string;
}> = ({ symbols, R, eyes, eyeY, frame, ageOf, cheeks }) => (
  <g>
    {symbols.includes("blush")
      ? eyes.map((x, i) => (
          <ellipse
            key={i}
            cx={x + (i ? 0.08 : -0.08) * R}
            cy={eyeY + 0.26 * R}
            rx={0.13 * R}
            ry={0.075 * R}
            fill={cheeks}
            opacity={0.7}
          />
        ))
      : null}
    {symbols.includes("tears") ? <Tears eyes={eyes} eyeY={eyeY} R={R} frame={frame} /> : null}
    {symbols.includes("sweat")
      ? (() => {
          const a = ageOf("sweat");
          const pop = a < 5 ? 0.5 + 0.5 * (a / 5) : 1;
          return (
            <Drop x={0.82 * R} y={-0.42 * R + Math.min(a, 24) * 0.004 * R} r={0.085 * R * pop} />
          );
        })()
      : null}
  </g>
);

/** Blush for a shape face: the character's cheek colour, or a rose leaning toward its own hue. */
export const blushOf = (cheeks?: string): string => cheeks ?? "#f29aa8";
