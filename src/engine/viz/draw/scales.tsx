import React from "react";
import { f2 } from "../../lib/math";
import type { CalloutP, HistogramP, LabelP, NumberLineP } from "../params";
import { expectedShare, tally } from "../physics";
import { resolveColor } from "../theme";
import { Arrow, lin, numText, phase, sup, Txt, type DrawProps } from "./common";

export const Label: React.FC<DrawProps<LabelP>> = ({ p, w, h, theme, reveal, fontFamily }) => {
  const size = p.size * h;
  const x = p.align === "start" ? 0 : p.align === "end" ? w : w / 2;
  const col = resolveColor(theme, p.color);
  // Width estimate for the pill (Montserrat bold ≈ 0.62 em per character).
  const tw = Math.min(w, p.text.length * size * 0.62 + size);
  const px = p.align === "start" ? 0 : p.align === "end" ? w - tw : (w - tw) / 2;
  return (
    <g opacity={phase(reveal, 0, 1)}>
      {p.pill ? (
        <rect
          x={f2(px)}
          y={f2(h / 2 - size * 0.75)}
          width={f2(tw)}
          height={f2(size * 1.5)}
          rx={f2(size * 0.4)}
          fill={theme.paper}
          opacity={0.92}
        />
      ) : null}
      <Txt
        x={x + (p.align === "start" ? size * 0.5 : p.align === "end" ? -size * 0.5 : 0)}
        y={h / 2}
        size={size}
        color={col}
        halo={theme.paper}
        anchor={p.align}
        weight={p.weight}
        italic={p.italic}
        fontFamily={fontFamily}
      >
        {p.text}
      </Txt>
    </g>
  );
};

/** Text in its box with an arrow to a point; `target` arrives resolved to box-local px. */
export const Callout: React.FC<DrawProps<CalloutP> & { target: { x: number; y: number } }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  fontFamily,
  unit,
  target,
}) => {
  const size = p.size * h;
  const col = resolveColor(theme, p.color, theme.highlight);
  const sw = theme.stroke * unit;
  const from = { x: w / 2, y: target.y > h / 2 ? h / 2 + size * 0.75 : h / 2 - size * 0.75 };
  const g = phase(reveal, 0.3, 1);
  const tip = { x: from.x + (target.x - from.x) * g, y: from.y + (target.y - from.y) * g };
  return (
    <g>
      <g opacity={phase(reveal, 0, 0.3)}>
        <Txt
          x={w / 2}
          y={h / 2}
          size={size}
          color={col}
          halo={theme.paper}
          fontFamily={fontFamily}
          weight={800}
        >
          {p.text}
        </Txt>
      </g>
      {g > 0 ? (
        <Arrow x1={from.x} y1={from.y} x2={tip.x} y2={tip.y} color={col} width={sw * 0.6} />
      ) : null}
    </g>
  );
};

