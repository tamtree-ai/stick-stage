import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { SET_LINE, type PartComponent } from "./types";

const flipT = (flip: boolean, cx: number) => (flip ? `translate(${cx * 2} 0) scale(-1 1)` : undefined);

export const Window: PartComponent = ({ part, palette, W, H, fig, seed }) => {
  const w = fig * 0.52 * part.size;
  const h = fig * 0.62 * part.size;
  const cx = (part.x ?? 0.25) * W;
  const top = (part.y ?? 0.2) * H;
  const x0 = cx - w / 2;
  const t = fig * 0.028;
  const frame = lighten(palette.wallB, 0.5);
  const line = darken(palette.wallB, 0.14);
  const clouds = [0, 1].map((i) => ({
    x: x0 + w * randRange(seed, `cx${i}`, 0.2, 0.8),
    y: top + h * (0.2 + i * 0.38) + randRange(seed, `cy${i}`, -10, 10),
    s: fig * randRange(seed, `cs${i}`, 0.05, 0.075),
  }));
  const curtainW = w * 0.24;
  return (
    <g>
      <rect x={x0} y={top} width={w} height={h} fill={palette.sky} />
      {clouds.map((c, i) => (
        <g key={i} fill={lighten(palette.sky, 0.7)}>
          <ellipse cx={c.x} cy={c.y} rx={c.s * 1.6} ry={c.s * 0.7} />
          <circle cx={c.x - c.s * 0.4} cy={c.y - c.s * 0.35} r={c.s * 0.65} />
          <circle cx={c.x + c.s * 0.45} cy={c.y - c.s * 0.25} r={c.s * 0.5} />
        </g>
      ))}
      <g fill={frame} stroke={line} strokeWidth={SET_LINE}>
        <rect x={x0 - t} y={top - t} width={w + 2 * t} height={t} />
        <rect x={x0 - t} y={top + h} width={w + 2 * t} height={t} />
        <rect x={x0 - t} y={top} width={t} height={h} />
        <rect x={x0 + w} y={top} width={t} height={h} />
        <rect x={cx - t * 0.4} y={top} width={t * 0.8} height={h} />
        <rect x={x0} y={top + h * 0.48} width={w} height={t * 0.8} />
        <rect x={x0 - t * 2} y={top + h + t} width={w + 4 * t} height={t * 0.9} />
      </g>
      {part.variant === "blinds" ? (
        <g>
          {Array.from({ length: Math.round((h * 0.62) / (t * 1.5)) }, (_, i) => (
            <rect key={i} x={x0} y={top + i * t * 1.5} width={w} height={t * 1.1} fill={lighten(palette.wallA, 0.55)} stroke={line} strokeWidth={SET_LINE * 0.6} />
          ))}
          <line x1={x0 + w * 0.85} x2={x0 + w * 0.85} y1={top} y2={top + h * 0.8} stroke={line} strokeWidth={SET_LINE * 0.8} />
        </g>
      ) : null}
      {(part.variant === "blinds" ? [] : [-1, 1]).map((s) => {
        const edge = s < 0 ? x0 - t * 1.5 : x0 + w + t * 1.5;
        const inner = edge - s * curtainW;
        const hem = top + h + fig * 0.08;
        const sway = randRange(seed, `curtain${s}`, -0.2, 0.2) * curtainW;
        return (
          <path
            key={s}
            d={`M ${edge} ${top - t * 2} L ${inner} ${top - t * 2} Q ${inner + s * curtainW * 0.25 + sway} ${top + h * 0.5} ${inner - s * curtainW * 0.1} ${hem} L ${edge} ${hem} Z`}
            fill={palette.accent}
            stroke={darken(palette.accent, 0.12)}
            strokeWidth={SET_LINE}
            strokeLinejoin="round"
          />
        );
      })}
      <rect x={x0 - t * 3} y={top - t * 2.6} width={w + t * 6} height={t * 0.7} rx={t * 0.35} fill={darken(palette.wallB, 0.08)} />
    </g>
  );
};

