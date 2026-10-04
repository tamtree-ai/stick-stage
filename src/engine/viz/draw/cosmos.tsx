/** Part-of-a-whole bars and cosmic figures: `progress`, `galaxy`, `burst`, `fineprint`. */
import React, { useId } from "react";
import { easeOutBack } from "../../lib/easing";
import { lighten } from "../../lib/color";
import { clamp, f2 } from "../../lib/math";
import { GalaxyShape, sparklePath } from "../../set/parts/cosmos";
import type { BurstP, FinePrintP, GalaxyP, ProgressP } from "../params";
import { resolveColor } from "../theme";
import { phase, Txt, type DrawProps } from "./common";

const HEAVY = 900;

/** Rough text width for layout (heavy sans, ~0.58 em per character). */
const textW = (s: string, size: number) => s.length * size * 0.58;

/**
 * Spread labels left to right so they don't overlap: each keeps its wanted centre unless the
 * one before pushes it right; all stay inside [0, w].
 */
export const spreadLabels = (items: readonly { x: number; w: number }[], w: number, gap: number): number[] => {
  const out: number[] = [];
  let right = -Infinity;
  for (const it of items) {
    const x = clamp(Math.max(it.x, right + gap + it.w / 2), it.w / 2, Math.max(it.w / 2, w - it.w / 2));
    out.push(x);
    right = x + it.w / 2;
  }
  return out;
};

/** One bar for shares of a whole: segments fill from the left, the empty rest is the unknown. */
export const Progress: React.FC<DrawProps<ProgressP> & { fs: number }> = ({ p, w, h, theme, reveal, fontFamily, fs, unit }) => {
  // Outlines of filled shapes: dark on any ground (the chalk ink is for lines on the set).
  const line = theme.dark ? theme.paper : theme.ink;
  const clip = "pg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  // Scale from the box height, not the figure font (its cap is too small for a phone-size bar).
  const S = Math.max(fs * 0.9, h / 8.8);
  const sw = theme.stroke * unit;
  const top = p.readout ? S * 1.7 : 0;
  const barY = top + S * 1.7;
  const barH = S * 2.4;
  const barB = barY + barH;
  const X = (v: number) => (clamp(v, 0, p.total) / p.total) * w;
  let acc = 0;
  const segs = p.segments.map((s, i) => {
    const x0 = X(acc);
    acc += s.value;
    const x1 = X(acc);
    return { ...s, i, x0, x1, mid: (x0 + x1) / 2, show: clamp(s.value / (p.total * 0.015), 0, 1), fill: resolveColor(theme, s.color, theme.a[i % theme.a.length]) };
  });
  const end = segs[segs.length - 1]!.x1;
  const shown = segs.filter((s) => s.show > 0.02);
  const valueText = (v: number) => `${Math.round(v)}${p.unit}`;
  const valueSize = S * 1.1;
  const nameSize = S * 0.78;
  const valueX = spreadLabels(shown.map((s) => ({ x: s.mid, w: textW(valueText(s.value), valueSize) })), w, S * 0.3);
  const nameX = spreadLabels(shown.map((s) => ({ x: s.mid, w: textW(s.label, nameSize) })), w, S * 0.35);
  const readout = p.readout?.replace(/\{(\d)\}/g, (_, k: string) => String(Math.round(p.segments[Number(k)]?.value ?? 0)));
  // The readout waits for the first value, so it never says "0% read".
  const readoutOn = clamp(acc / (p.total * 0.015), 0, 1);
  const ask = (x: number, y: number, k: number, key: string) =>
    k > 0.01 ? (
      <g key={key} transform={`translate(${f2(x)} ${f2(y)}) scale(${f2(easeOutBack(k, 1.8))})`}>
        <text textAnchor="middle" dominantBaseline="central" fontSize={f2(barH * 1.05)} fontWeight={HEAVY} fontFamily={fontFamily} fill={theme.dark ? theme.ink : theme.paper} stroke={line} strokeWidth={f2(sw * 1.4)} paintOrder="stroke" strokeLinejoin="round">
          ?
        </text>
      </g>
    ) : null;
  const here = p.here && segs[p.here.segment] ? p.here : undefined;
  const chip = here ? { x: segs[here.segment]!.mid, text: `${here.text} ↑`, k: here.show } : undefined;
  const chipSize = S * 0.78;
  const chipW = chip ? textW(chip.text, chipSize) + S * 1.2 : 0;
  const chipX = chip ? clamp(chip.x, chipW / 2, w - chipW / 2) : 0;
  return (
    <g opacity={phase(reveal, 0, 0.3)}>
      {readout && readoutOn > 0.01 ? (
        <Txt opacity={readoutOn} x={0} y={S * 0.75} size={S * 1.25} color={theme.highlight} halo={theme.paper} anchor="start" weight={HEAVY} fontFamily={fontFamily}>
          {readout}
        </Txt>
      ) : null}
      <clipPath id={clip}>
        <rect x={0} y={barY} width={w} height={barH} rx={barH / 2} />
      </clipPath>
      <rect x={0} y={barY} width={w} height={barH} rx={barH / 2} fill={theme.paper} opacity={0.75} />
      <g clipPath={`url(#${clip})`}>
        {segs.map((s) =>
          s.x1 - s.x0 > 0.5 ? (
            <rect key={s.i} x={f2(s.x0)} y={barY} width={f2(s.x1 - s.x0)} height={barH} fill={s.fill} opacity={1 - 0.72 * s.dim} stroke={line} strokeWidth={sw * 0.8} />
          ) : null,
        )}
      </g>
      <rect x={0} y={barY} width={w} height={barH} rx={barH / 2} fill="none" stroke={theme.ink} strokeWidth={sw} />
      {shown.map((s, k) => (
        <g key={`v${s.i}`} opacity={s.show * (1 - 0.6 * s.dim)}>
          <Txt x={valueX[k]!} y={barY - S * 0.75} size={valueSize} color={theme.ink} halo={theme.paper} weight={HEAVY} fontFamily={fontFamily}>
            {valueText(s.value)}
          </Txt>
          <Txt x={nameX[k]!} y={barB + S * 0.8} size={nameSize} color={theme.ink} halo={theme.paper} weight={700} fontFamily={fontFamily}>
            {s.label}
          </Txt>
        </g>
      ))}
      {segs.map((s) => ask(s.mid, barY + barH / 2, s.ask, `a${s.i}`))}
      {ask((end + w) / 2, barY + barH / 2, w - end > S ? p.restAsk : 0, "rest")}
      {chip && chip.k > 0.01 ? (
        <g transform={`translate(${f2(chipX)} ${f2(barB + S * 2.3)}) scale(${f2(easeOutBack(chip.k, 1.6))})`}>
          <rect x={-chipW / 2} y={-S * 0.62} width={chipW} height={S * 1.24} rx={S * 0.62} fill={theme.highlight} stroke={line} strokeWidth={sw * 0.7} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={f2(chipSize)} fontWeight={800} fontFamily={fontFamily} fill={line}>
            {chip.text}
          </text>
        </g>
      ) : null}
    </g>
  );
};

