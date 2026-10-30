import React from "react";
import { clamp, f2 } from "../../lib/math";
import { formatValue, type BarsP, type CounterP, type LineP, type Unit } from "../paramsData";
import { resolveColor, type VizTheme } from "../theme";
import { lin, pathOf, phase, ticks, Txt, type DrawProps } from "./common";

type Fs = { fs: number };
type Key = string | number;

const numeric = (k: Key) => (typeof k === "number" ? k : /^-?\d+(\.\d+)?$/.test(k) ? Number(k) : undefined);
const seriesColor = (theme: VizTheme, c: string | undefined, i: number) => resolveColor(theme, c as never, theme.a[i % theme.a.length]);

/** Value axis that ends on nice ticks. */
const valueAxis = (lo: number, hi: number, zero: boolean, fixed?: readonly [number, number]) => {
  if (fixed) return { lo: fixed[0], hi: fixed[1], ticks: ticks(fixed[0], fixed[1], 5) };
  const a = zero ? Math.min(0, lo) : lo;
  const b = zero ? Math.max(0, hi) : hi;
  const t = ticks(a, b === a ? a + 1 : b, 5);
  return { lo: Math.min(a, t[0] ?? a), hi: Math.max(b, t.at(-1) ?? b), ticks: t };
};

const labelWidth = (s: string, fs: number) => s.length * fs * 0.58;

