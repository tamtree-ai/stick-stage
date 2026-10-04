import React from "react";
import { f2, type Vec2 } from "../../lib/math";
import { shadeOf, type Pen } from "./kit";

/** How far below the shoe's origin its sole ends, in toon units. */
export const SOLE_DROP = 17;

/** One shoe, toe toward +x. `at` is the ankle end (the origin of the toon-unit drawing). */
export const Shoe: React.FC<{ at: Vec2; back: boolean; pen: Pen }> = ({ at, back, pen }) => {
  const s = pen.t.shoes;
  const o = pen.t.outline;
  const ink = pen.ink;
  const fill = back ? shadeOf(s) : s.fill;
  const body =
    s.kind === "boot" ? (
      <>
        <path d="M-18,12 L-18,-34 L10,-34 L12,-10 Q40,-6 40,12 Z" fill={fill} stroke={ink} strokeWidth={o} strokeLinejoin="round" />
        <path d="M-18,-24 H10" stroke={shadeOf(s)} strokeWidth={5} />
        <path d="M-20,12 H42 v6 H-20Z" fill={s.sole ?? shadeOf(s)} stroke={ink} strokeWidth={o} strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M-22,10 L-22,-22 Q-8,-30 4,-22 L10,-12 Q44,-8 46,10 Z" fill={fill} stroke={ink} strokeWidth={o} strokeLinejoin="round" />
        {s.accent ? <path d="M-10,-6 q14,-8 30,4" fill="none" stroke={s.accent} strokeWidth={7} strokeLinecap="round" /> : null}
        {s.lace ? <path d="M2,-18 l7,4 M8,-13 l7,4" stroke={s.lace} strokeWidth={4} strokeLinecap="round" /> : null}
        <path d="M-24,10 H48 v7 H-24 Z" fill={s.sole ?? fill} stroke={ink} strokeWidth={o} strokeLinejoin="round" />
      </>
    );
  return <g transform={`translate(${f2(at.x)} ${f2(at.y)}) scale(${f2(pen.u)})`}>{body}</g>;
};
