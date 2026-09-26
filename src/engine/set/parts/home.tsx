import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { SEAT_HEIGHT } from "./seats";
import { edge, flipAt, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** Base cabinets with a worktop; `variant: "cafe"` puts an espresso machine and cups on top, else a pot and fruit. */
export const Counter: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 1.2;
  const h = s * 0.5;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const x0 = cx - w / 2;
  const top = base - h;
  const { metal, paper } = derived(palette);
  const body = mix(palette.wallB, palette.detail, 0.35);
  const slab = lighten(palette.shade, 0.35);
  const doors = 3;
  const dw = w / doors;
  const ledge = top - s * 0.04;
  const cup = (x: number, i: number) => (
    <g key={i}>
      <rect x={x} y={ledge - s * 0.06} width={s * 0.05} height={s * 0.06} rx={s * 0.008} fill={i % 2 ? paper : palette.accent} stroke={edge(palette.accent)} strokeWidth={SET_LINE * 0.8} />
      <path d={`M ${x + s * 0.05} ${ledge - s * 0.048} q ${s * 0.022} ${s * 0.012} 0 ${s * 0.03}`} fill="none" stroke={edge(palette.accent)} strokeWidth={SET_LINE * 0.8} />
    </g>
  );
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={x0} y={top} width={w} height={h} fill={body} stroke={edge(body)} strokeWidth={SET_LINE} />
      {Array.from({ length: doors }, (_, i) => (
        <g key={i}>
          <rect x={x0 + i * dw + s * 0.02} y={top + s * 0.03} width={dw - s * 0.04} height={h - s * 0.06} rx={s * 0.01} fill={lighten(body, 0.1)} stroke={edge(body, 0.08)} strokeWidth={SET_LINE * 0.7} />
          <rect x={x0 + i * dw + dw * (i % 2 ? 0.2 : 0.72)} y={top + h * 0.2} width={s * 0.014} height={h * 0.18} rx={s * 0.007} fill={darken(body, 0.2)} />
        </g>
      ))}
      <rect x={x0 - s * 0.03} y={ledge} width={w + s * 0.06} height={s * 0.04} rx={s * 0.008} fill={slab} stroke={edge(slab)} strokeWidth={SET_LINE} />
      {part.variant === "cafe" ? (
        <g>
          <rect x={x0 + w * 0.08} y={ledge - s * 0.24} width={s * 0.2} height={s * 0.24} rx={s * 0.02} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} />
          <rect x={x0 + w * 0.08 + s * 0.03} y={ledge - s * 0.2} width={s * 0.14} height={s * 0.05} rx={s * 0.01} fill={lighten(metal, 0.3)} />
          <rect x={x0 + w * 0.08 + s * 0.085} y={ledge - s * 0.14} width={s * 0.03} height={s * 0.05} fill={darken(metal, 0.2)} />
          {[0.5, 0.58, 0.66].map((f, i) => cup(x0 + w * f, i))}
          <rect x={x0 + w * 0.8} y={ledge - s * 0.12} width={s * 0.14} height={s * 0.12} rx={s * 0.01} fill={lighten(palette.sky, 0.35)} stroke={edge(palette.sky)} strokeWidth={SET_LINE} opacity={0.9} />
          {[0, 1].map((i) => (
            <circle key={i} cx={x0 + w * 0.8 + s * (0.04 + i * 0.06)} cy={ledge - s * 0.035} r={s * 0.025} fill={mix(palette.accent, palette.detail, 0.3)} />
          ))}
        </g>
      ) : (
        <g>
          <rect x={x0 + w * 0.12} y={ledge - s * 0.1} width={s * 0.17} height={s * 0.1} rx={s * 0.012} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} />
          <rect x={x0 + w * 0.12 - s * 0.01} y={ledge - s * 0.115} width={s * 0.19} height={s * 0.02} rx={s * 0.01} fill={lighten(metal, 0.2)} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
          <path d={`M ${x0 + w * 0.7} ${ledge} a ${s * 0.1} ${s * 0.06} 0 0 1 ${s * 0.2} 0 Z`} fill={paper} stroke={edge(paper, 0.2)} strokeWidth={SET_LINE} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={x0 + w * 0.7 + s * (0.06 + i * 0.045)} cy={ledge - s * (0.055 + (i % 2) * 0.02)} r={s * randRange(seed, `fruit${i}`, 0.026, 0.034)} fill={i === 1 ? palette.detail : palette.accent} stroke={edge(palette.accent)} strokeWidth={SET_LINE * 0.7} />
          ))}
        </g>
      )}
    </g>
  );
};

