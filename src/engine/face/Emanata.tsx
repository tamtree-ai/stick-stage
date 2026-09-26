import React from "react";
import { easeOutBack } from "../lib/easing";
import { f2 } from "../lib/math";
import { rand } from "../lib/seed";

/** Comic marks around the head: "!", "?" and speed lines. Head-local, canonical right-facing. */

const HALO = "#ffffff";
const POP_FRAMES = 5;

/** Entry scale: springs in from 0 with an overshoot, then holds at 1. */
export const popIn = (age: number): number => (age >= POP_FRAMES ? 1 : Math.max(0, easeOutBack((age + 1) / POP_FRAMES, 2.2)));

type MarkProps = { R: number; age: number; frame: number; stroke: string; sw: number; mirrored: boolean };

/** Draw twice: a wide white halo, then the ink, so marks read over any background. */
const Inked: React.FC<{ d: string; sw: number; stroke: string; fill?: boolean }> = ({ d, sw, stroke, fill }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    <path d={d} fill={fill ? HALO : "none"} stroke={HALO} strokeWidth={sw * 2.4} />
    <path d={d} fill={fill ? stroke : "none"} stroke={stroke} strokeWidth={sw} />
  </g>
);

export const Exclaim: React.FC<MarkProps> = ({ R, age, frame, stroke, sw }) => {
  const s = popIn(age);
  const jitter = age < 12 ? Math.sin(frame * 2.1) * 3 : 0;
  const w = 0.13 * R;
  const bar = `M ${f2(-w)} ${f2(-0.62 * R)} L ${f2(w)} ${f2(-0.62 * R)} L ${f2(w * 0.35)} ${f2(-0.14 * R)} L ${f2(-w * 0.35)} ${f2(-0.14 * R)} Z`;
  const dot = `M ${f2(-0.07 * R)} ${f2(0.02 * R)} a ${f2(0.07 * R)} ${f2(0.07 * R)} 0 1 0 ${f2(0.14 * R)} 0 a ${f2(0.07 * R)} ${f2(0.07 * R)} 0 1 0 ${f2(-0.14 * R)} 0`;
  return (
    <g transform={`translate(${f2(0.78 * R)} ${f2(-0.95 * R)}) rotate(${f2(14 + jitter)}) scale(${f2(s)})`}>
      <Inked d={bar} sw={sw * 0.7} stroke={stroke} fill />
      <Inked d={dot} sw={sw * 0.7} stroke={stroke} fill />
    </g>
  );
};

export const Question: React.FC<MarkProps> = ({ R, age, frame, stroke, sw, mirrored }) => {
  const s = popIn(age);
  const tilt = 12 + Math.sin(frame * 0.18) * 7;
  const hook = `M ${f2(-0.2 * R)} ${f2(-0.5 * R)} C ${f2(-0.2 * R)} ${f2(-0.78 * R)} ${f2(0.22 * R)} ${f2(-0.8 * R)} ${f2(0.22 * R)} ${f2(-0.52 * R)} C ${f2(0.22 * R)} ${f2(-0.34 * R)} ${f2(0)} ${f2(-0.32 * R)} ${f2(0)} ${f2(-0.14 * R)}`;
  const dot = `M ${f2(-0.065 * R)} ${f2(0.04 * R)} a ${f2(0.065 * R)} ${f2(0.065 * R)} 0 1 0 ${f2(0.13 * R)} 0 a ${f2(0.065 * R)} ${f2(0.065 * R)} 0 1 0 ${f2(-0.13 * R)} 0`;
  // Inside a mirrored rig, flip the glyph back so "?" never reads backwards.
  return (
    <g transform={`translate(${f2(0.8 * R)} ${f2(-0.95 * R)}) rotate(${f2(tilt)}) scale(${f2(s * (mirrored ? -1 : 1))} ${f2(s)})`}>
      <Inked d={hook} sw={sw * 1.1} stroke={stroke} />
      <Inked d={dot} sw={sw * 0.6} stroke={stroke} fill />
    </g>
  );
};

/** Shock/focus lines radiating from the head; they flicker in length every other frame. */
export const SpeedLines: React.FC<MarkProps & { seed: string }> = ({ R, age, frame, stroke, sw, seed }) => {
  const n = 9;
  const grow = popIn(age);
  const tick = Math.floor(frame / 2);
  return (
    <g stroke={stroke} strokeWidth={sw * 0.55} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        // Spread over the top half, skipping the face side's lower quadrant.
        const deg = -165 + (150 * i) / (n - 1) + (rand(seed, `a${i}`) - 0.5) * 10;
        const a = (deg * Math.PI) / 180;
        const r0 = R * (1.22 + 0.08 * rand(seed, `r${i}-${tick}`));
        const len = R * (0.22 + 0.16 * rand(seed, `l${i}-${tick}`)) * grow;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return <line key={i} x1={f2(c * r0)} y1={f2(s * r0)} x2={f2(c * (r0 + len))} y2={f2(s * (r0 + len))} />;
      })}
    </g>
  );
};
