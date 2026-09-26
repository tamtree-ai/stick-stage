import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { edge, flipAt, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** Outdoor horizon: where the ground plane starts behind the characters. */
export const horizonY = (groundY: number, fig: number) => groundY - fig * 0.34;

/** A smooth closed ridge through seeded heights, filled down to `bottom`. */
const ridge = (seed: string, key: string, W: number, y: number, amp: number, bottom: number, n: number): string => {
  const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: (W * i) / n, y: y - amp * randRange(seed, `${key}${i}`, 0.2, 1) }));
  let d = `M -20 ${bottom} L -20 ${pts[0]!.y}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y} ${mx} ${b.y} ${b.x + (i === n - 1 ? 20 : 0)} ${b.y}`;
  }
  return `${d} L ${W + 20} ${bottom} Z`;
};

/** A puffy cloud: overlapping circles on a flat base. */
const Cloud: React.FC<{ x: number; y: number; s: number; fill: string; seed: string; k: number }> = ({ x, y, s, fill, seed, k }) => {
  const bumps = [-0.55, 0, 0.5].map((f, i) => ({ dx: f * s, r: s * randRange(seed, `c${k}r${i}`, 0.34, 0.5) }));
  return (
    <g fill={fill}>
      <rect x={x - s * 0.85} y={y - s * 0.2} width={s * 1.7} height={s * 0.34} rx={s * 0.17} />
      {bumps.map((b, i) => (
        <circle key={i} cx={x + b.dx} cy={y - b.r * 0.5} r={b.r} />
      ))}
    </g>
  );
};

export const Sky: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const n = 3;
  const clouds = Array.from({ length: n }, (_, i) => ({
    x: W * (0.15 + (0.7 * i) / (n - 1)) + randRange(seed, `x${i}`, -60, 60),
    y: groundY * randRange(seed, `y${i}`, 0.12, 0.42),
    s: fig * randRange(seed, `s${i}`, 0.14, 0.22),
  }));
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.sky} />
      {part.variant === "sun" ? <circle cx={W * 0.78} cy={groundY * 0.2} r={fig * 0.12} fill={lighten(palette.accent, 0.35)} /> : null}
      {clouds.map((c, i) => (
        <Cloud key={i} {...c} fill={lighten(palette.sky, 0.6)} seed={seed} k={i} />
      ))}
    </g>
  );
};

export const Hills: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const hz = horizonY(groundY, fig);
  const far = mix(palette.wallA, palette.sky, 0.3);
  const near = palette.wallB;
  return (
    <g>
      <path d={ridge(seed, "far", W, hz, fig * 0.5, H, 3)} fill={far} stroke={edge(far, 0.08)} strokeWidth={SET_LINE} />
      <path d={ridge(seed, "near", W, hz + fig * 0.02, fig * 0.24, H, 4)} fill={near} stroke={edge(near, 0.08)} strokeWidth={SET_LINE} />
    </g>
  );
};

