import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { FittedLines } from "../../text/FittedLines";
import { SEAT_HEIGHT } from "./seats";
import { edge, flipAt, partBase, partX, SET_LINE, type PartComponent } from "./types";

export const Door: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.5;
  const h = s * 1.12;
  const cx = partX(part, W, marks, 0.8);
  const base = partBase(part, H, groundY);
  const x0 = cx - w / 2;
  const top = base - h;
  const t = s * 0.035;
  const frame = lighten(palette.wallB, 0.45);
  const slab = mix(palette.accent, palette.wallB, 0.35);
  const inset = darken(slab, 0.05);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <path d={`M ${x0 - t} ${base} L ${x0 - t} ${top - t} L ${x0 + w + t} ${top - t} L ${x0 + w + t} ${base}`} fill={frame} stroke={edge(frame)} strokeWidth={SET_LINE} />
      <rect x={x0} y={top} width={w} height={h} fill={slab} stroke={edge(slab)} strokeWidth={SET_LINE} />
      {[0.08, 0.5].map((f) => (
        <rect key={f} x={x0 + w * 0.16} y={top + h * f} width={w * 0.68} height={h * 0.36} rx={s * 0.01} fill={inset} stroke={edge(slab, 0.1)} strokeWidth={SET_LINE * 0.7} />
      ))}
      <circle cx={x0 + w * 0.84} cy={top + h * 0.5} r={s * 0.022} fill={lighten(palette.accent, 0.5)} stroke={edge(slab)} strokeWidth={SET_LINE * 0.8} />
    </g>
  );
};

export const Clock: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => {
  const r = fig * 0.09 * part.size;
  const cx = partX(part, W, marks, 0.5);
  const cy = (part.y ?? 0.2) * H;
  const face = lighten(palette.wallA, 0.75);
  const rim = mix(palette.detail, palette.wallB, 0.3);
  const hour = rand(seed, "h") * 360;
  const minute = rand(seed, "m") * 360;
  const hand = (deg: number, l: number, w: number) => {
    const a = (deg * Math.PI) / 180;
    return <line x1={cx} y1={cy} x2={cx + Math.sin(a) * l} y2={cy - Math.cos(a) * l} stroke={darken(rim, 0.25)} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={face} stroke={rim} strokeWidth={r * 0.16} />
      <circle cx={cx} cy={cy} r={r * 1.08} fill="none" stroke={edge(rim)} strokeWidth={SET_LINE} />
      {[0, 90, 180, 270].map((d) => {
        const a = (d * Math.PI) / 180;
        return <circle key={d} cx={cx + Math.sin(a) * r * 0.7} cy={cy - Math.cos(a) * r * 0.7} r={r * 0.06} fill={rim} />;
      })}
      {hand(hour, r * 0.42, SET_LINE * 1.6)}
      {hand(minute, r * 0.62, SET_LINE * 1.1)}
      <circle cx={cx} cy={cy} r={r * 0.07} fill={darken(rim, 0.25)} />
    </g>
  );
};

export const Whiteboard: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 0.86;
  const h = s * 0.52;
  const cx = partX(part, W, marks, 0.5);
  const top = (part.y ?? 0.16) * H;
  const x0 = cx - w / 2;
  const { metal, paper } = derived(palette);
  const frame = lighten(metal, 0.35);
  const ink = [palette.detail, palette.accent, mix(palette.sky, palette.detail, 0.5)];
  const bars = [0, 1, 2, 3].map((i) => randRange(seed, `bar${i}`, 0.25, 0.9));
  const chartX = x0 + w * 0.08;
  const chartY = top + h * 0.84;
  const bw = w * 0.07;
  const lines = [0, 1, 2].map((i) => randRange(seed, `line${i}`, 0.2, 0.34));
  return (
    <g>
      <rect x={x0} y={top} width={w} height={h} rx={s * 0.012} fill={paper} stroke={frame} strokeWidth={s * 0.018} />
      <rect x={x0 - s * 0.009} y={top - s * 0.009} width={w + s * 0.018} height={h + s * 0.018} rx={s * 0.016} fill="none" stroke={edge(frame)} strokeWidth={SET_LINE} />
      <path d={`M ${chartX} ${top + h * 0.12} L ${chartX} ${chartY} L ${chartX + w * 0.42} ${chartY}`} fill="none" stroke={ink[0]} strokeWidth={SET_LINE * 1.3} strokeLinecap="round" strokeLinejoin="round" />
      {bars.map((b, i) => (
        <rect key={i} x={chartX + w * 0.04 + i * bw * 1.4} y={chartY - b * h * 0.66} width={bw} height={b * h * 0.66} fill={ink[i % 2 ? 1 : 2]} opacity={0.75} />
      ))}
      {lines.map((l, i) => (
        <line key={i} x1={x0 + w * 0.58} x2={x0 + w * (0.58 + l)} y1={top + h * (0.22 + i * 0.16)} y2={top + h * (0.22 + i * 0.16)} stroke={ink[0]} strokeWidth={SET_LINE * 1.3} strokeLinecap="round" opacity={0.7} />
      ))}
      <path
        d={`M ${x0 + w * 0.6} ${top + h * 0.78} q ${w * 0.05} ${-h * 0.12} ${w * 0.1} 0 t ${w * 0.1} 0 t ${w * 0.1} 0`}
        fill="none"
        stroke={ink[1]}
        strokeWidth={SET_LINE * 1.3}
        strokeLinecap="round"
      />
      <rect x={x0 + w * 0.3} y={top + h + s * 0.01} width={w * 0.4} height={s * 0.018} rx={s * 0.006} fill={frame} stroke={edge(frame)} strokeWidth={SET_LINE * 0.7} />
      <rect x={x0 + w * 0.36} y={top + h} width={w * 0.07} height={s * 0.013} rx={s * 0.005} fill={palette.accent} />
    </g>
  );
};

