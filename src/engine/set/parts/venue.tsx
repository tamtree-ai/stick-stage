import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { horizonY } from "./outdoor";
import { edge, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** Stage kit backdrop: pleated curtain with a scalloped valance; `variant: "spot"` adds a spotlight cone on center. */
export const Curtain: PartComponent = ({ part, palette, W, groundY, fig }) => {
  const pleat = fig * 0.09;
  const n = Math.ceil(W / pleat) + 1;
  const valance = fig * 0.16;
  const scallops = 7;
  const sw = W / scallops;
  const cx = (part.x ?? 0.5) * W;
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.wallA} />
      {Array.from({ length: n }, (_, i) =>
        i % 2 ? <rect key={i} x={i * pleat} width={pleat} height={groundY} fill={palette.wallB} /> : null,
      )}
      {Array.from({ length: n }, (_, i) => (
        <line key={`l${i}`} x1={i * pleat} x2={i * pleat} y1={0} y2={groundY} stroke={edge(palette.wallB, 0.08)} strokeWidth={SET_LINE} />
      ))}
      {part.variant === "spot" ? (
        <g opacity={0.5}>
          <path d={`M ${cx - fig * 0.12} 0 L ${cx + fig * 0.12} 0 L ${cx + fig * 0.62} ${groundY} L ${cx - fig * 0.62} ${groundY} Z`} fill={lighten(palette.accent, 0.55)} />
          <ellipse cx={cx} cy={groundY} rx={fig * 0.66} ry={fig * 0.07} fill={lighten(palette.accent, 0.6)} />
        </g>
      ) : null}
      <path
        d={`M 0 0 L ${W} 0 L ${W} ${valance * 0.6} ${Array.from({ length: scallops }, (_, i) => `Q ${W - (i + 0.5) * sw} ${valance * 1.25} ${W - (i + 1) * sw} ${valance * 0.6}`).join(" ")} Z`}
        fill={palette.accent}
        stroke={edge(palette.accent)}
        strokeWidth={SET_LINE}
      />
      <rect y={valance * 0.5} width={W} height={fig * 0.012} fill={darken(palette.accent, 0.12)} />
    </g>
  );
};

/** Wall chalkboard; `variant: "menu"` is a café menu (title + priced rows), else scribbled sums. */
export const Board: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => {
  const s = fig * part.size;
  const w = s * 0.78;
  const h = s * 0.5;
  const cx = partX(part, W, marks, 0.5);
  const top = (part.y ?? 0.16) * H;
  const x0 = cx - w / 2;
  const { wood, paper } = derived(palette);
  const slate = darken(mix(palette.detail, palette.floor, 0.4), 0.28);
  const chalk = lighten(paper, 0.2);
  const stroke = { stroke: chalk, strokeWidth: SET_LINE * 1.3, strokeLinecap: "round" as const, opacity: 0.85 };
  const rows = [0, 1, 2, 3];
  return (
    <g>
      <rect x={x0 - s * 0.025} y={top - s * 0.025} width={w + s * 0.05} height={h + s * 0.05} rx={s * 0.012} fill={wood} stroke={edge(wood)} strokeWidth={SET_LINE} />
      <rect x={x0} y={top} width={w} height={h} fill={slate} />
      {part.variant === "menu" ? (
        <g>
          <line x1={x0 + w * 0.3} x2={x0 + w * 0.7} y1={top + h * 0.14} y2={top + h * 0.14} {...stroke} strokeWidth={SET_LINE * 2.4} />
          {rows.map((i) => {
            const y = top + h * (0.34 + i * 0.16);
            return (
              <g key={i}>
                <line x1={x0 + w * 0.1} x2={x0 + w * randRange(seed, `item${i}`, 0.42, 0.62)} y1={y} y2={y} {...stroke} />
                <line x1={x0 + w * 0.78} x2={x0 + w * 0.9} y1={y} y2={y} {...stroke} />
              </g>
            );
          })}
        </g>
      ) : (
        <g>
          {rows.slice(0, 3).map((i) => {
            const y = top + h * (0.22 + i * 0.22);
            const len = randRange(seed, `sum${i}`, 0.3, 0.5);
            return (
              <g key={i}>
                <line x1={x0 + w * 0.08} x2={x0 + w * (0.08 + len)} y1={y} y2={y} {...stroke} />
                <path d={`M ${x0 + w * (0.12 + len)} ${y - s * 0.012} h ${s * 0.03} M ${x0 + w * (0.12 + len)} ${y + s * 0.012} h ${s * 0.03}`} {...stroke} fill="none" />
              </g>
            );
          })}
          <circle cx={x0 + w * 0.78} cy={top + h * 0.5} r={h * 0.24} fill="none" {...stroke} />
          <line x1={x0 + w * 0.78} x2={x0 + w * 0.78 + h * 0.24} y1={top + h * 0.5} y2={top + h * 0.5} {...stroke} />
        </g>
      )}
      <rect x={x0 + w * 0.1} y={top + h + s * 0.025} width={w * 0.8} height={s * 0.02} fill={wood} stroke={edge(wood)} strokeWidth={SET_LINE * 0.7} />
      <rect x={x0 + w * 0.2} y={top + h + s * 0.012} width={w * 0.06} height={s * 0.014} rx={s * 0.006} fill={chalk} />
    </g>
  );
};