/** A number line, or a powers-of-ten scale (`log`), with marks and a moving pointer. */
export const NumberLine: React.FC<DrawProps<NumberLineP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  fontFamily,
  fs,
  unit,
}) => {
  const sw = theme.stroke * unit;
  const view = p.view ?? [p.min, p.max];
  const X = lin(view[0], view[1], fs, w - fs);
  const y = h * 0.55;
  const col = resolveColor(theme, p.color);
  const inView = (v: number) => v >= view[0] - 1e-9 && v <= view[1] + 1e-9;
  const steps: number[] = [];
  const first = Math.ceil(view[0] / p.step) * p.step;
  for (let v = first; v <= view[1] + 1e-9 && steps.length < 60; v += p.step)
    steps.push(+v.toFixed(9));
  const label = (v: number) => (p.log ? `10${sup(Math.round(v))}` : numText(v));
  const lineOn = phase(reveal, 0, 0.5);
  const every = Math.max(1, Math.ceil(steps.length / 11));
  return (
    <g>
      <line
        x1={f2(X(view[0]))}
        x2={f2(X(view[0]) + (X(view[1]) - X(view[0])) * lineOn)}
        y1={y}
        y2={y}
        stroke={col}
        strokeWidth={sw * 0.7}
        strokeLinecap="round"
      />
      {steps.map((v, i) => (
        <g
          key={v}
          opacity={phase(reveal, 0.2 + (0.4 * i) / steps.length, 0.3 + (0.4 * i) / steps.length)}
        >
          <line
            x1={f2(X(v))}
            x2={f2(X(v))}
            y1={y - fs * 0.35}
            y2={y + fs * 0.35}
            stroke={col}
            strokeWidth={sw * 0.45}
          />
          {p.labels && i % every === 0 ? (
            <Txt
              x={X(v)}
              y={y + fs * 1.05}
              size={fs * 0.75}
              color={theme.muted}
              halo={theme.paper}
              fontFamily={fontFamily}
              weight={600}
            >
              {label(v)}
            </Txt>
          ) : null}
        </g>
      ))}
      {p.marks
        .filter((m) => inView(m.value))
        .map((m, i) => {
          const mc = resolveColor(theme, m.color, theme.a[i % theme.a.length]);
          return (
            <g key={`m${i}`} opacity={phase(reveal, 0.6, 0.9)}>
              <circle
                cx={f2(X(m.value))}
                cy={y}
                r={f2(sw * 1.3)}
                fill={mc}
                stroke={theme.paper}
                strokeWidth={sw * 0.4}
              />
              {m.label ? (
                <Txt
                  x={X(m.value)}
                  y={y - fs * (i % 2 ? 1.9 : 1)}
                  size={fs * 0.8}
                  color={mc}
                  halo={theme.paper}
                  fontFamily={fontFamily}
                >
                  {m.label}
                </Txt>
              ) : null}
            </g>
          );
        })}
      {p.pointer !== undefined && inView(p.pointer) ? (
        <g opacity={phase(reveal, 0.7, 1)}>
          <Arrow
            x1={X(p.pointer)}
            y1={y - fs * 2.6}
            x2={X(p.pointer)}
            y2={y - sw}
            color={theme.highlight}
            width={sw * 0.8}
          />
          {p.pointerLabel ? (
            <Txt
              x={X(p.pointer)}
              y={y - fs * 3.2}
              size={fs}
              color={theme.highlight}
              halo={theme.paper}
              fontFamily={fontFamily}
            >
              {p.pointerLabel}
            </Txt>
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

/** Bars that fill as `n` seeded draws come in, against the line probability predicts. */
export const Histogram: React.FC<DrawProps<HistogramP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  fontFamily,
  fs,
  unit,
}) => {
  const sw = theme.stroke * unit;
  const bins =
    p.source === "dice"
      ? p.sides
      : p.source === "coin"
        ? 2
        : p.source === "two-dice"
          ? 2 * p.sides - 1
          : p.source === "values"
            ? (p.values?.length ?? 1)
            : p.bins;
  const counts =
    p.source === "values" ? (p.values ?? [0]) : tally(p.seed, p.source, p.n, p.sides, bins);
  const total =
    p.source === "values" ? Math.max(1e-9, Math.max(...counts)) : Math.max(1, Math.floor(p.n));
  const vals = counts.map((c) => (p.share && p.source !== "values" ? c / total : c));
  const exp =
    p.source === "values"
      ? []
      : expectedShare(p.source, p.sides, bins).map((s) => (p.share ? s : s * total));
  const top = p.yMax ?? Math.max(1e-9, ...vals, ...exp) * 1.15;
  const x0 = fs * 0.4;
  const x1 = w - fs * 0.4;
  const yb = h - fs * 1.4;
  const yt = fs * (p.count ? 1.6 : 0.4);
  const bw = (x1 - x0) / bins;
  const Y = lin(0, top, yb, yt);
  const col = resolveColor(theme, p.color, theme.a[0]);
  const labelOf = (i: number) =>
    p.labels?.[i] ??
    (p.source === "dice"
      ? String(i + 1)
      : p.source === "coin"
        ? i
          ? "T"
          : "H"
        : p.source === "two-dice"
          ? String(i + 2)
          : "");
  return (
    <g opacity={phase(reveal, 0, 0.3)}>
      <line x1={x0} x2={x1} y1={yb} y2={yb} stroke={theme.ink} strokeWidth={sw * 0.6} />
      {vals.map((v, i) => (
        <g key={i}>
          <rect
            x={f2(x0 + i * bw + bw * 0.12)}
            y={f2(Y(v))}
            width={f2(bw * 0.76)}
            height={f2(Math.max(0, yb - Y(v)))}
            fill={col}
            stroke={theme.ink}
            strokeWidth={sw * 0.3}
          />
          {labelOf(i) && bins <= 13 ? (
            <Txt
              x={x0 + (i + 0.5) * bw}
              y={yb + fs * 0.75}
              size={fs * 0.75}
              color={theme.muted}
              halo={theme.paper}
              fontFamily={fontFamily}
              weight={600}
            >
              {labelOf(i)}
            </Txt>
          ) : null}
        </g>
      ))}
      {p.expected && exp.length ? (
        <path
          d={exp
            .map(
              (e, i) =>
                `${i ? "L" : "M"} ${f2(x0 + i * bw)} ${f2(Y(e))} L ${f2(x0 + (i + 1) * bw)} ${f2(Y(e))}`,
            )
            .join(" ")}
          fill="none"
          stroke={theme.highlight}
          strokeWidth={sw * 0.6}
          strokeDasharray={`${f2(sw * 1.5)} ${f2(sw)}`}
        />
      ) : null}
      {p.count && p.source !== "values" ? (
        <Txt
          x={x1}
          y={fs * 0.7}
          size={fs * 0.9}
          color={theme.ink}
          halo={theme.paper}
          anchor="end"
          fontFamily={fontFamily}
        >
          {`n = ${Math.floor(p.n)}`}
        </Txt>
      ) : null}
    </g>
  );
};
