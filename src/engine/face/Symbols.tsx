import React from "react";
import { f2 } from "../lib/math";
import type { SymbolId } from "./schema";
import { Exclaim, Question, SpeedLines } from "./Emanata";

const WATER = "#8fd0f4";
const WATER_LINE = "#3f8fc2";
const BLUSH = "#ff8f9c";
const ANGER = "#e8413c";

export type SymbolsProps = {
  symbols: readonly SymbolId[];
  R: number;
  /** Face center x and eye positions, head-local. */
  faceX: number;
  eyeY: number;
  eyeDx: number;
  frame: number;
  sw: number;
  /** When the symbol set last changed (for entry pops). */
  since: number;
  /** Per-symbol age in frames (symbol events); falls back to `frame - since`. */
  ages?: Partial<Record<SymbolId, number>>;
  stroke?: string;
  mirrored?: boolean;
  seed?: string;
};

const Tear: React.FC<{ x: number; y: number; R: number; frame: number; phase: number; sw: number }> = ({
  x,
  y,
  R,
  frame,
  phase,
  sw,
}) => {
  const wob = Math.sin((frame + phase) * 0.9) * 0.015 * R;
  const w = 0.075 * R + wob;
  const len = 0.62 * R;
  const d = `M ${f2(x - w)} ${f2(y)} C ${f2(x - w * 1.2)} ${f2(y + len * 0.5)} ${f2(x - w * 0.6)} ${f2(y + len)} ${f2(x)} ${f2(y + len)} C ${f2(x + w * 0.6)} ${f2(y + len)} ${f2(x + w * 1.2)} ${f2(y + len * 0.5)} ${f2(x + w)} ${f2(y)} Z`;
  return <path d={d} fill={WATER} stroke={WATER_LINE} strokeWidth={sw * 0.35} strokeLinejoin="round" />;
};

export const Symbols: React.FC<SymbolsProps> = ({
  symbols,
  R,
  faceX,
  eyeY,
  eyeDx,
  frame,
  sw,
  since,
  ages,
  stroke = "#1b1b1f",
  mirrored = false,
  seed = "symbols",
}) => {
  const age = frame - since;
  const ageOf = (id: SymbolId) => ages?.[id] ?? age;
  const mark = { R, frame, stroke, sw, mirrored };
  const popOf = (a: number) => (a < 4 ? 0.6 + 0.4 * (a / 4) + 0.12 * Math.sin((a / 4) * Math.PI) : 1);
  return (
    <g>
      {symbols.includes("blush")
        ? [-1, 1].map((s) => (
            <ellipse
              key={s}
              cx={faceX + s * eyeDx * 1.15}
              cy={eyeY + 0.3 * R}
              rx={0.14 * R}
              ry={0.07 * R}
              fill={BLUSH}
              opacity={0.55}
            />
          ))
        : null}
      {symbols.includes("tears")
        ? [-1, 1].map((s) => (
            <Tear key={s} x={faceX + s * eyeDx} y={eyeY + 0.16 * R} R={R} frame={frame} phase={s * 3} sw={sw} />
          ))
        : null}
      {symbols.includes("sweat") ? (
        <g transform={`translate(${f2(0.86 * R)} ${f2(-0.5 * R + Math.min(ageOf("sweat"), 20) * 0.004 * R)}) scale(${f2(popOf(ageOf("sweat")))})`}>
          <path
            d={`M 0 ${f2(-0.2 * R)} C ${f2(0.12 * R)} ${f2(-0.02 * R)} ${f2(0.12 * R)} ${f2(0.1 * R)} 0 ${f2(0.1 * R)} C ${f2(-0.12 * R)} ${f2(0.1 * R)} ${f2(-0.12 * R)} ${f2(-0.02 * R)} 0 ${f2(-0.2 * R)} Z`}
            fill={WATER}
            stroke={WATER_LINE}
            strokeWidth={sw * 0.4}
            strokeLinejoin="round"
          />
        </g>
      ) : null}
      {symbols.includes("anger") ? (
        <g
          transform={`translate(${f2(0.55 * R)} ${f2(-0.72 * R)}) scale(${f2(popOf(ageOf("anger")) * (1 + 0.06 * Math.sin(frame * 0.8)))})`}
        >
          {[0, 90, 180, 270].map((r) => (
            <path
              key={r}
              transform={`rotate(${r})`}
              d={`M ${f2(0.05 * R)} ${f2(-0.16 * R)} Q ${f2(0.05 * R)} ${f2(-0.05 * R)} ${f2(0.16 * R)} ${f2(-0.05 * R)}`}
              fill="none"
              stroke={ANGER}
              strokeWidth={sw * 0.7}
              strokeLinecap="round"
            />
          ))}
        </g>
      ) : null}
      {symbols.includes("speed-lines") ? <SpeedLines {...mark} age={ageOf("speed-lines")} seed={seed} /> : null}
      {symbols.includes("exclaim") ? <Exclaim {...mark} age={ageOf("exclaim")} /> : null}
      {symbols.includes("question") && !symbols.includes("exclaim") ? <Question {...mark} age={ageOf("question")} /> : null}
    </g>
  );
};
