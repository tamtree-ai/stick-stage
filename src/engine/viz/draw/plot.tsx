import React from "react";
import { f2 } from "../../lib/math";
import { exprFn } from "../expr";
import { plotFrame } from "../geometry";
import type { AxesP, PlotP } from "../params";
import { resolveColor } from "../theme";
import { Arrow, lin, numText, pathOf, phase, ticks, Txt, type DrawProps } from "./common";

const SAMPLES = 160;

const valueAt = (fn: string, x: number, vars: Record<string, number>) => {
  try {
    const y = exprFn(fn)({ ...vars, x });
    return Number.isFinite(y) ? y : undefined;
  } catch {
    return undefined;
  }
};

const num = (v: number | string | undefined, vars: Record<string, number>): number | undefined =>
  typeof v === "number" ? v : v === undefined ? undefined : valueAt(v, 0, vars);

/** Axes, grid and ticks, shared by `axes` and `plot`. */
export const Axes: React.FC<DrawProps<AxesP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  fontFamily,
  fs,
  unit,
}) => {
  const fr = plotFrame(w, h, fs);
  const X = lin(p.x[0], p.x[1], fr.x0, fr.x1);
  const Y = lin(p.y[0], p.y[1], fr.y0, fr.y1);
  const sw = theme.stroke * unit;
  const a = phase(reveal, 0, 0.35);
  const xt = ticks(p.x[0], p.x[1]);
  const yt = ticks(p.y[0], p.y[1], 5);
  const yAxisX = X(Math.min(Math.max(0, p.x[0]), p.x[1]));
  const xAxisY = Y(Math.min(Math.max(0, p.y[0]), p.y[1]));
  return (
    <g opacity={a}>
      {p.grid
        ? [
            ...xt.map((v) => (
              <line
                key={`gx${v}`}
                x1={f2(X(v))}
                x2={f2(X(v))}
                y1={fr.y0}
                y2={fr.y1}
                stroke={theme.muted}
                strokeWidth={sw * 0.25}
                opacity={0.6}
              />
            )),
            ...yt.map((v) => (
              <line
                key={`gy${v}`}
                y1={f2(Y(v))}
                y2={f2(Y(v))}
                x1={fr.x0}
                x2={fr.x1}
                stroke={theme.muted}
                strokeWidth={sw * 0.25}
                opacity={0.6}
              />
            )),
          ]
        : null}
      <Arrow
        x1={fr.x0}
        y1={xAxisY}
        x2={fr.x1 + fs * 0.5}
        y2={xAxisY}
        color={theme.ink}
        width={sw * 0.6}
      />
      <Arrow
        x1={yAxisX}
        y1={fr.y0}
        x2={yAxisX}
        y2={fr.y1 - fs * 0.5}
        color={theme.ink}
        width={sw * 0.6}
      />
      {p.ticks
        ? [
            ...xt.map((v) => (
              <g key={`tx${v}`}>
                <line
                  x1={f2(X(v))}
                  x2={f2(X(v))}
                  y1={xAxisY}
                  y2={xAxisY + fs * 0.3}
                  stroke={theme.ink}
                  strokeWidth={sw * 0.4}
                />
                <Txt
                  x={X(v)}
                  y={xAxisY + fs * 0.95}
                  size={fs * 0.72}
                  color={theme.muted}
                  halo={theme.paper}
                  fontFamily={fontFamily}
                  weight={600}
                >
                  {numText(v)}
                </Txt>
              </g>
            )),
            ...yt
              .filter((v) => v !== 0 || p.x[0] < 0)
              .map((v) => (
                <g key={`ty${v}`}>
                  <line
                    x1={yAxisX - fs * 0.3}
                    x2={yAxisX}
                    y1={f2(Y(v))}
                    y2={f2(Y(v))}
                    stroke={theme.ink}
                    strokeWidth={sw * 0.4}
                  />
                  <Txt
                    x={yAxisX - fs * 0.45}
                    y={Y(v)}
                    size={fs * 0.72}
                    color={theme.muted}
                    halo={theme.paper}
                    anchor="end"
                    fontFamily={fontFamily}
                    weight={600}
                  >
                    {numText(v)}
                  </Txt>
                </g>
              )),
          ]
        : null}
      {p.xLabel ? (
        <Txt
          x={fr.x1}
          y={xAxisY - fs * 0.9}
          size={fs * 0.85}
          color={theme.ink}
          halo={theme.paper}
          anchor="end"
          fontFamily={fontFamily}
        >
          {p.xLabel}
        </Txt>
      ) : null}
      {p.yLabel ? (
        <Txt
          x={yAxisX + fs * 0.5}
          y={fr.y1 - fs * 0.2}
          size={fs * 0.85}
          color={theme.ink}
          halo={theme.paper}
          anchor="start"
          fontFamily={fontFamily}
        >
          {p.yLabel}
        </Txt>
      ) : null}
    </g>
  );
};

