import React from "react";
import { darken, lighten } from "../lib/color";
import { FittedLines } from "../text/FittedLines";
import type { PropDef, PropKind } from "./schema";

export { PROP_BOUNDS } from "./bounds";

export type PropDrawProps = {
  def: PropDef;
  /** Unit: standing figure height in px (× prop size). */
  u: number;
  stroke: string;
  sw: number;
  /** The rig is mirrored (facing left): counter-flip text so it stays readable. */
  mirrored: boolean;
  fontFamily: string;
};

const Phone: React.FC<PropDrawProps> = ({ def, u, stroke, sw }) => {
  const w = 0.056 * u;
  const h = 0.1 * u;
  const y0 = -0.08 * u;
  return (
    <g>
      <rect x={-w / 2} y={y0} width={w} height={h} rx={w * 0.22} fill={def.colors.body} stroke={stroke} strokeWidth={sw} />
      <rect x={-w / 2 + w * 0.16} y={y0 + h * 0.11} width={w * 0.68} height={h * 0.72} rx={w * 0.08} fill={def.colors.screen ?? lighten(def.colors.body, 0.7)} />
    </g>
  );
};

const Mic: React.FC<PropDrawProps> = ({ def, u, stroke, sw }) => {
  const head = 0.03 * u;
  const accent = def.colors.accent ?? lighten(def.colors.body, 0.6);
  return (
    <g>
      <path d={`M ${-0.016 * u} ${0.035 * u} L ${-0.021 * u} ${-0.07 * u} L ${0.021 * u} ${-0.07 * u} L ${0.016 * u} ${0.035 * u} Z`} fill={def.colors.body} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={-0.024 * u} y={-0.078 * u} width={0.048 * u} height={0.014 * u} rx={0.005 * u} fill={accent} stroke={stroke} strokeWidth={sw * 0.8} />
      <circle cx={0} cy={-0.078 * u - head * 0.85} r={head} fill={accent} stroke={stroke} strokeWidth={sw} />
      <path
        d={`M ${-head * 0.55} ${-0.078 * u - head * 1.35} L ${head * 0.55} ${-0.078 * u - head * 0.35} M ${head * 0.55} ${-0.078 * u - head * 1.35} L ${-head * 0.55} ${-0.078 * u - head * 0.35}`}
        stroke={darken(accent, 0.25)}
        strokeWidth={sw * 0.45}
        strokeLinecap="round"
      />
    </g>
  );
};

const Cup: React.FC<PropDrawProps> = ({ def, u, stroke, sw }) => {
  const top = -0.045 * u;
  const bot = 0.03 * u;
  const x0 = -0.005 * u;
  const x1 = 0.075 * u;
  const accent = def.colors.accent ?? darken(def.colors.body, 0.2);
  return (
    <g>
      <path d={`M ${x0} ${-0.025 * u} q ${-0.03 * u} ${0.01 * u} ${-0.005 * u} ${0.035 * u}`} fill="none" stroke={stroke} strokeWidth={sw * 0.9} strokeLinecap="round" />
      <path d={`M ${x0} ${top} L ${x1} ${top} L ${x1 - 0.008 * u} ${bot} L ${x0 + 0.008 * u} ${bot} Z`} fill={def.colors.body} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={x0 + 0.004 * u} y={top + 0.024 * u} width={x1 - x0 - 0.008 * u} height={0.02 * u} fill={accent} />
      <path d={`M ${x0} ${top} L ${x1} ${top} L ${x1 - 0.008 * u} ${bot} L ${x0 + 0.008 * u} ${bot} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
};

const Laptop: React.FC<PropDrawProps> = ({ def, u, stroke, sw, mirrored, fontFamily }) => {
  const w = 0.17 * u;
  const h = 0.11 * u;
  const base = -0.004 * u;
  const screenTop = base - 0.015 * u - h + 0.012 * u;
  const screenH = h - 0.024 * u;
  return (
    <g strokeLinejoin="round">
      <rect x={-w / 2} y={base - 0.015 * u - h} width={w} height={h} rx={0.01 * u} fill={def.colors.body} stroke={stroke} strokeWidth={sw} />
      <rect x={-w / 2 + 0.012 * u} y={screenTop} width={w - 0.024 * u} height={screenH} rx={0.004 * u} fill={def.colors.screen ?? lighten(def.colors.body, 0.6)} />
      {def.screen ? <FittedLines text={def.screen} cx={0} cy={screenTop + screenH / 2} width={w - 0.03 * u} height={screenH * 0.86} fill={stroke} fontFamily={fontFamily} mirrored={mirrored} /> : null}
      <path d={`M ${-w * 0.58} ${base - 0.015 * u} L ${w * 0.58} ${base - 0.015 * u} L ${w * 0.52} ${base + 0.012 * u} L ${-w * 0.52} ${base + 0.012 * u} Z`} fill={def.colors.body} stroke={stroke} strokeWidth={sw} />
    </g>
  );
};

const Sign: React.FC<PropDrawProps> = ({ def, u, stroke, sw, mirrored, fontFamily }) => {
  const w = 0.3 * u;
  const h = 0.17 * u;
  const stickTop = -0.32 * u;
  const cy = stickTop - h / 2;
  const text = def.text ?? "";
  const fontSize = Math.min(h * 0.52, (w * 1.55) / Math.max(1, text.length));
  const stick = def.colors.accent ?? darken(def.colors.body, 0.3);
  return (
    <g>
      <rect x={-0.012 * u} y={stickTop} width={0.024 * u} height={0.38 * u} rx={0.008 * u} fill={stick} stroke={stroke} strokeWidth={sw * 0.8} />
      <rect x={-w / 2} y={cy - h / 2} width={w} height={h} rx={0.012 * u} fill={def.colors.body} stroke={stroke} strokeWidth={sw} />
      {text ? (
        <text
          x={0}
          y={cy}
          transform={mirrored ? `scale(-1 1)` : undefined}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={fontFamily}
          fontWeight={900}
          fontSize={fontSize}
          fill={stroke}
        >
          {text}
        </text>
      ) : null}
    </g>
  );
};

export const PROP_DRAW: Record<PropKind, React.FC<PropDrawProps>> = {
  phone: Phone,
  mic: Mic,
  cup: Cup,
  laptop: Laptop,
  sign: Sign,
};
