/** Science kits: `abstract` (void, grid floor, blueprint), `space` (stars, nebula, planet), `lab`. */
import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { f2 } from "../../lib/math";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { edge, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** A soft vertical gradient wall with a lighter pool of light behind the stage centre. */
export const VoidBackdrop: PartComponent = ({ part, palette, W, H, groundY, prefix }) => {
  const id = `${prefix}-void`;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.wallB} />
          <stop offset="1" stopColor={palette.wallA} />
        </linearGradient>
        <radialGradient id={`${id}-r`} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor={lighten(palette.wallA, 0.08)} />
          <stop offset="1" stopColor={palette.wallA} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-g)`} />
      <ellipse cx={(part.x ?? 0.5) * W} cy={groundY * 0.5} rx={W * 0.7 * part.size} ry={groundY * 0.5} fill={`url(#${id}-r)`} />
    </g>
  );
};

/** Floor with a perspective grid running to a vanishing point above the stage. */
export const GridFloor: PartComponent = ({ palette, W, H, groundY, fig }) => {
  const line = lighten(palette.floor, 0.18);
  const vy = groundY - fig * 0.9;
  const rows = [0.06, 0.15, 0.28, 0.46, 0.72];
  return (
    <g>
      <rect y={groundY} width={W} height={H - groundY} fill={palette.floor} />
      <line x1={0} x2={W} y1={groundY} y2={groundY} stroke={lighten(palette.floor, 0.28)} strokeWidth={SET_LINE * 1.4} />
      {Array.from({ length: 13 }, (_, i) => {
        const x = W * (-0.5 + (2 * i) / 12);
        const t = (groundY - vy) / (H - vy);
        return <line key={`v${i}`} x1={f2(W / 2 + (x - W / 2) * t)} y1={groundY} x2={f2(x)} y2={H} stroke={line} strokeWidth={SET_LINE} opacity={0.7} />;
      })}
      {rows.map((r, i) => (
        <line key={`h${i}`} x1={0} x2={W} y1={f2(groundY + (H - groundY) * r)} y2={f2(groundY + (H - groundY) * r)} stroke={line} strokeWidth={SET_LINE} opacity={0.7} />
      ))}
    </g>
  );
};

/** Blueprint paper: fine and major grid, a few drafting marks. */
export const Blueprint: PartComponent = ({ palette, W, groundY, fig, seed }) => {
  const minor = fig * 0.05;
  const line = palette.detail;
  const marks = [0, 1].map((i) => ({ x: W * randRange(seed, `mx${i}`, 0.12, 0.88), y: groundY * randRange(seed, `my${i}`, 0.1, 0.35), r: fig * randRange(seed, `mr${i}`, 0.04, 0.08) }));
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.wallA} />
      {Array.from({ length: Math.ceil(W / minor) + 1 }, (_, i) => (
        <line key={`x${i}`} x1={i * minor} x2={i * minor} y1={0} y2={groundY} stroke={line} strokeWidth={i % 5 ? 1 : SET_LINE * 0.8} opacity={i % 5 ? 0.25 : 0.45} />
      ))}
      {Array.from({ length: Math.ceil(groundY / minor) + 1 }, (_, i) => (
        <line key={`y${i}`} y1={i * minor} y2={i * minor} x1={0} x2={W} stroke={line} strokeWidth={i % 5 ? 1 : SET_LINE * 0.8} opacity={i % 5 ? 0.25 : 0.45} />
      ))}
      {marks.map((m, i) => (
        <g key={i} stroke={lighten(line, 0.3)} strokeWidth={SET_LINE} fill="none" opacity={0.5}>
          <circle cx={m.x} cy={m.y} r={m.r} />
          <line x1={m.x - m.r * 1.4} x2={m.x + m.r * 1.4} y1={m.y} y2={m.y} />
          <line y1={m.y - m.r * 1.4} y2={m.y + m.r * 1.4} x1={m.x} x2={m.x} />
        </g>
      ))}
    </g>
  );
};