export const Fridge: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 0.42;
  const h = s * 1.05;
  const cx = partX(part, W, marks, 0.88);
  const base = partBase(part, H, groundY);
  const x0 = cx - w / 2;
  const top = base - h;
  const { paper } = derived(palette);
  const body = lighten(mix(palette.wallA, palette.sky, 0.3), 0.35);
  const split = top + h * 0.34;
  const handle = darken(body, 0.18);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={x0} y={top} width={w} height={h} rx={s * 0.03} fill={body} stroke={edge(body, 0.2)} strokeWidth={SET_LINE} />
      <line x1={x0} x2={x0 + w} y1={split} y2={split} stroke={edge(body, 0.2)} strokeWidth={SET_LINE} />
      <rect x={x0 + w * 0.84} y={top + h * 0.12} width={s * 0.022} height={h * 0.14} rx={s * 0.011} fill={handle} />
      <rect x={x0 + w * 0.84} y={split + h * 0.06} width={s * 0.022} height={h * 0.22} rx={s * 0.011} fill={handle} />
      <rect
        x={x0 + w * 0.22}
        y={split + h * 0.1}
        width={s * 0.12}
        height={s * 0.15}
        fill={paper}
        stroke={edge(paper, 0.2)}
        strokeWidth={SET_LINE * 0.8}
        transform={`rotate(${randRange(seed, "note", -8, 8)} ${x0 + w * 0.28} ${split + h * 0.17})`}
      />
      <circle cx={x0 + w * 0.36} cy={split + h * 0.1} r={s * 0.018} fill={palette.accent} />
      <circle cx={x0 + w * 0.3} cy={top + h * 0.16} r={s * 0.02} fill={palette.detail} />
      <rect x={x0 + w * 0.08} y={base - s * 0.02} width={w * 0.84} height={s * 0.02} fill={darken(body, 0.25)} />
    </g>
  );
};

/** Side-on bed spanning both marks (a seat): headboard left, footboard right, blanket and pillow. */
export const Bed: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 1.05;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT.bed * s;
  const x0 = cx - w / 2;
  const { wood, paper } = derived(palette);
  const blanket = mix(palette.accent, palette.wallB, 0.3);
  const legH = s * 0.04;
  return (
    <g transform={flipAt(part.flip, cx)} strokeWidth={SET_LINE} strokeLinejoin="round">
      <rect x={x0 - s * 0.05} y={seatTop - s * 0.3} width={s * 0.06} height={base - seatTop + s * 0.3} rx={s * 0.02} fill={wood} stroke={edge(wood)} />
      <rect x={x0 + w - s * 0.01} y={seatTop - s * 0.1} width={s * 0.06} height={base - seatTop + s * 0.1} rx={s * 0.02} fill={wood} stroke={edge(wood)} />
      <rect x={x0} y={seatTop + s * 0.04} width={w} height={base - legH - seatTop - s * 0.04} fill={darken(wood, 0.05)} stroke={edge(wood)} />
      <rect x={x0} y={seatTop - s * 0.01} width={w} height={s * 0.07} rx={s * 0.03} fill={paper} stroke={edge(paper, 0.2)} />
      <rect
        x={x0 + s * 0.03}
        y={seatTop - s * 0.09}
        width={s * 0.2}
        height={s * 0.09}
        rx={s * 0.04}
        fill={lighten(palette.sky, 0.4)}
        stroke={edge(palette.sky)}
        transform={`rotate(${randRange(seed, "pillow", -5, 2)} ${x0 + s * 0.13} ${seatTop - s * 0.05})`}
      />
      <path d={`M ${x0 + w * 0.36} ${seatTop - s * 0.015} L ${x0 + w} ${seatTop - s * 0.015} L ${x0 + w} ${seatTop + s * 0.1} L ${x0 + w * 0.4} ${seatTop + s * 0.12} Z`} fill={blanket} stroke={edge(blanket)} />
      <line x1={x0 + w * 0.36} x2={x0 + w} y1={seatTop + s * 0.02} y2={seatTop + s * 0.02} stroke={lighten(blanket, 0.3)} strokeWidth={SET_LINE * 2} />
      {[x0 + s * 0.02, x0 + w - s * 0.02].map((x) => (
        <rect key={x} x={x - s * 0.02} y={base - legH} width={s * 0.04} height={legH} fill={darken(wood, 0.2)} stroke="none" />
      ))}
    </g>
  );
};

