import React, { useId } from "react";
import { f2, lerp } from "../lib/math";
import type { MouthParams } from "./mouths";

const INSIDE = "#4a1d28";
const TONGUE = "#e8707a";
const TEETH = "#ffffff";

export type MouthProps = {
  cx: number;
  cy: number;
  R: number;
  m: MouthParams;
  stroke: string;
  sw: number;
};

/** Cubic edge from a to b whose midpoint lands on `midY`; `round` pushes handles outward. */
const edge = (ax: number, ay: number, bx: number, by: number, cx: number, midY: number, round: number) => {
  const hy = (8 * midY - ay - by) / 6;
  const h1 = lerp(cx, ax, round);
  const h2 = lerp(cx, bx, round);
  return `C ${f2(h1)} ${f2(hy)} ${f2(h2)} ${f2(hy)} ${f2(bx)} ${f2(by)}`;
};

export const Mouth: React.FC<MouthProps> = ({ cx, cy, R, m, stroke, sw }) => {
  const clipId = "mouth" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const half = (m.w * R) / 2;
  const lift = m.curve * 0.12 * R;
  const tilt = m.skew * 0.08 * R;
  const lx = cx - half;
  const ly = cy - lift + tilt;
  const rx = cx + half;
  const ry = cy - lift - tilt;
  const lineW = sw * 0.75;

  if (m.open < 0.03) {
    const qy = 2 * cy - (ly + ry) / 2;
    return (
      <path
        d={`M ${f2(lx)} ${f2(ly)} Q ${f2(cx)} ${f2(qy)} ${f2(rx)} ${f2(ry)}`}
        fill="none"
        stroke={stroke}
        strokeWidth={lineW}
        strokeLinecap="round"
      />
    );
  }

  const openPx = m.open * R;
  const topY = cy - openPx * m.top;
  const botY = cy + openPx * (1 - m.top);
  const d =
    `M ${f2(lx)} ${f2(ly)} ` +
    edge(lx, ly, rx, ry, cx, topY, m.round) +
    " " +
    edge(rx, ry, lx, ly, cx, botY, m.round) +
    " Z";

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={INSIDE} />
      <g clipPath={`url(#${clipId})`}>
        {m.tongue ? (
          <ellipse cx={cx + half * 0.12} cy={botY} rx={half * 0.62} ry={openPx * 0.42} fill={TONGUE} />
        ) : null}
        {m.teeth ? (
          <rect x={lx - 4} y={Math.min(ly, ry, topY) - 4} width={half * 2 + 8} height={Math.max(0, topY - Math.min(ly, ry, topY)) + 4 + openPx * 0.26} fill={TEETH} />
        ) : null}
      </g>
      <path d={d} fill="none" stroke={stroke} strokeWidth={lineW} strokeLinejoin="round" />
    </g>
  );
};