/** Seeded stars over the sky colour (a few bright ones with a cross glint). */
export const Starfield: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const n = Math.round(90 * part.size);
  const star = lighten(palette.sky, 0.8);
  const warm = lighten(palette.accent, 0.4);
  return (
    <g>
      <rect width={W} height={groundY + 2} fill={palette.sky} />
      {Array.from({ length: n }, (_, i) => {
        const x = W * rand(seed, `x${i}`);
        const y = groundY * rand(seed, `y${i}`);
        const r = fig * (rand(seed, `b${i}`) > 0.92 ? 0.007 : randRange(seed, `r${i}`, 0.0018, 0.004));
        const c = rand(seed, `c${i}`) > 0.8 ? warm : star;
        return (
          <g key={i} opacity={randRange(seed, `o${i}`, 0.55, 1)}>
            <circle cx={f2(x)} cy={f2(y)} r={f2(r)} fill={c} />
            {r > fig * 0.006 ? <path d={`M ${f2(x - r * 3)} ${f2(y)} H ${f2(x + r * 3)} M ${f2(x)} ${f2(y - r * 3)} V ${f2(y + r * 3)}`} stroke={c} strokeWidth={1.5} /> : null}
          </g>
        );
      })}
    </g>
  );
};

/** A faint nebula: overlapping seeded blobs in two tones. */
export const Nebula: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const cx = partX(part, W, {}, 0.7);
  const cy = (part.y ?? 0.25) * groundY;
  const s = fig * 0.5 * part.size;
  const tones = [mix(palette.sky, palette.accent, 0.35), mix(palette.sky, palette.detail, 0.6)];
  return (
    <g opacity={0.55}>
      {Array.from({ length: 9 }, (_, i) => (
        <ellipse key={i} cx={f2(cx + s * randRange(seed, `x${i}`, -1, 1))} cy={f2(cy + s * randRange(seed, `y${i}`, -0.5, 0.5))} rx={f2(s * randRange(seed, `rx${i}`, 0.25, 0.6))} ry={f2(s * randRange(seed, `ry${i}`, 0.15, 0.35))} fill={tones[i % 2]} opacity={randRange(seed, `o${i}`, 0.25, 0.5)} />
      ))}
    </g>
  );
};

/** A banded planet (or a moon with `variant: "moon"`). */
export const Planet: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => {
  const cx = partX(part, W, marks, 0.8);
  const cy = (part.y ?? 0.2) * H;
  const r = fig * 0.16 * part.size;
  const base = part.variant === "moon" ? lighten(palette.detail, 0.45) : mix(palette.accent, palette.detail, 0.3);
  const id = `planet-${seed.replace(/[^A-Za-z0-9]/g, "")}`;
  return (
    <g>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r} fill={base} stroke={edge(base)} strokeWidth={SET_LINE} />
      <g clipPath={`url(#${id})`}>
        {part.variant === "moon"
          ? [0, 1, 2].map((i) => <circle key={i} cx={f2(cx + r * randRange(seed, `cx${i}`, -0.5, 0.5))} cy={f2(cy + r * randRange(seed, `cy${i}`, -0.5, 0.5))} r={f2(r * randRange(seed, `cr${i}`, 0.1, 0.2))} fill={darken(base, 0.12)} />)
          : [-0.45, -0.1, 0.3].map((b, i) => <rect key={i} x={cx - r} y={f2(cy + b * r)} width={r * 2} height={f2(r * randRange(seed, `bh${i}`, 0.08, 0.16))} fill={darken(base, 0.1 + 0.05 * i)} />)}
        <circle cx={cx + r * 0.35} cy={cy + r * 0.3} r={r} fill={darken(palette.sky, 0.1)} opacity={0.35} />
      </g>
    </g>
  );
};