export const Shelf: PartComponent = ({ part, palette, W, H, fig, seed }) => {
  const w = fig * 0.5 * part.size;
  const cx = (part.x ?? 0.8) * W;
  const y = (part.y ?? 0.35) * H;
  const x0 = cx - w / 2;
  const plank = fig * 0.022;
  const colors = [palette.accent, palette.detail, darken(palette.wallB, 0.1), mix(palette.sky, palette.detail, 0.3), palette.shade];
  const books: React.ReactNode[] = [];
  let x = x0 + w * 0.06;
  const end = x0 + w * 0.68;
  for (let i = 0; x < end; i++) {
    const bw = fig * randRange(seed, `bw${i}`, 0.022, 0.036);
    const bh = fig * randRange(seed, `bh${i}`, 0.085, 0.13);
    const lean = i > 2 && rand(seed, `lean${i}`) > 0.8;
    const fill = colors[Math.floor(rand(seed, `bc${i}`) * colors.length)]!;
    books.push(
      <rect
        key={i}
        x={x}
        y={y - bh}
        width={bw}
        height={bh}
        rx={2}
        fill={fill}
        stroke={darken(fill, 0.14)}
        strokeWidth={SET_LINE * 0.8}
        transform={lean ? `rotate(14 ${x + bw} ${y})` : undefined}
      />,
    );
    x += bw + (lean ? bh * 0.26 : 2);
  }
  const potX = x0 + w * 0.84;
  const potW = fig * 0.06;
  const potH = fig * 0.055;
  return (
    <g>
      {books}
      <g fill={palette.detail} stroke={darken(palette.detail, 0.14)} strokeWidth={SET_LINE * 0.8}>
        {[-40, -8, 26].map((r, i) => (
          <ellipse key={i} cx={potX} cy={y - potH - fig * 0.03} rx={fig * 0.014} ry={fig * 0.04} transform={`rotate(${r} ${potX} ${y - potH})`} />
        ))}
      </g>
      <path
        d={`M ${potX - potW / 2} ${y - potH} L ${potX + potW / 2} ${y - potH} L ${potX + potW * 0.38} ${y} L ${potX - potW * 0.38} ${y} Z`}
        fill={palette.accent}
        stroke={darken(palette.accent, 0.14)}
        strokeWidth={SET_LINE * 0.8}
        strokeLinejoin="round"
      />
      <rect x={x0} y={y} width={w} height={plank} fill={lighten(palette.wallB, 0.4)} stroke={darken(palette.wallB, 0.14)} strokeWidth={SET_LINE} />
      {[0.15, 0.85].map((f) => (
        <path key={f} d={`M ${x0 + w * f} ${y + plank} l 0 ${fig * 0.035} l ${fig * 0.025 * (f < 0.5 ? 1 : -1)} ${-fig * 0.035} Z`} fill={darken(palette.wallB, 0.08)} />
      ))}
    </g>
  );
};

export const PictureFrame: PartComponent = ({ part, palette, W, H, fig, seed }) => {
  const w = fig * 0.28 * part.size;
  const h = fig * 0.34 * part.size;
  const cx = (part.x ?? 0.7) * W;
  const cy = (part.y ?? 0.3) * H;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const m = fig * 0.022;
  const kind = Math.floor(rand(seed, "art") * 3);
  const inner = { x: x0 + m, y: y0 + m, w: w - 2 * m, h: h - 2 * m };
  return (
    <g transform={flipT(part.flip, cx)}>
      <rect x={x0} y={y0} width={w} height={h} fill={lighten(palette.wallB, 0.45)} stroke={darken(palette.wallB, 0.16)} strokeWidth={SET_LINE} />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill={lighten(palette.sky, 0.3)} />
      {kind === 0 ? (
        <g>
          <circle cx={inner.x + inner.w * 0.68} cy={inner.y + inner.h * 0.32} r={inner.w * 0.14} fill={palette.accent} />
          <path d={`M ${inner.x} ${inner.y + inner.h} L ${inner.x + inner.w * 0.35} ${inner.y + inner.h * 0.5} L ${inner.x + inner.w * 0.6} ${inner.y + inner.h * 0.78} L ${inner.x + inner.w * 0.78} ${inner.y + inner.h * 0.6} L ${inner.x + inner.w} ${inner.y + inner.h} Z`} fill={palette.detail} />
        </g>
      ) : kind === 1 ? (
        <g>
          <circle cx={inner.x + inner.w * 0.42} cy={inner.y + inner.h * 0.45} r={inner.w * 0.28} fill={palette.accent} />
          <rect x={inner.x + inner.w * 0.35} y={inner.y + inner.h * 0.5} width={inner.w * 0.5} height={inner.h * 0.35} fill={palette.detail} opacity={0.8} />
        </g>
      ) : (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={inner.x} y={inner.y + (inner.h / 3) * i} width={inner.w} height={inner.h / 6} fill={i % 2 ? palette.accent : palette.shade} />
          ))}
        </g>
      )}
    </g>
  );
};

export const Plant: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const s = fig * part.size;
  const cx = (part.x ?? 0.9) * W;
  const base = part.y !== undefined ? part.y * groundY : groundY - fig * 0.01;
  const potW = s * 0.16;
  const potH = s * 0.17;
  const n = 7;
  const leaf = palette.detail;
  return (
    <g transform={flipT(part.flip, cx)}>
      {Array.from({ length: n }, (_, i) => {
        const a = -70 + (140 * i) / (n - 1) + randRange(seed, `la${i}`, -8, 8);
        const l = s * randRange(seed, `ll${i}`, 0.17, 0.26);
        const ox = cx;
        const oy = base - potH;
        return (
          <ellipse
            key={i}
            cx={ox}
            cy={oy - l / 2}
            rx={s * 0.035}
            ry={l / 2}
            transform={`rotate(${a} ${ox} ${oy})`}
            fill={i % 2 ? leaf : darken(leaf, 0.08)}
            stroke={darken(leaf, 0.16)}
            strokeWidth={SET_LINE * 0.8}
          />
        );
      })}
      <path
        d={`M ${cx - potW / 2} ${base - potH} L ${cx + potW / 2} ${base - potH} L ${cx + potW * 0.36} ${base} L ${cx - potW * 0.36} ${base} Z`}
        fill={palette.accent}
        stroke={darken(palette.accent, 0.14)}
        strokeWidth={SET_LINE}
        strokeLinejoin="round"
      />
      <rect x={cx - potW * 0.55} y={base - potH - s * 0.02} width={potW * 1.1} height={s * 0.035} rx={4} fill={darken(palette.accent, 0.06)} />
    </g>
  );
};