export const Cabinet: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.32;
  const h = s * 0.62;
  const cx = partX(part, W, marks, 0.88);
  const base = partBase(part, H, groundY);
  const x0 = cx - w / 2;
  const body = mix(palette.detail, palette.wallA, 0.45);
  const drawers = 3;
  const dh = (h - s * 0.04) / drawers;
  return (
    <g>
      <rect x={x0} y={base - h} width={w} height={h} rx={s * 0.01} fill={body} stroke={edge(body)} strokeWidth={SET_LINE} />
      {Array.from({ length: drawers }, (_, i) => {
        const y = base - h + s * 0.02 + i * dh;
        return (
          <g key={i}>
            <rect x={x0 + s * 0.02} y={y + s * 0.008} width={w - s * 0.04} height={dh - s * 0.016} rx={s * 0.008} fill={lighten(body, 0.12)} stroke={edge(body, 0.08)} strokeWidth={SET_LINE * 0.7} />
            <rect x={cx - w * 0.16} y={y + dh * 0.24} width={w * 0.32} height={dh * 0.14} rx={2} fill={lighten(body, 0.5)} />
            <rect x={cx - w * 0.2} y={y + dh * 0.5} width={w * 0.4} height={s * 0.016} rx={s * 0.008} fill={darken(body, 0.18)} />
          </g>
        );
      })}
    </g>
  );
};

/**
 * Foreground desk (draws over a seated character). Canonical: the sitter is on the left
 * facing right, the monitor on the right; `flip` mirrors for a left-facing sitter.
 * Variants: "monitor" (default), "laptop", "clear".
 */
