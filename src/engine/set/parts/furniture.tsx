import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { SEAT_HEIGHT } from "./seats";
import { edge, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** Seats that span both marks: the cast sits at either end facing each other. */

export const Bench: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.95;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT.bench * s;
  const x0 = cx - w / 2;
  const { wood, metal } = derived(palette);
  const slat = s * 0.035;
  const slats = [seatTop - s * 0.3, seatTop - s * 0.2];
  return (
    <g>
      {[0.1, 0.9].map((f) => (
        <g key={f}>
          <rect x={x0 + w * f - s * 0.018} y={slats[0]! - s * 0.02} width={s * 0.036} height={base - slats[0]! + s * 0.02} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} />
          <rect x={x0 + w * f - s * 0.045} y={base - s * 0.02} width={s * 0.09} height={s * 0.02} rx={s * 0.008} fill={metal} />
        </g>
      ))}
      {slats.map((y) => (
        <rect key={y} x={x0} y={y} width={w} height={slat} rx={slat * 0.3} fill={wood} stroke={edge(wood)} strokeWidth={SET_LINE} />
      ))}
      <rect x={x0 - s * 0.02} y={seatTop} width={w + s * 0.04} height={slat * 1.2} rx={slat * 0.3} fill={lighten(wood, 0.08)} stroke={edge(wood)} strokeWidth={SET_LINE} />
    </g>
  );
};

export const Couch: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 1.0;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT.couch * s;
  const x0 = cx - w / 2;
  const fill = mix(palette.accent, palette.wallB, 0.45);
  const dark = darken(fill, 0.06);
  const backTop = seatTop - s * 0.26;
  const arm = s * 0.1;
  const legH = s * 0.035;
  const pillow = lighten(palette.accent, 0.25);
  return (
    <g stroke={edge(fill)} strokeWidth={SET_LINE} strokeLinejoin="round">
      <rect x={x0 + arm * 0.6} y={backTop} width={w - arm * 1.2} height={seatTop - backTop + s * 0.04} rx={s * 0.05} fill={dark} />
      {[0, 1].map((i) => (
        <line key={i} x1={x0 + arm + ((w - 2 * arm) * (i + 1)) / 3} x2={x0 + arm + ((w - 2 * arm) * (i + 1)) / 3} y1={backTop + s * 0.04} y2={seatTop - s * 0.02} stroke={edge(dark, 0.08)} />
      ))}
      <rect
        x={x0 + arm + s * 0.02}
        y={seatTop - s * 0.13}
        width={s * 0.12}
        height={s * 0.12}
        rx={s * 0.03}
        fill={pillow}
        stroke={edge(pillow)}
        transform={`rotate(${randRange(seed, "pillow", -14, -6)} ${x0 + arm + s * 0.08} ${seatTop - s * 0.07})`}
      />
      <rect x={x0 + arm * 0.5} y={seatTop} width={w - arm} height={base - legH - seatTop} rx={s * 0.03} fill={fill} />
      <line x1={x0 + arm} x2={x0 + w - arm} y1={seatTop + s * 0.05} y2={seatTop + s * 0.05} stroke={edge(fill, 0.08)} />
      {[x0, x0 + w - arm].map((x) => (
        <rect key={x} x={x} y={seatTop - s * 0.1} width={arm} height={base - legH - seatTop + s * 0.1} rx={arm * 0.45} fill={fill} />
      ))}
      {[x0 + arm * 0.5, x0 + w - arm * 0.5].map((x) => (
        <rect key={x} x={x - s * 0.02} y={base - legH} width={s * 0.04} height={legH} fill={darken(fill, 0.2)} stroke="none" />
      ))}
    </g>
  );
};
