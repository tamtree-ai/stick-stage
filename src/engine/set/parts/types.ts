import type React from "react";
import { darken } from "../../lib/color";
import type { Palette } from "../palettes";
import type { SetPart } from "../schema";

export type PartProps = {
  part: SetPart;
  palette: Palette;
  /** Frame size in px. */
  W: number;
  H: number;
  groundY: number;
  /** Standing figure height in px; furniture scales from this. */
  fig: number;
  /** Unique prefix for pattern/def ids. */
  prefix: string;
  seed: string;
  /** Set marks (fractions of frame width) for parts placed with `mark`. */
  marks: Record<string, number>;
};

export type PartComponent = React.FC<PartProps>;

/** Thin set outline: one tone darker than the fill, never the character stroke. */
export const SET_LINE = 3;

/** The outline tone for a fill. */
export const edge = (fill: string, k = 0.14): string => darken(fill, k);

/** Horizontal center in px: `mark` (+ `dx`) wins over `x`, else the part's default. */
export const partX = (part: SetPart, W: number, marks: Record<string, number>, fallback: number): number => {
  if (part.mark !== undefined) {
    const m = marks[part.mark];
    if (m === undefined) throw new Error(`Set part "${part.part}" uses unknown mark "${part.mark}". Known: ${Object.keys(marks).join(", ")}`);
    return (m + part.dx) * W;
  }
  return ((part.x ?? fallback) + part.dx) * W;
};

/** Ground line for floor-standing parts: `y` (fraction of frame height) or the set's groundY. */
export const partBase = (part: SetPart, H: number, groundY: number): number => (part.y !== undefined ? part.y * H : groundY);

/** Mirror a part around its own center (`flip: true`). */
export const flipAt = (flip: boolean, cx: number): string | undefined => (flip ? `translate(${cx * 2} 0) scale(-1 1)` : undefined);