export const LineChart: React.FC<DrawProps<LineP> & Fs> = ({ p, w, h, theme, reveal, fontFamily, unit, fs }) => {
  const keys = [...new Set(p.series.flatMap((s) => s.data.map((d) => d[0])))];
  const nums = keys.map(numeric);
  const isNum = nums.every((n) => n !== undefined);
  if (isNum) keys.sort((a, b) => numeric(a)! - numeric(b)!);
  const xOf = (k: Key) => (isNum ? numeric(k)! : keys.indexOf(k));
  const xs = keys.map(xOf);
  const vals = p.series.flatMap((s) => s.data.map((d) => d[1]));
  const ax = valueAxis(Math.min(...vals), Math.max(...vals), p.zero, p.y);
  const tickText = ax.ticks.map((v) => formatValue(v, p.unit));
  const x0 = Math.max(...tickText.map((t) => labelWidth(t, fs * 0.8))) + fs * 0.8;
  const endRoom = Math.max(...p.series.map((s, i) => labelWidth(s.label ?? formatValue(s.data.at(-1)![1], p.unit), fs) * (i === 0 || s.label ? 1 : 0))) + fs;
  const fx = lin(Math.min(...xs), Math.max(...xs) === Math.min(...xs) ? Math.min(...xs) + 1 : Math.max(...xs), x0, w - endRoom);
  const fy = lin(ax.lo, ax.hi, h - fs * 1.8, fs * 0.6);
  const sw = theme.stroke * unit * (p.variant === "bold" ? 1.5 : 0.9);
  const drawn = Math.min(p.draw, phase(reveal, 0.15, 1));
  const xMax = fx(Math.min(...xs)) + (fx(Math.max(...xs)) - fx(Math.min(...xs))) * drawn;
  const keyW = Math.max(...keys.map((k) => labelWidth(String(k), fs * 0.8))) + fs * 0.6;
  const every = Math.max(1, Math.ceil((keys.length * keyW) / Math.max(1, w - endRoom - x0)));
  const axisOn = phase(reveal, 0, 0.2);
  return (
    <g>
      <g opacity={axisOn}>
        {ax.ticks.map((v, i) => (
          <g key={`t${i}`}>
            <line x1={f2(x0)} x2={f2(w - endRoom)} y1={f2(fy(v))} y2={f2(fy(v))} stroke={theme.muted} strokeWidth={unit * (v === 0 ? 2.5 : 1.2)} opacity={v === 0 ? 0.8 : 0.35} />
            <Txt x={x0 - fs * 0.4} y={fy(v)} size={fs * 0.8} color={theme.muted} halo={theme.paper} anchor="end" weight={600} fontFamily={fontFamily}>{tickText[i]!}</Txt>
          </g>
        ))}
        {keys.map((k, i) => (i % every === 0 || i === keys.length - 1 ? <Txt key={`k${i}`} x={fx(xOf(k))} y={h - fs * 0.8} size={fs * 0.8} color={theme.muted} halo={theme.paper} weight={600} fontFamily={fontFamily}>{String(k)}</Txt> : null))}
      </g>
      {p.span ? (
        <g opacity={axisOn * 0.9}>
          <rect x={f2(fx(xOf(p.span.from)))} y={f2(fs * 0.6)} width={f2(Math.max(0, fx(xOf(p.span.to)) - fx(xOf(p.span.from))))} height={f2(h - fs * 2.4)} fill={resolveColor(theme, p.span.color)} opacity={0.16} />
          {p.span.label ? <Txt x={(fx(xOf(p.span.from)) + fx(xOf(p.span.to))) / 2} y={fs * 1.2} size={fs * 0.75} color={resolveColor(theme, p.span.color)} halo={theme.paper} fontFamily={fontFamily}>{p.span.label}</Txt> : null}
        </g>
      ) : null}
      {p.events.map((e, i) => {
        const x = fx(xOf(e.at));
        return x <= xMax + 1 ? (
          <g key={`e${i}`}>
            <line x1={f2(x)} x2={f2(x)} y1={f2(fs * 1.6)} y2={f2(h - fs * 1.8)} stroke={theme.ink} strokeWidth={unit * 2} strokeDasharray={`${f2(unit * 8)} ${f2(unit * 8)}`} opacity={0.6} />
            <Txt x={x} y={fs * 0.9 + (i % 2) * fs * 0.9} size={fs * 0.72} color={theme.ink} halo={theme.paper} fontFamily={fontFamily}>{e.label}</Txt>
          </g>
        ) : null;
      })}
      {p.series.map((s, si) => {
        const col = seriesColor(theme, s.color, si);
        const pts = [...s.data].sort((a, b) => xOf(a[0]) - xOf(b[0])).map((d) => ({ x: fx(xOf(d[0])), y: fy(d[1]), v: d[1] }));
        const vis = pts.filter((q) => q.x <= xMax);
        const next = pts[vis.length];
        const last = vis.at(-1);
        // The pen tip between two points, so the line draws on smoothly.
        if (last && next && xMax > last.x) {
          const u = clamp((xMax - last.x) / Math.max(1e-6, next.x - last.x), 0, 1);
          vis.push({ x: xMax, y: last.y + (next.y - last.y) * u, v: last.v + (next.v - last.v) * u });
        }
        if (!vis.length) return null;
        const tip = vis.at(-1)!;
        const area = p.variant === "bold" && si === 0 ? `${pathOf(vis)} L ${f2(tip.x)} ${f2(fy(Math.max(ax.lo, 0)))} L ${f2(vis[0]!.x)} ${f2(fy(Math.max(ax.lo, 0)))} Z` : undefined;
        return (
          <g key={`s${si}`}>
            {area ? <path d={area} fill={col} opacity={0.14} /> : null}
            <path d={pathOf(vis)} fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? `${f2(sw * 2)} ${f2(sw * 1.6)}` : undefined} />
            <circle cx={f2(tip.x)} cy={f2(tip.y)} r={f2(sw * 1.4)} fill={col} />
            {si === 0 || s.label ? (
              <Txt x={tip.x + fs * 0.5} y={tip.y} size={fs * 0.9} color={col} halo={theme.paper} anchor="start" weight={800} fontFamily={fontFamily}>
                {s.label && drawn < 1 ? formatValue(tip.v, p.unit) : (s.label ?? formatValue(tip.v, p.unit))}
              </Txt>
            ) : null}
          </g>
        );
      })}
      {p.points.map((pt, i) => {
        const s = p.series[pt.series];
        const d = s?.data.find((x) => String(x[0]) === String(pt.at));
        if (!s || !d || fx(xOf(d[0])) > xMax + 1) return null;
        const col = seriesColor(theme, s.color, pt.series);
        const x = fx(xOf(d[0]));
        const y = fy(d[1]);
        return (
          <g key={`p${i}`}>
            <circle cx={f2(x)} cy={f2(y)} r={f2(sw * 2)} fill={theme.paper} stroke={col} strokeWidth={sw * 0.8} />
            <Txt x={x} y={y - fs * 1.1} size={fs * 0.85} color={theme.ink} halo={theme.paper} weight={800} fontFamily={fontFamily}>{pt.label ?? formatValue(d[1], p.unit)}</Txt>
          </g>
        );
      })}
    </g>
  );
};

