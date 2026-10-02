import React from "react";
import { f2 } from "../../lib/math";
import type { VectorP, WaveP } from "../params";
import { packet, standing, travelling } from "../physics";
import { resolveColor } from "../theme";
import { Arrow, lin, pathOf, phase, ticks, Txt, type DrawProps } from "./common";

/** Vectors on a square-unit grid: arrows, optional components, and the resultant. */
export const Vectors: React.FC<DrawProps<VectorP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  fontFamily,
  fs,
  unit,
}) => {
  const pad = fs * 0.8;
  // Square units: fit the larger span.
  const ux = (w - 2 * pad) / (p.x[1] - p.x[0]);
  const uy = (h - 2 * pad) / (p.y[1] - p.y[0]);
  const u = Math.min(ux, uy);
  const cx = w / 2 - ((p.x[0] + p.x[1]) / 2) * u;
  const cy = h / 2 + ((p.y[0] + p.y[1]) / 2) * u;
  const X = (x: number) => cx + x * u;
  const Y = (y: number) => cy - y * u;
  const sw = theme.stroke * unit;
  const grid = phase(reveal, 0, 0.3);
  const n = p.vectors.length + (p.sum ? 1 : 0);
  const grow = (i: number) => phase(reveal, 0.25 + (0.6 * i) / n, 0.25 + (0.6 * (i + 1)) / n);
  let tip: [number, number] = [p.vectors[0]!.from[0], p.vectors[0]!.from[1]];
  const total: [number, number] = [0, 0];
  return (
    <g>
      <g opacity={grid}>
        {p.grid
          ? [
              ...ticks(p.x[0], p.x[1], 10).map((v) => (
                <line
                  key={`gx${v}`}
                  x1={f2(X(v))}
                  x2={f2(X(v))}
                  y1={f2(Y(p.y[0]))}
                  y2={f2(Y(p.y[1]))}
                  stroke={theme.muted}
                  strokeWidth={sw * 0.22}
                  opacity={0.5}
                />
              )),
              ...ticks(p.y[0], p.y[1], 10).map((v) => (
                <line
                  key={`gy${v}`}
                  y1={f2(Y(v))}
                  y2={f2(Y(v))}
                  x1={f2(X(p.x[0]))}
                  x2={f2(X(p.x[1]))}
                  stroke={theme.muted}
                  strokeWidth={sw * 0.22}
                  opacity={0.5}
                />
              )),
            ]
          : null}
        {p.axes ? (
          <g stroke={theme.muted} strokeWidth={sw * 0.45}>
            <line x1={f2(X(p.x[0]))} x2={f2(X(p.x[1]))} y1={f2(Y(0))} y2={f2(Y(0))} />
            <line x1={f2(X(0))} x2={f2(X(0))} y1={f2(Y(p.y[0]))} y2={f2(Y(p.y[1]))} />
          </g>
        ) : null}
      </g>
      {p.vectors.map((v, i) => {
        const g = grow(i);
        const from: [number, number] = p.sum?.tipToTail && i > 0 ? tip : v.from;
        const to: [number, number] = [from[0] + v.v[0] * g, from[1] + v.v[1] * g];
        total[0] += v.v[0];
        total[1] += v.v[1];
        if (p.sum?.tipToTail) tip = [from[0] + v.v[0], from[1] + v.v[1]];
        const col = resolveColor(theme, v.color, theme.a[i % theme.a.length]);
        return (
          <g key={i} opacity={g > 0 ? 1 : 0}>
            {v.components && g >= 1 ? (
              <g opacity={0.7}>
                <Arrow
                  x1={X(from[0])}
                  y1={Y(from[1])}
                  x2={X(from[0] + v.v[0])}
                  y2={Y(from[1])}
                  color={col}
                  width={sw * 0.5}
                  dashed
                />
                <Arrow
                  x1={X(from[0] + v.v[0])}
                  y1={Y(from[1])}
                  x2={X(to[0])}
                  y2={Y(to[1])}
                  color={col}
                  width={sw * 0.5}
                  dashed
                />
              </g>
            ) : null}
            <Arrow
              x1={X(from[0])}
              y1={Y(from[1])}
              x2={X(to[0])}
              y2={Y(to[1])}
              color={col}
              width={sw}
              dashed={v.dashed}
            />
            {v.label && g >= 1 ? (
              <Txt
                x={X(from[0] + v.v[0] / 2) - (v.v[1] * u > 0 ? -fs * 0.8 : fs * 0.8)}
                y={Y(from[1] + v.v[1] / 2) - fs * 0.6}
                size={fs}
                color={col}
                halo={theme.paper}
                fontFamily={fontFamily}
              >
                {v.label}
              </Txt>
            ) : null}
          </g>
        );
      })}
      {p.sum
        ? (() => {
            const g = grow(p.vectors.length);
            const o = p.vectors[0]!.from;
            const col = resolveColor(theme, p.sum.color, theme.highlight);
            return (
              <g opacity={g > 0 ? 1 : 0}>
                <Arrow
                  x1={X(o[0])}
                  y1={Y(o[1])}
                  x2={X(o[0] + total[0] * g)}
                  y2={Y(o[1] + total[1] * g)}
                  color={col}
                  width={sw * 1.3}
                />
                {p.sum.label && g >= 1 ? (
                  <Txt
                    x={X(o[0] + total[0] / 2) + fs}
                    y={Y(o[1] + total[1] / 2) + fs}
                    size={fs * 1.05}
                    color={col}
                    halo={theme.paper}
                    fontFamily={fontFamily}
                  >
                    {p.sum.label}
                  </Txt>
                ) : null}
              </g>
            );
          })()
        : null}
    </g>
  );
};

