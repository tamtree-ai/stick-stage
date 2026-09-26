import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { edge, flipAt, partX, SET_LINE, type PartComponent } from "./types";

/** Where building facades meet the sidewalk, behind the characters. */
export const streetBackY = (groundY: number, fig: number) => groundY - fig * 0.18;

/** Far skyline: seeded blocks with window grids, pushed back toward the sky tone. */
export const Buildings: PartComponent = ({ palette, W, groundY, fig, seed }) => {
  const baseY = streetBackY(groundY, fig);
  const tones = [palette.wallA, palette.wallB, palette.shade, mix(palette.detail, palette.wallA, 0.55)].map((c) => mix(c, palette.sky, 0.3));
  const blocks: { x: number; w: number; h: number; fill: string; i: number }[] = [];
  let x = -30 + randRange(seed, "x0", -40, 0);
  for (let i = 0; x < W + 30; i++) {
    const w = W * randRange(seed, `w${i}`, 0.2, 0.34);
    blocks.push({ x, w, h: fig * randRange(seed, `h${i}`, 0.95, 1.75), fill: tones[Math.floor(rand(seed, `c${i}`) * tones.length)]!, i });
    x += w - 2;
  }
  const win = lighten(palette.sky, 0.35);
  const lit = lighten(palette.accent, 0.4);
  return (
    <g>
      {blocks.map((b) => {
        const cw = fig * 0.14;
        const rh = fig * 0.19;
        const cols = Math.max(1, Math.floor((b.w - fig * 0.06) / cw));
        const rows = Math.max(1, Math.floor((b.h - fig * 0.12) / rh));
        const gx = b.x + (b.w - cols * cw) / 2;
        const top = baseY - b.h;
        return (
          <g key={b.i}>
            <rect x={b.x} y={top} width={b.w} height={b.h + 4} fill={b.fill} stroke={edge(b.fill, 0.1)} strokeWidth={SET_LINE} />
            <rect x={b.x - fig * 0.01} y={top - fig * 0.025} width={b.w + fig * 0.02} height={fig * 0.03} fill={darken(b.fill, 0.05)} stroke={edge(b.fill, 0.1)} strokeWidth={SET_LINE} />
            {Array.from({ length: rows * cols }, (_, k) => {
              const c = k % cols;
              const r = Math.floor(k / cols);
              return (
                <rect
                  key={k}
                  x={gx + c * cw + cw * 0.22}
                  y={top + fig * 0.08 + r * rh}
                  width={cw * 0.56}
                  height={rh * 0.55}
                  rx={2}
                  fill={rand(seed, `lit${b.i}-${k}`) > 0.82 ? lit : win}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

/** Sidewalk from the facades to the curb, then the road to the bottom of the frame. */
export const Sidewalk: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const top = streetBackY(groundY, fig);
  const curb = groundY + fig * 0.2;
  const curbH = fig * 0.04;
  const slab = lighten(palette.floor, 0.12);
  const road = mix(palette.detail, palette.floor, 0.45);
  const joints = Array.from({ length: 4 }, (_, i) => W * (0.12 + i * 0.27) + randRange(seed, `j${i}`, -20, 20));
  const dashY = curb + curbH + (H - curb - curbH) * 0.45;
  return (
    <g>
      <rect y={top} width={W} height={curb - top} fill={slab} />
      <line x1={0} x2={W} y1={top} y2={top} stroke={edge(slab, 0.12)} strokeWidth={SET_LINE} />
      {joints.map((x, i) => (
        <line key={i} x1={x} y1={top} x2={x - fig * 0.08} y2={curb} stroke={edge(slab, 0.07)} strokeWidth={SET_LINE} />
      ))}
      <rect y={curb} width={W} height={curbH} fill={lighten(palette.floor, 0.3)} stroke={edge(slab, 0.1)} strokeWidth={SET_LINE} />
      <rect y={curb + curbH} width={W} height={H - curb - curbH} fill={road} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={i * W * 0.26 - W * 0.05} y={dashY} width={W * 0.14} height={fig * 0.018} rx={fig * 0.009} fill={lighten(road, 0.35)} />
      ))}
    </g>
  );
};

const SIGN_ICONS = ["cup", "star", "donut"] as const;

/** Near shop facade at character scale: sign, striped awning, display window, door. */
export const Shopfront: PartComponent = ({ part, palette, W, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 1.25;
  const h = s * 1.32;
  const cx = partX(part, W, marks, 0.5);
  const base = streetBackY(groundY, fig);
  const x0 = cx - w / 2;
  const top = base - h;
  const wall = mix(palette.wallB, palette.shade, 0.3);
  const { glass, wood } = derived(palette);
  const stripeA = mix(palette.accent, palette.wallA, 0.1);
  const stripeB = lighten(palette.accent, 0.6);
  const awnTop = top + s * 0.28;
  const awnBot = awnTop + s * 0.16;
  const stripes = 7;
  const sw = (w + s * 0.08) / stripes;
  const ax = x0 - s * 0.04;
  const winX = x0 + w * 0.06;
  const winW = w * 0.56;
  const winTop = awnBot + s * 0.08;
  const doorX = x0 + w * 0.7;
  const doorW = w * 0.22;
  const icon = SIGN_ICONS[Math.floor(rand(seed, "icon") * SIGN_ICONS.length)]!;
  const signCx = cx;
  const signCy = top + s * 0.13;
  const ink = darken(palette.detail, 0.1);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={x0} y={top} width={w} height={h} fill={wall} stroke={edge(wall, 0.1)} strokeWidth={SET_LINE} />
      <rect x={signCx - w * 0.26} y={signCy - s * 0.07} width={w * 0.52} height={s * 0.14} rx={s * 0.04} fill={lighten(palette.wallA, 0.5)} stroke={edge(wall, 0.12)} strokeWidth={SET_LINE} />
      {icon === "cup" ? (
        <g fill="none" stroke={ink} strokeWidth={SET_LINE * 1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${signCx - s * 0.035} ${signCy - s * 0.03} L ${signCx - s * 0.028} ${signCy + s * 0.035} L ${signCx + s * 0.028} ${signCy + s * 0.035} L ${signCx + s * 0.035} ${signCy - s * 0.03} Z`} />
          <path d={`M ${signCx + s * 0.035} ${signCy - s * 0.015} q ${s * 0.03} ${s * 0.01} 0 ${s * 0.03}`} />
        </g>
      ) : icon === "star" ? (
        <path
          d={Array.from({ length: 10 }, (_, i) => {
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 ? s * 0.02 : s * 0.045;
            return `${i ? "L" : "M"} ${signCx + Math.cos(a) * r} ${signCy + Math.sin(a) * r}`;
          }).join(" ") + " Z"}
          fill={palette.accent}
          stroke={ink}
          strokeWidth={SET_LINE * 1.2}
          strokeLinejoin="round"
        />
      ) : (
        <g>
          <circle cx={signCx} cy={signCy} r={s * 0.045} fill={palette.accent} stroke={ink} strokeWidth={SET_LINE * 1.2} />
          <circle cx={signCx} cy={signCy} r={s * 0.016} fill={lighten(palette.wallA, 0.5)} stroke={ink} strokeWidth={SET_LINE * 1.2} />
        </g>
      )}
      {Array.from({ length: stripes }, (_, i) => (
        <path
          key={i}
          d={`M ${ax + i * sw} ${awnTop} L ${ax + (i + 1) * sw} ${awnTop} L ${ax + (i + 1) * sw} ${awnBot} A ${sw / 2} ${sw / 3} 0 0 1 ${ax + i * sw} ${awnBot} Z`}
          fill={i % 2 ? stripeB : stripeA}
          stroke={edge(stripeA, 0.1)}
          strokeWidth={SET_LINE}
          strokeLinejoin="round"
        />
      ))}
      <rect x={winX} y={winTop} width={winW} height={base - winTop - s * 0.14} fill={glass} stroke={edge(wall, 0.14)} strokeWidth={SET_LINE} />
      {[0.22, 0.4].map((f, i) => (
        <path key={f} d={`M ${winX + winW * f} ${winTop + s * 0.03} l ${-s * 0.12} ${s * 0.3}`} stroke={lighten(glass, 0.6)} strokeWidth={s * (i ? 0.02 : 0.035)} strokeLinecap="round" />
      ))}
      <rect x={winX - s * 0.02} y={base - s * 0.14} width={winW + s * 0.04} height={s * 0.03} fill={lighten(wall, 0.25)} stroke={edge(wall, 0.12)} strokeWidth={SET_LINE} />
      <rect x={doorX} y={awnBot + s * 0.06} width={doorW} height={base - awnBot - s * 0.06} fill={wood} stroke={edge(wood)} strokeWidth={SET_LINE} />
      <rect x={doorX + doorW * 0.18} y={awnBot + s * 0.12} width={doorW * 0.64} height={s * 0.3} rx={s * 0.01} fill={glass} stroke={edge(wood)} strokeWidth={SET_LINE * 0.8} />
      <rect x={doorX + doorW * 0.08} y={base - s * 0.5} width={s * 0.016} height={s * 0.09} rx={s * 0.008} fill={lighten(palette.accent, 0.4)} />
    </g>
  );
};

export const Hydrant: PartComponent = ({ part, palette, W, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.9);
  const base = groundY - fig * 0.04;
  const fill = mix(palette.accent, palette.wallB, 0.2);
  const h = s * 0.24;
  const bw = s * 0.09;
  return (
    <g stroke={edge(fill)} strokeWidth={SET_LINE} strokeLinejoin="round">
      <rect x={cx - bw * 0.7} y={base - s * 0.03} width={bw * 1.4} height={s * 0.03} rx={s * 0.008} fill={darken(fill, 0.06)} />
      <rect x={cx - bw / 2} y={base - h} width={bw} height={h - s * 0.03} rx={s * 0.012} fill={fill} />
      <rect x={cx - bw * 0.95} y={base - h * 0.66} width={bw * 1.9} height={s * 0.045} rx={s * 0.018} fill={darken(fill, 0.04)} />
      <rect x={cx - bw * 0.62} y={base - h - s * 0.02} width={bw * 1.24} height={s * 0.03} rx={s * 0.01} fill={darken(fill, 0.06)} />
      <path d={`M ${cx - bw * 0.45} ${base - h - s * 0.02} Q ${cx} ${base - h - s * 0.1} ${cx + bw * 0.45} ${base - h - s * 0.02} Z`} fill={fill} />
    </g>
  );
};