export const BarChart: React.FC<DrawProps<BarsP> & Fs> = ({ p, w, h, theme, reveal, fontFamily, unit, fs }) => {
  const first = p.series[0]!.data;
  const order = p.sort === "none" ? first : [...first].sort((a, b) => (p.sort === "asc" ? a[1] - b[1] : b[1] - a[1]));
  const keys = order.slice(0, p.limit).map((d) => d[0]);
  const valueOf = (si: number, k: Key) => p.series[si]!.data.find((d) => String(d[0]) === String(k))?.[1] ?? 0;
  const all = p.series.flatMap((_, si) => keys.map((k) => valueOf(si, k)));
  const top = p.max ?? Math.max(...all, 0);
  const bottom = Math.min(0, ...all);
  const lit = new Set(p.highlight.map(String));
  const horizontal = p.orientation === "horizontal";
  const n = keys.length;
  const groups = p.series.length;
  const bold = p.variant === "bold";
  const colorOf = (si: number, k: Key) => (lit.size ? (lit.has(String(k)) ? theme.highlight : theme.muted) : seriesColor(theme, p.series[si]!.color, si));
  const keyRoom = horizontal ? Math.min(w * 0.32, Math.max(...keys.map((k) => labelWidth(String(k), fs * 0.85))) + fs) : fs * 1.8;
  const valRoom = p.values ? (horizontal ? Math.max(...all.map((v) => labelWidth(formatValue(v, p.unit), fs * 0.85))) + fs * 0.6 : fs * 1.4) : fs * 0.4;
  const len = horizontal ? w - keyRoom - valRoom : h - keyRoom - valRoom;
  const band = (horizontal ? h : w) / n;
  const barW = (band * (bold ? 0.78 : 0.62)) / groups;
  const scale = (v: number) => (v / (top - bottom || 1)) * len;
  const base = horizontal ? keyRoom + scale(-bottom) : h - keyRoom - scale(-bottom);
  return (
    <g>
      <line
        x1={f2(horizontal ? base : 0)}
        x2={f2(horizontal ? base : w)}
        y1={f2(horizontal ? 0 : base)}
        y2={f2(horizontal ? h : base)}
        stroke={theme.ink}
        strokeWidth={unit * 2.5}
        opacity={phase(reveal, 0, 0.15)}
      />
      {keys.map((k, i) => {
        const g = Math.min(p.grow, phase(reveal, 0.1 + (0.4 * i) / n, 0.6 + (0.4 * i) / n));
        const mid = band * (i + 0.5);
        return (
          <g key={`b${i}`}>
            {p.series.map((_, si) => {
              const v = valueOf(si, k) * g;
              const off = (si - (groups - 1) / 2) * barW;
              const l = scale(Math.abs(v));
              const r = bold ? Math.min(barW * 0.2, l / 2) : 0;
              const rect = horizontal
                ? { x: v >= 0 ? base : base - l, y: mid + off - barW / 2, width: l, height: barW }
                : { x: mid + off - barW / 2, y: v >= 0 ? base - l : base, width: barW, height: l };
              const txt = formatValue(valueOf(si, k) * (g < 1 ? g : 1), p.unit);
              return (
                <g key={`s${si}`}>
                  <rect x={f2(rect.x)} y={f2(rect.y)} width={f2(rect.width)} height={f2(rect.height)} rx={f2(r)} fill={colorOf(si, k)} />
                  {p.values && g > 0.05 ? (
                    <Txt
                      x={horizontal ? (v >= 0 ? base + l + fs * 0.3 : base - l - fs * 0.3) : mid + off}
                      y={horizontal ? mid + off : v >= 0 ? base - l - fs * 0.6 : base + l + fs * 0.6}
                      size={fs * (groups > 1 ? 0.7 : 0.85)}
                      color={theme.ink}
                      halo={theme.paper}
                      anchor={horizontal ? (v >= 0 ? "start" : "end") : "middle"}
                      weight={800}
                      fontFamily={fontFamily}
                    >
                      {txt}
                    </Txt>
                  ) : null}
                </g>
              );
            })}
            <Txt
              x={horizontal ? keyRoom - fs * 0.4 : mid}
              y={horizontal ? mid : h - keyRoom * 0.45}
              size={fs * 0.85}
              color={lit.has(String(k)) ? theme.ink : theme.muted}
              halo={theme.paper}
              anchor={horizontal ? "end" : "middle"}
              weight={700}
              fontFamily={fontFamily}
              opacity={phase(reveal, 0, 0.3)}
            >
              {String(k)}
            </Txt>
          </g>
        );
      })}
    </g>
  );
};