/** Beach kit: sea from the horizon down, with seeded wave dashes. */
export const Sea: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const hz = horizonY(groundY, fig);
  const sea = mix(palette.detail, palette.sky, 0.35);
  const waves = Array.from({ length: 10 }, (_, i) => ({ x: W * rand(seed, `wx${i}`), y: hz + fig * randRange(seed, `wy${i}`, 0.04, 0.2), l: fig * randRange(seed, `wl${i}`, 0.06, 0.12) }));
  return (
    <g>
      <rect y={hz} width={W} height={H - hz} fill={sea} />
      <line x1={0} x2={W} y1={hz} y2={hz} stroke={edge(sea, 0.12)} strokeWidth={SET_LINE} />
      {waves.map((w, i) => (
        <path key={i} d={`M ${w.x} ${w.y} q ${w.l / 4} ${-w.l / 5} ${w.l / 2} 0 t ${w.l / 2} 0`} fill="none" stroke={lighten(sea, 0.4)} strokeWidth={SET_LINE * 1.2} strokeLinecap="round" />
      ))}
    </g>
  );
};

/** Beach kit: sand from a foamy shoreline down to the frame bottom. */
export const Sand: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const shore = groundY - fig * 0.16;
  const n = 6;
  let d = `M -20 ${H} L -20 ${shore}`;
  for (let i = 0; i < n; i++) {
    const x1 = (W * (i + 1)) / n;
    d += ` Q ${(W * (i + 0.5)) / n} ${shore + fig * randRange(seed, `s${i}`, -0.035, 0.035)} ${x1 + (i === n - 1 ? 20 : 0)} ${shore}`;
  }
  d += ` L ${W + 20} ${H} Z`;
  const specks = Array.from({ length: 16 }, (_, i) => ({ x: W * rand(seed, `px${i}`), y: shore + (H - shore) * randRange(seed, `py${i}`, 0.15, 0.95) }));
  return (
    <g>
      <path d={d} fill={lighten(palette.sky, 0.6)} transform={`translate(0 ${-fig * 0.02})`} />
      <path d={d} fill={palette.floor} stroke={edge(palette.floor, 0.1)} strokeWidth={SET_LINE} />
      {specks.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={SET_LINE * 1.3} fill={darken(palette.floor, 0.1)} />
      ))}
    </g>
  );
};

/** Striped beach umbrella planted in the sand. */
export const Umbrella: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.85);
  const base = partBase(part, H, groundY);
  const { paper, metal } = derived(palette);
  const top = base - s * 0.95;
  const r = s * 0.42;
  const tilt = part.flip ? 8 : -8;
  const segs = 6;
  return (
    <g transform={`rotate(${tilt} ${cx} ${base})`}>
      <rect x={cx - s * 0.012} y={top} width={s * 0.024} height={base - top} fill={metal} stroke={edge(metal)} strokeWidth={SET_LINE * 0.7} />
      {Array.from({ length: segs }, (_, i) => {
        const a0 = Math.PI + (Math.PI * i) / segs;
        const a1 = Math.PI + (Math.PI * (i + 1)) / segs;
        return (
          <path
            key={i}
            d={`M ${cx} ${top} L ${cx + Math.cos(a0) * r} ${top + Math.sin(a0) * r * 0.55} A ${r} ${r * 0.55} 0 0 1 ${cx + Math.cos(a1) * r} ${top + Math.sin(a1) * r * 0.55} Z`}
            fill={i % 2 ? paper : palette.accent}
            stroke={edge(palette.accent)}
            strokeWidth={SET_LINE}
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
};