/** A spiral galaxy turning at `spin` °/s, with optional motion arcs and a caption. */
export const GalaxyFig: React.FC<DrawProps<GalaxyP> & { fs: number }> = ({ p, w, h, theme, reveal, t, fontFamily, fs, unit }) => {
  const capH = p.caption ? fs * 1.3 : 0;
  const r = Math.min(w * 0.42, (h - capH) * 0.75);
  return (
    <g opacity={phase(reveal, 0, 0.4)}>
      <GalaxyShape
        x={w / 2}
        y={(h - capH) / 2}
        r={r}
        spin={p.spin * t}
        tilt={p.tilt}
        core={theme.highlight}
        arm={theme.a[3]}
        halo={theme.a[0]}
        speed={p.speedLines > 0.01 ? { color: theme.ink, width: theme.stroke * unit * 1.1, opacity: p.speedLines } : undefined}
      />
      {p.caption ? (
        <Txt x={w / 2} y={h - capH / 2} size={fs * 0.85} color={theme.ink} halo={theme.paper} weight={800} fontFamily={fontFamily}>
          {p.caption}
        </Txt>
      ) : null}
    </g>
  );
};

/** A supernova: rays and a star burst out on show, then settle to a soft glow after `hold` s. */
export const Burst: React.FC<DrawProps<BurstP>> = ({ p, w, h, theme, t, unit }) => {
  const r = Math.min(w, h) / 2;
  const grow = easeOutBack(clamp(t / 0.25, 0, 1), 2);
  const fade = 1 - clamp((t - p.hold) / 0.5, 0, 1);
  const col = resolveColor(theme, p.color, theme.highlight);
  const ink = theme.dark ? theme.paper : theme.ink;
  const sw = theme.stroke * unit;
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const d = `M${f2(Math.cos(a) * r * 0.55 * grow)},${f2(Math.sin(a) * r * 0.55 * grow)} L${f2(Math.cos(a) * r * grow)},${f2(Math.sin(a) * r * grow)}`;
    return (
      <g key={i} strokeLinecap="round">
        <path d={d} stroke={ink} strokeWidth={sw * 2.2} />
        <path d={d} stroke={col} strokeWidth={sw * 1.1} />
      </g>
    );
  });
  return (
    <g transform={`translate(${f2(w / 2)} ${f2(h / 2)})`}>
      <circle r={r * 0.5} fill={col} opacity={0.3} />
      <g opacity={fade}>
        {rays}
        <path d={sparklePath(0, 0, r * 0.5 * grow)} fill={lighten(col, 0.6)} stroke={ink} strokeWidth={sw * 0.8} strokeLinejoin="round" />
        <circle r={r * 0.12 * grow} fill={lighten(col, 0.9)} />
      </g>
    </g>
  );
};

/** A wall of tiny contract text, clipped to its box; `fill` (× the reveal) sets how many lines show. */
export const FinePrint: React.FC<DrawProps<FinePrintP>> = ({ p, w, h, theme, reveal, fontFamily, unit }) => {
  const clip = "fp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const size = p.size * unit;
  const lineH = size * 1.32;
  const n = Math.floor(h / lineH);
  const lines = Math.floor(n * p.fill * reveal);
  const perLine = Math.ceil(w / (size * 0.5)) + 8;
  const src = p.text.repeat(Math.ceil(((n + 2) * perLine) / p.text.length) + 1);
  return (
    <g>
      <clipPath id={clip}>
        <rect width={w} height={h} rx={size} />
      </clipPath>
      <g clipPath={`url(#${clip})`} fontFamily={fontFamily} fontSize={f2(size)} fill={resolveColor(theme, p.color, theme.muted)}>
        {Array.from({ length: lines }, (_, i) => (
          <text key={i} x={f2(-(i % 5) * size * 2.8)} y={f2(size + i * lineH)} opacity={0.8}>
            {src.slice(i * 23, i * 23 + perLine)}
          </text>
        ))}
      </g>
    </g>
  );
};