export const Desk: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks, fontFamily }) => {
  const s = fig * part.size;
  const w = s * 0.76;
  const topH = s * 0.34;
  const slab = s * 0.036;
  const cx = partX(part, W, marks, 0.45);
  const base = partBase(part, H, groundY);
  const x0 = cx - w / 2;
  const top = base - topH;
  const { wood, metal, paper } = derived(palette);
  const panel = mix(wood, palette.wallB, 0.35);
  const variant = part.variant ?? "monitor";
  const pedX = x0 + w * 0.66;
  const pedW = w * 0.3;
  const mug = mix(palette.accent, palette.wallA, 0.2);
  const monX = x0 + w * 0.56;
  const monW = w * 0.3;
  const monH = s * 0.19;
  const hasPapers = rand(seed, "papers") > 0.4;
  return (
    <g transform={flipAt(part.flip, cx)}>
      {/* Leg at the sitter's end, modesty panel, drawer pedestal at the far end. */}
      <rect x={x0 + w * 0.03} y={top} width={s * 0.035} height={topH} fill={darken(panel, 0.08)} stroke={edge(panel)} strokeWidth={SET_LINE} />
      <rect x={x0 + w * 0.03} y={top} width={pedX - x0 - w * 0.03} height={topH * 0.52} fill={darken(panel, 0.04)} stroke={edge(panel)} strokeWidth={SET_LINE} />
      <rect x={pedX} y={top} width={pedW} height={topH} fill={panel} stroke={edge(panel)} strokeWidth={SET_LINE} />
      {[0, 1, 2].map((i) => {
        const dh = (topH - slab) / 3;
        const y = top + slab + i * dh;
        return (
          <g key={i}>
            <rect x={pedX + s * 0.012} y={y + s * 0.008} width={pedW - s * 0.024} height={dh - s * 0.016} rx={s * 0.006} fill={lighten(panel, 0.1)} stroke={edge(panel, 0.08)} strokeWidth={SET_LINE * 0.7} />
            <rect x={pedX + pedW * 0.35} y={y + dh * 0.42} width={pedW * 0.3} height={s * 0.014} rx={s * 0.007} fill={darken(panel, 0.2)} />
          </g>
        );
      })}
      <rect x={x0 - s * 0.02} y={top} width={w + s * 0.04} height={slab} rx={slab * 0.3} fill={lighten(wood, 0.12)} stroke={edge(wood)} strokeWidth={SET_LINE} />
      {variant === "monitor" ? (
        <g>
          <rect x={monX + monW * 0.44} y={top - s * 0.06} width={monW * 0.12} height={s * 0.06} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.8} />
          <rect x={monX + monW * 0.25} y={top - s * 0.012} width={monW * 0.5} height={s * 0.012} rx={s * 0.006} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.8} />
          <rect x={monX} y={top - s * 0.06 - monH} width={monW} height={monH} rx={s * 0.014} fill={mix(metal, palette.wallA, 0.25)} stroke={edge(metal)} strokeWidth={SET_LINE} />
          {part.screen ? (
            <FittedLines text={part.screen} cx={monX + monW / 2} cy={top - s * 0.06 - monH / 2} width={monW * 0.82} height={monH * 0.72} fill={lighten(paper, 0.2)} fontFamily={fontFamily ?? "sans-serif"} mirrored={part.flip} />
          ) : (
            <circle cx={monX + monW / 2} cy={top - s * 0.06 - monH / 2} r={s * 0.012} fill={lighten(metal, 0.3)} />
          )}
          <rect x={x0 + w * 0.2} y={top - s * 0.012} width={w * 0.26} height={s * 0.012} rx={s * 0.005} fill={lighten(metal, 0.2)} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
        </g>
      ) : variant === "laptop" ? (
        <g stroke={edge(metal)} strokeWidth={SET_LINE} strokeLinejoin="round">
          <rect x={x0 + w * 0.3} y={top - s * 0.014} width={w * 0.3} height={s * 0.014} rx={s * 0.005} fill={lighten(metal, 0.2)} />
          <path d={`M ${x0 + w * 0.6} ${top - s * 0.014} L ${x0 + w * 0.66} ${top - s * 0.2} L ${x0 + w * 0.69} ${top - s * 0.2} L ${x0 + w * 0.63} ${top - s * 0.014} Z`} fill={metal} />
        </g>
      ) : null}
      <g>
        <rect x={x0 + w * 0.9 - s * 0.03} y={top - s * 0.065} width={s * 0.06} height={s * 0.065} rx={s * 0.012} fill={mug} stroke={edge(mug)} strokeWidth={SET_LINE} />
        <path d={`M ${x0 + w * 0.9 + s * 0.03} ${top - s * 0.05} q ${s * 0.03} ${s * 0.015} 0 ${s * 0.035}`} fill="none" stroke={edge(mug)} strokeWidth={SET_LINE * 1.3} />
      </g>
      {hasPapers
        ? [0, 1].map((i) => (
            <rect
              key={i}
              x={x0 + w * 0.02}
              y={top - s * 0.012 * (i + 1)}
              width={w * 0.16}
              height={s * 0.012}
              fill={paper}
              stroke={edge(paper, 0.2)}
              strokeWidth={SET_LINE * 0.7}
              transform={`rotate(${randRange(seed, `p${i}`, -3, 3)} ${x0 + w * 0.1} ${top})`}
            />
          ))
        : null}
    </g>
  );
};

/**
 * Office chair seen from the side. Canonical: the sitter faces right, so the backrest is on
 * the left. Seat top sits at `SEAT_HEIGHT.chair` of figure height above the base.
 */
export const OfficeChair: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.3);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT.chair * s;
  const cushion = mix(palette.detail, palette.shade, 0.35);
  const { metal } = derived(palette);
  const seatL = cx - s * 0.15;
  const seatR = cx + s * 0.13;
  const backX = cx - s * 0.135;
  return (
    <g transform={flipAt(part.flip, cx)}>
      <path d={`M ${backX + s * 0.03} ${seatTop} L ${backX + s * 0.01} ${seatTop - s * 0.09}`} stroke={metal} strokeWidth={s * 0.022} strokeLinecap="round" />
      <rect x={backX - s * 0.035} y={seatTop - s * 0.4} width={s * 0.07} height={s * 0.32} rx={s * 0.035} fill={cushion} stroke={edge(cushion)} strokeWidth={SET_LINE} transform={`rotate(-6 ${backX} ${seatTop - s * 0.1})`} />
      <rect x={cx - s * 0.012} y={seatTop} width={s * 0.024} height={base - seatTop - s * 0.04} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
      <path d={`M ${cx - s * 0.15} ${base - s * 0.03} L ${cx} ${base - s * 0.05} L ${cx + s * 0.15} ${base - s * 0.03}`} fill="none" stroke={metal} strokeWidth={s * 0.02} strokeLinecap="round" strokeLinejoin="round" />
      {[-0.15, 0, 0.15].map((f) => (
        <circle key={f} cx={cx + f * s} cy={base - s * 0.016} r={s * 0.016} fill={darken(metal, 0.15)} />
      ))}
      <rect x={seatL} y={seatTop} width={seatR - seatL} height={s * 0.045} rx={s * 0.022} fill={cushion} stroke={edge(cushion)} strokeWidth={SET_LINE} />
    </g>
  );
};