export const Plot: React.FC<DrawProps<PlotP> & { fs: number }> = (props) => {
  const { p, w, h, theme, reveal, fontFamily, fs, unit } = props;
  const fr = plotFrame(w, h, fs);
  const X = lin(p.x[0], p.x[1], fr.x0, fr.x1);
  const Y = lin(p.y[0], p.y[1], fr.y0, fr.y1);
  const sw = theme.stroke * unit;
  const drawn = phase(reveal, 0.25, 1);
  // Curves stop at the edge of the plot area instead of running along it.
  const clip = `plot-${React.useId().replace(/:/g, "")}`;
  const clipY = (y: number) => Math.max(fr.y1 - fs, Math.min(fr.y0 + fs * 0.2, y));
  const seriesPts = (i: number) => {
    const s = p.series[i]!;
    const frac = s.draw * drawn;
    if (s.points) {
      const n = Math.max(2, Math.ceil(s.points.length * frac));
      return s.points.slice(0, n).map(([x, y]) => ({ x: X(x), y: Y(y) }));
    }
    const xEnd = p.x[0] + (p.x[1] - p.x[0]) * frac;
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const x = p.x[0] + ((xEnd - p.x[0]) * k) / SAMPLES;
      const y = valueAt(s.fn!, x, p.vars);
      if (y !== undefined) pts.push({ x: X(x), y: Math.max(-h, Math.min(2 * h, Y(y))) });
    }
    return pts;
  };
  return (
    <g>
      <Axes {...props} p={p} />
      <defs>
        <clipPath id={clip}>
          <rect
            x={fr.x0 - sw}
            y={fr.y1 - fs * 0.4}
            width={fr.x1 - fr.x0 + 2 * sw}
            height={fr.y0 - fr.y1 + fs * 0.4 + sw}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {p.series.map((s, i) => {
          const pts = seriesPts(i);
          if (pts.length < 2) return null;
          const col = resolveColor(theme, s.color, theme.a[i % theme.a.length]);
          const base = Y(Math.min(Math.max(0, p.y[0]), p.y[1]));
          // Label the curve where it is still inside the plot (a steep curve leaves through the top).
          const inside = pts.filter((q) => q.y >= fr.y1 + fs);
          const along = inside.length ? inside : pts;
          const tip = along[Math.min(along.length - 1, Math.round((along.length - 1) * s.labelAt))]!;
          return (
            <g key={i}>
              {s.fill ? (
                <path
                  d={`${pathOf(pts)} L ${f2(pts[pts.length - 1]!.x)} ${f2(base)} L ${f2(pts[0]!.x)} ${f2(base)} Z`}
                  fill={col}
                  opacity={0.22}
                />
              ) : null}
              <path
                d={pathOf(pts)}
                fill="none"
                stroke={col}
                strokeWidth={sw * s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? `${f2(sw * 2)} ${f2(sw * 1.8)}` : undefined}
              />
              {s.label && drawn > 0.6 ? (
                <Txt
                  x={Math.min(tip.x, fr.x1 - fs)}
                  y={Math.max(fr.y1 + fs * 0.1, tip.y - fs * 0.9)}
                  size={fs * 0.85}
                  color={col}
                  halo={theme.paper}
                  fontFamily={fontFamily}
                  opacity={phase(drawn, 0.6, 1)}
                >
                  {s.label}
                </Txt>
              ) : null}
            </g>
          );
        })}
      </g>
      {p.markers.map((m, i) => {
        const x = num(m.x, p.vars);
        if (x === undefined) return null;
        const s = p.series[m.series];
        const y =
          m.y !== undefined ? num(m.y, p.vars) : s?.fn ? valueAt(s.fn, x, p.vars) : undefined;
        if (y === undefined) return null;
        const col = resolveColor(theme, m.color, theme.highlight);
        const cx = X(x);
        const cy = clipY(Y(y));
        return (
          <g key={`m${i}`} opacity={phase(reveal, 0.5, 0.8)}>
            {m.guides ? (
              <g stroke={col} strokeWidth={sw * 0.35} strokeDasharray={`${f2(sw)} ${f2(sw)}`}>
                <line x1={cx} x2={cx} y1={cy} y2={Y(Math.max(0, p.y[0]))} />
                <line x1={cx} x2={X(Math.max(0, p.x[0]))} y1={cy} y2={cy} />
              </g>
            ) : null}
            <circle
              cx={f2(cx)}
              cy={f2(cy)}
              r={f2(sw * 1.6)}
              fill={col}
              stroke={theme.paper}
              strokeWidth={sw * 0.5}
            />
            {m.label ? (
              <Txt
                x={cx + sw * 2.5}
                y={cy - fs * 0.8}
                size={fs * 0.85}
                color={col}
                halo={theme.paper}
                anchor="start"
                fontFamily={fontFamily}
              >
                {m.label}
              </Txt>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};