const SAMPLES = 220;

/** Travelling, summed, standing waves and wave packets, moving with real time. */
export const Wave: React.FC<DrawProps<WaveP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  t,
  fontFamily,
  fs,
  unit,
}) => {
  const sw = theme.stroke * unit;
  const X = lin(p.x[0], p.x[1], fs * 0.5, w - fs * 0.5);
  const Y = lin(-p.yMax, p.yMax, h - fs * 0.3, fs * 0.3);
  const time = t * p.speed;
  const drawTo = p.x[0] + (p.x[1] - p.x[0]) * phase(reveal, 0.1, 1);
  const curve = (f: (x: number) => number) => {
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const x = p.x[0] + ((drawTo - p.x[0]) * k) / SAMPLES;
      pts.push({ x: X(x), y: Y(f(x)) });
    }
    return pathOf(pts);
  };
  const comps = p.components;
  const single = (i: number) => (x: number) => {
    const c = comps[i]!;
    if (p.mode === "standing") return standing(c, x, time);
    if (p.mode === "packet")
      return packet(c, x, time, p.packetWidth, p.x[0] + (p.x[1] - p.x[0]) * 0.2);
    return travelling(c, x, time);
  };
  const sum = (x: number) => comps.reduce((s, _, i) => s + single(i)(x), 0);
  return (
    <g>
      {p.axis ? (
        <line
          x1={f2(X(p.x[0]))}
          x2={f2(X(p.x[1]))}
          y1={f2(Y(0))}
          y2={f2(Y(0))}
          stroke={theme.muted}
          strokeWidth={sw * 0.35}
          opacity={phase(reveal, 0, 0.2)}
        />
      ) : null}
      {p.mode === "sum" ? (
        <>
          {p.showComponents
            ? comps.map((c, i) => (
                <path
                  key={i}
                  d={curve(single(i))}
                  fill="none"
                  stroke={resolveColor(theme, c.color, theme.a[i % theme.a.length])}
                  strokeWidth={sw * 0.55}
                  opacity={0.6}
                  strokeDasharray={`${f2(sw * 1.6)} ${f2(sw * 1.2)}`}
                />
              ))
            : null}
          <path
            d={curve(sum)}
            fill="none"
            stroke={theme.highlight}
            strokeWidth={sw * 1.1}
            strokeLinecap="round"
          />
        </>
      ) : (
        comps.map((c, i) => (
          <path
            key={i}
            d={curve(single(i))}
            fill="none"
            stroke={resolveColor(theme, c.color, theme.a[i % theme.a.length])}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        ))
      )}
      {p.label ? (
        <Txt
          x={w / 2}
          y={fs * 0.6}
          size={fs}
          color={theme.ink}
          halo={theme.paper}
          fontFamily={fontFamily}
        >
          {p.label}
        </Txt>
      ) : null}
    </g>
  );
};