/** ▲ / ▼ chip text. */
const deltaText = (v: number, u: Unit) => `${v >= 0 ? "▲" : "▼"} ${formatValue(Math.abs(v), u)}`;

export const Counter: React.FC<DrawProps<CounterP>> = ({ p, w, h, theme, reveal, fontFamily }) => {
  const v = p.from + (p.value - p.from) * reveal;
  const txt = formatValue(v, p.unit);
  const final = formatValue(p.value, p.unit);
  const size = Math.min(h * (p.caption || p.delta ? 0.5 : 0.7), (w * 0.92) / Math.max(2, final.length * 0.62));
  const col = resolveColor(theme, p.color);
  const bold = p.variant === "bold";
  const cy = p.caption || p.delta ? h * 0.4 : h / 2;
  const goodUp = p.delta?.good !== "down";
  const up = (p.delta?.value ?? 0) >= 0;
  return (
    <g>
      {bold ? <rect x={f2(w / 2 - (final.length * size * 0.62) / 2 - size * 0.4)} y={f2(cy - size * 0.75)} width={f2(final.length * size * 0.62 + size * 0.8)} height={f2(size * 1.5)} rx={f2(size * 0.3)} fill={theme.accent} opacity={0.18 * phase(reveal, 0, 0.3)} /> : null}
      <Txt x={w / 2} y={cy} size={size} color={bold ? theme.accent : col} halo={theme.paper} weight={900} fontFamily={fontFamily}>{txt}</Txt>
      {p.caption ? <Txt x={w / 2} y={cy + size * 0.95} size={size * 0.3} color={theme.muted} halo={theme.paper} weight={700} fontFamily={fontFamily} opacity={phase(reveal, 0.4, 1)}>{p.caption}</Txt> : null}
      {p.delta ? (
        <Txt x={w / 2} y={cy + size * (p.caption ? 1.45 : 1)} size={size * 0.32} color={up === goodUp ? theme.truth : theme.myth} halo={theme.paper} weight={800} fontFamily={fontFamily} opacity={phase(reveal, 0.7, 1)}>
          {deltaText(p.delta.value, p.delta.unit)}
        </Txt>
      ) : null}
    </g>
  );
};