/** Flat TV on a low media console. */
export const Tv: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.82);
  const base = partBase(part, H, groundY);
  const { wood } = derived(palette);
  const cw = s * 0.62;
  const ch = s * 0.2;
  const tw = s * 0.54;
  const th = s * 0.32;
  const standTop = base - ch;
  const screenTop = standTop - s * 0.05 - th;
  const bezel = darken(mix(palette.detail, palette.wallB, 0.3), 0.3);
  const screen = mix(palette.sky, palette.detail, 0.45);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={cx - s * 0.015} y={screenTop + th} width={s * 0.03} height={s * 0.05} fill={bezel} />
      <rect x={cx - tw / 2} y={screenTop} width={tw} height={th} rx={s * 0.01} fill={bezel} stroke={edge(bezel)} strokeWidth={SET_LINE} />
      <rect x={cx - tw / 2 + s * 0.015} y={screenTop + s * 0.015} width={tw - s * 0.03} height={th - s * 0.03} fill={screen} />
      <path d={`M ${cx - tw * 0.3} ${screenTop + s * 0.015} L ${cx - tw * 0.12} ${screenTop + s * 0.015} L ${cx - tw * 0.36} ${screenTop + th - s * 0.015} L ${cx - tw * 0.48 + s * 0.015} ${screenTop + th - s * 0.015} Z`} fill={lighten(screen, 0.25)} />
      <rect x={cx - cw / 2} y={standTop} width={cw} height={ch} rx={s * 0.01} fill={wood} stroke={edge(wood)} strokeWidth={SET_LINE} />
      {[0.25, 0.75].map((f) => (
        <rect key={f} x={cx - cw / 2 + cw * f - s * 0.12} y={standTop + s * 0.03} width={s * 0.24} height={ch - s * 0.06} rx={s * 0.01} fill={lighten(wood, 0.08)} stroke={edge(wood, 0.08)} strokeWidth={SET_LINE * 0.7} />
      ))}
    </g>
  );
};

export const FloorLamp: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.1);
  const base = partBase(part, H, groundY);
  const { metal } = derived(palette);
  const top = base - s * 0.95;
  const shade = lighten(palette.accent, 0.3);
  return (
    <g>
      <ellipse cx={cx} cy={top + s * 0.14} rx={s * 0.3} ry={s * 0.22} fill={lighten(palette.accent, 0.6)} opacity={0.35} />
      <rect x={cx - s * 0.012} y={top} width={s * 0.024} height={base - top} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
      <ellipse cx={cx} cy={base - s * 0.01} rx={s * 0.08} ry={s * 0.018} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
      <path d={`M ${cx - s * 0.07} ${top - s * 0.14} L ${cx + s * 0.07} ${top - s * 0.14} L ${cx + s * 0.12} ${top + s * 0.02} L ${cx - s * 0.12} ${top + s * 0.02} Z`} fill={shade} stroke={edge(shade)} strokeWidth={SET_LINE} strokeLinejoin="round" />
    </g>
  );
};