/** A lab bench with glassware on top. */
export const LabBench: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const w = s * 0.9;
  const top = base - s * 0.42;
  const { metal, glass } = derived(palette);
  const body = mix(palette.wallB, palette.detail, 0.45);
  const liquids = [palette.accent, palette.detail, mix(palette.accent, palette.sky, 0.5)];
  return (
    <g>
      <rect x={cx - w / 2} y={top} width={w} height={base - top} fill={body} stroke={edge(body)} strokeWidth={SET_LINE} />
      <rect x={cx - w / 2 - s * 0.02} y={top - s * 0.035} width={w + s * 0.04} height={s * 0.04} fill={darken(body, 0.2)} />
      {[0.25, 0.5, 0.75].map((f, i) => <line key={i} x1={cx - w / 2 + w * f} x2={cx - w / 2 + w * f} y1={top + s * 0.06} y2={base - s * 0.03} stroke={edge(body)} strokeWidth={SET_LINE} />)}
      {[-0.3, -0.05, 0.22].map((dx, i) => {
        const gx = cx + dx * w;
        const gh = s * randRange(seed, `h${i}`, 0.1, 0.16);
        const gw = s * 0.06;
        const y0 = top - s * 0.035;
        const flask = i % 2 === 0;
        const d = flask
          ? `M ${f2(gx - gw * 0.25)} ${f2(y0 - gh)} L ${f2(gx - gw * 0.25)} ${f2(y0 - gh * 0.55)} L ${f2(gx - gw)} ${f2(y0)} L ${f2(gx + gw)} ${f2(y0)} L ${f2(gx + gw * 0.25)} ${f2(y0 - gh * 0.55)} L ${f2(gx + gw * 0.25)} ${f2(y0 - gh)} Z`
          : `M ${f2(gx - gw * 0.5)} ${f2(y0 - gh)} L ${f2(gx - gw * 0.5)} ${f2(y0)} L ${f2(gx + gw * 0.5)} ${f2(y0)} L ${f2(gx + gw * 0.5)} ${f2(y0 - gh)} Z`;
        return (
          <g key={i}>
            <path d={d} fill={glass} stroke={metal} strokeWidth={SET_LINE} strokeLinejoin="round" />
            <rect x={gx - gw} y={y0 - gh * 0.35} width={gw * 2} height={gh * 0.35} fill={liquids[i]} opacity={0.8} clipPath={undefined} />
          </g>
        );
      })}
    </g>
  );
};

/** A fume hood: a cabinet with a glass sash, against the wall. */
export const FumeHood: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.15);
  const base = partBase(part, H, groundY);
  const w = s * 0.55;
  const h = s * 1.15;
  const { metal, glass } = derived(palette);
  const body = lighten(metal, 0.25);
  return (
    <g>
      <rect x={cx - w / 2} y={base - h} width={w} height={h} fill={body} stroke={edge(body)} strokeWidth={SET_LINE} />
      <rect x={cx - w * 0.42} y={base - h * 0.82} width={w * 0.84} height={h * 0.38} fill={glass} stroke={metal} strokeWidth={SET_LINE} />
      <line x1={cx - w * 0.42} x2={cx + w * 0.42} y1={base - h * 0.62} y2={base - h * 0.62} stroke={metal} strokeWidth={SET_LINE} />
      <rect x={cx - w / 2} y={base - h * 0.4} width={w} height={s * 0.03} fill={darken(body, 0.15)} />
    </g>
  );
};

/** A generic element-style wall chart: an irregular grid of coloured tiles (no copied layout). */
export const WallChart: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.75);
  const top = (part.y ?? 0.2) * H;
  const cols = 9;
  const rows = 5;
  const cell = (s * 0.7) / cols;
  const x0 = cx - (cols * cell) / 2;
  const { paper } = derived(palette);
  const tones = [palette.accent, palette.detail, mix(palette.accent, palette.wallB, 0.5), lighten(palette.detail, 0.35)];
  return (
    <g>
      <rect x={x0 - cell * 0.4} y={top - cell * 0.4} width={cols * cell + cell * 0.8} height={rows * cell + cell * 0.8} fill={paper} stroke={edge(paper)} strokeWidth={SET_LINE} />
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        // A stepped outline: the top rows are short at the middle, like the charts it evokes.
        if (r === 0 && c > 0 && c < cols - 1) return null;
        if (r === 1 && c > 1 && c < cols - 3) return null;
        return <rect key={i} x={x0 + c * cell + 1} y={top + r * cell + 1} width={cell - 2} height={cell - 2} fill={tones[Math.floor(rand(seed, `t${c}`) * tones.length)]} opacity={0.85} />;
      })}
    </g>
  );
};