/** Outdoor ground from the horizon down; `variant: "path"` adds a walkway under the marks. */
export const Grass: PartComponent = ({ part, palette, W, H, groundY, fig, seed }) => {
  const hz = horizonY(groundY, fig);
  const tuft = darken(palette.floor, 0.07);
  const tufts = Array.from({ length: 14 }, (_, i) => ({
    x: W * rand(seed, `tx${i}`),
    y: hz + (H - hz) * randRange(seed, `ty${i}`, 0.08, 0.95),
    s: fig * randRange(seed, `ts${i}`, 0.025, 0.04),
  }));
  const pathTop = groundY - fig * 0.07;
  const pathBottom = groundY + fig * 0.14;
  return (
    <g>
      <rect y={hz} width={W} height={H - hz} fill={palette.floor} />
      <line x1={0} x2={W} y1={hz} y2={hz} stroke={edge(palette.floor, 0.08)} strokeWidth={SET_LINE} />
      {part.variant === "path" ? (
        <g>
          <rect y={pathTop} width={W} height={pathBottom - pathTop} fill={lighten(mix(palette.floor, palette.accent, 0.35), 0.25)} />
          {[pathTop, pathBottom].map((y) => (
            <line key={y} x1={0} x2={W} y1={y} y2={y} stroke={edge(palette.floor, 0.06)} strokeWidth={SET_LINE} />
          ))}
        </g>
      ) : null}
      {tufts
        .filter((t) => part.variant !== "path" || t.y < pathTop - t.s || t.y > pathBottom + t.s)
        .map((t, i) => (
          <path
            key={i}
            d={`M ${t.x - t.s} ${t.y} L ${t.x - t.s * 0.5} ${t.y - t.s} L ${t.x} ${t.y} L ${t.x + t.s * 0.4} ${t.y - t.s * 1.2} L ${t.x + t.s} ${t.y}`}
            fill="none"
            stroke={tuft}
            strokeWidth={SET_LINE * 1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
    </g>
  );
};

/** Leafy canopy: a ring of seeded circles plus one flat shade tone underneath. */
const Canopy: React.FC<{ cx: number; cy: number; r: number; fill: string; seed: string; n: number }> = ({ cx, cy, r, fill, seed, n }) => {
  const blobs = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + randRange(seed, `a${i}`, -0.3, 0.3);
    return { x: cx + Math.cos(a) * r * 0.55, y: cy + Math.sin(a) * r * 0.42, r: r * randRange(seed, `r${i}`, 0.42, 0.56) };
  });
  const line = edge(fill, 0.16);
  return (
    <g>
      {blobs.map((b, i) => (
        <circle key={`o${i}`} cx={b.x} cy={b.y} r={b.r + SET_LINE} fill={line} />
      ))}
      {blobs.map((b, i) => (
        <circle key={`f${i}`} cx={b.x} cy={b.y} r={b.r} fill={fill} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.6} fill={fill} />
      <ellipse cx={cx + r * 0.08} cy={cy + r * 0.3} rx={r * 0.62} ry={r * 0.28} fill={darken(fill, 0.07)} />
    </g>
  );
};

export const Tree: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.85);
  const base = partBase(part, H, groundY);
  const { wood } = derived(palette);
  const trunkH = s * 0.72;
  const tw = s * 0.07;
  const r = s * randRange(seed, "r", 0.32, 0.4);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <path
        d={`M ${cx - tw} ${base} Q ${cx - tw * 0.6} ${base - trunkH * 0.5} ${cx - tw * 0.5} ${base - trunkH} L ${cx + tw * 0.5} ${base - trunkH} Q ${cx + tw * 0.6} ${base - trunkH * 0.5} ${cx + tw} ${base} Z`}
        fill={wood}
        stroke={edge(wood)}
        strokeWidth={SET_LINE}
        strokeLinejoin="round"
      />
      <path d={`M ${cx} ${base - trunkH * 0.62} L ${cx + tw * 2.2} ${base - trunkH * 0.9}`} stroke={wood} strokeWidth={tw * 0.45} strokeLinecap="round" />
      <Canopy cx={cx} cy={base - trunkH - r * 0.35} r={r} fill={derived(palette).foliage} seed={seed} n={7} />
    </g>
  );
};

export const Bush: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.1);
  const base = partBase(part, H, groundY);
  const fill = mix(palette.detail, palette.floor, 0.35);
  const n = 4;
  const blobs = Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1) - 0.5;
    const r = s * randRange(seed, `r${i}`, 0.09, 0.13) * (1 - Math.abs(f) * 0.5);
    return { x: cx + f * s * 0.34, y: base - r * 0.9 - (0.5 - Math.abs(f)) * s * 0.06, r };
  });
  return (
    <g>
      {blobs.map((b, i) => (
        <circle key={`o${i}`} cx={b.x} cy={b.y} r={b.r + SET_LINE} fill={edge(fill, 0.16)} />
      ))}
      {blobs.map((b, i) => (
        <circle key={`f${i}`} cx={b.x} cy={b.y} r={b.r} fill={fill} />
      ))}
      <rect x={cx - s * 0.22} y={base - s * 0.02} width={s * 0.44} height={s * 0.02 + SET_LINE} fill={darken(fill, 0.06)} />
    </g>
  );
};

export const StreetLamp: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.08);
  const base = partBase(part, H, groundY);
  const { metal } = derived(palette);
  const h = s * 1.5;
  const glass = lighten(palette.accent, 0.45);
  const top = base - h;
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={cx - s * 0.018} y={top} width={s * 0.036} height={h} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} />
      <rect x={cx - s * 0.04} y={base - s * 0.12} width={s * 0.08} height={s * 0.12} rx={s * 0.012} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} />
      <path d={`M ${cx - s * 0.07} ${top - s * 0.02} L ${cx + s * 0.07} ${top - s * 0.02} L ${cx + s * 0.05} ${top - s * 0.15} L ${cx - s * 0.05} ${top - s * 0.15} Z`} fill={glass} stroke={edge(metal)} strokeWidth={SET_LINE} strokeLinejoin="round" />
      <path d={`M ${cx - s * 0.085} ${top - s * 0.15} L ${cx + s * 0.085} ${top - s * 0.15} L ${cx} ${top - s * 0.21} Z`} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE} strokeLinejoin="round" />
      <rect x={cx - s * 0.075} y={top - s * 0.025} width={s * 0.15} height={s * 0.025} rx={s * 0.01} fill={metal} />
    </g>
  );
};
