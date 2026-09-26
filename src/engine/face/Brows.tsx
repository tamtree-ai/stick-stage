import React from "react";
import { f2 } from "../lib/math";
import type { BrowState } from "./expressions";

export type BrowProps = {
  cx: number;
  /** y of the eye center; the brow sits above it. */
  eyeY: number;
  R: number;
  side: "L" | "R";
  brow: BrowState;
  stroke: string;
  sw: number;
  /** Distance from eye center to resting brow (×R). */
  gap: number;
};

export const Brow: React.FC<BrowProps> = ({ cx, eyeY, R, side, brow, stroke, sw, gap }) => {
  const halfLen = 0.13 * R;
  const y = eyeY - gap * R - brow.raise * 0.1 * R;
  // + tilt lifts the inner end; the inner end of the back (L) eye is its right end.
  const rot = side === "L" ? -brow.tilt : brow.tilt;
  const arch = 0.035 * R;
  const d = `M ${f2(cx - halfLen)} ${f2(y)} Q ${f2(cx)} ${f2(y - arch * 2)} ${f2(cx + halfLen)} ${f2(y)}`;
  return (
    <path
      d={d}
      transform={`rotate(${f2(rot)} ${f2(cx)} ${f2(y)})`}
      fill="none"
      stroke={stroke}
      strokeWidth={sw * 0.78}
      strokeLinecap="round"
    />
  );
};
