import React from "react";
import { f2 } from "../../lib/math";
import { noise } from "../../lib/seed";
import type { OrbitP, ParticlesP } from "../params";
import { orbitGeometry } from "../geometry";
import { keplerPosition, particleAt, seedParticles, visViva } from "../physics";
import { resolveColor } from "../theme";
import { Arrow, pathOf, phase, Txt, type DrawProps } from "./common";

/** A Kepler orbit: the planet really speeds up near the star (Kepler's equation, not a circle at constant speed). */
export const Orbit: React.FC<DrawProps<OrbitP> & { fs: number }> = ({
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
  const ecc = p.e;
  // Ellipse centre in the box centre; the star sits on the focus toward +x.
  const { a, fx, fy } = orbitGeometry(w, h, ecc, fs);
  const at = (phaseOfPeriod: number) => {
    const q = keplerPosition(phaseOfPeriod, ecc, a);
    return { x: fx + q.x, y: fy - q.y };
  };
  const now = p.phase + t / p.period;
  const planet = at(now);
  const pathPts = Array.from({ length: 121 }, (_, i) => at(i / 120));
  const pathOn = phase(reveal, 0, 0.6);
  const sectors = Array.from({ length: p.sweep }, (_, s) => {
    const start = s / p.sweep;
    const span = 1 / (2 * p.sweep);
    const pts = Array.from({ length: 25 }, (_, i) => at(start + (span * i) / 24));
    return { d: `M ${f2(fx)} ${f2(fy)} L ${pathOf(pts).slice(2)} Z`, s };
  });
  const trail = p.trail
    ? Array.from({ length: 24 }, (_, i) => at(now - (0.12 * (24 - i)) / 24))
    : [];
  const mark = p.highlight === "none" ? undefined : p.highlight === "perihelion" ? at(0) : at(0.5);
  const starCol = resolveColor(theme, p.starColor, theme.highlight);
  const planetCol = resolveColor(theme, p.planetColor, theme.a[1]);
  const r = (sOf: number) => sOf * h;
  // Velocity: tangent from a tiny step, length from vis-viva.
  const ahead = at(now + 0.002);
  const dist = Math.hypot(planet.x - fx, planet.y - fy) / a;
  const speed = visViva(Math.max(0.05, dist));
  const dx = ahead.x - planet.x;
  const dy = ahead.y - planet.y;
  const dl = Math.hypot(dx, dy) || 1;
  const vLen = speed * a * 0.35;
  return (
    <g>
      {sectors.map((sc) => (
        <path
          key={sc.s}
          d={sc.d}
          fill={sc.s % 2 ? theme.a[0] : theme.a[1]}
          opacity={0.28 * phase(reveal, 0.5, 1)}
        />
      ))}
      {p.path ? (
        <path
          d={pathOf(pathPts.slice(0, Math.max(2, Math.round(pathPts.length * pathOn))))}
          fill="none"
          stroke={theme.muted}
          strokeWidth={sw * 0.4}
          strokeDasharray={`${f2(sw * 1.4)} ${f2(sw * 1.4)}`}
        />
      ) : null}
      {trail.length ? (
        <path
          d={pathOf(trail)}
          fill="none"
          stroke={planetCol}
          strokeWidth={sw * 0.8}
          opacity={0.45 * phase(reveal, 0.6, 1)}
          strokeLinecap="round"
        />
      ) : null}
      <circle
        cx={f2(fx)}
        cy={f2(fy)}
        r={f2(r(p.starR) * phase(reveal, 0, 0.3))}
        fill={starCol}
        stroke={theme.ink}
        strokeWidth={sw * 0.4}
      />
      {ecc > 0.01 && p.sweep > 0 ? (
        <circle cx={f2(w / 2 - a * ecc)} cy={f2(fy)} r={f2(sw * 0.6)} fill={theme.muted} />
      ) : null}
      {mark ? (
        <g opacity={phase(reveal, 0.7, 1)}>
          <circle
            cx={f2(mark.x)}
            cy={f2(mark.y)}
            r={f2(r(p.planetR) * 2.2)}
            fill="none"
            stroke={theme.highlight}
            strokeWidth={sw * 0.5}
          />
          <Txt
            x={mark.x}
            y={mark.y + r(p.planetR) * 2.2 + fs * 0.8}
            size={fs * 0.9}
            color={theme.highlight}
            halo={theme.paper}
            fontFamily={fontFamily}
          >
            {p.highlight === "perihelion" ? "fastest" : "slowest"}
          </Txt>
        </g>
      ) : null}
      <circle
        cx={f2(planet.x)}
        cy={f2(planet.y)}
        r={f2(r(p.planetR) * phase(reveal, 0.4, 0.7))}
        fill={planetCol}
        stroke={theme.ink}
        strokeWidth={sw * 0.4}
      />
      {p.velocity && reveal >= 1 ? (
        <Arrow
          x1={planet.x}
          y1={planet.y}
          x2={planet.x + (dx / dl) * vLen}
          y2={planet.y + (dy / dl) * vLen}
          color={theme.highlight}
          width={sw * 0.7}
        />
      ) : null}
    </g>
  );
};

/** Seeded dots: a gas bouncing in a box, a drifting cloud, a still field of stars, or a falling drop. */
export const Particles: React.FC<DrawProps<ParticlesP> & { fs: number }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  t,
  fontFamily,
  unit,
}) => {
  const sw = theme.stroke * unit;
  const list = seedParticles(p.seed, p.count, p.speed, p.colors.length, p.charged);
  const rad = p.radius * h;
  const inset = rad * 1.4;
  const iw = w - 2 * inset;
  const ih = h - 2 * inset;
  const run = t;
  const pos = (q: (typeof list)[number], time: number) => {
    const u = particleAt(q, time, p.mode, w / h);
    return { x: inset + u.x * iw, y: inset + u.y * ih };
  };
  const shown = Math.round(list.length * phase(reveal, 0.1, 0.9));
  return (
    <g>
      {p.box ? (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={sw}
          fill="none"
          stroke={theme.ink}
          strokeWidth={sw * 0.6}
          opacity={phase(reveal, 0, 0.25)}
        />
      ) : null}
      {list.slice(0, shown).map((q, i) => {
        const at = pos(q, run);
        const col = resolveColor(theme, p.colors[q.color], theme.a[0]);
        const hi = p.highlight === i;
        const r = rad * q.r * (hi ? 1.8 : 1);
        const tw = p.twinkle ? 0.55 + 0.45 * noise(p.seed, `tw${i}`, run * 1.5) : 1;
        const trailPts =
          p.trail > 0 && p.mode !== "still"
            ? Array.from({ length: 8 }, (_, k) =>
                pos(q, Math.max(0, run - (p.trail * (8 - k)) / 8)),
              )
            : [];
        // Skip trail segments that wrapped around a drift edge.
        const wrapped = trailPts.some(
          (a, k) =>
            k > 0 && Math.hypot(a.x - trailPts[k - 1]!.x, a.y - trailPts[k - 1]!.y) > w * 0.3,
        );
        return (
          <g key={i} opacity={tw}>
            {trailPts.length && !wrapped ? (
              <path
                d={pathOf([...trailPts, at])}
                fill="none"
                stroke={hi ? theme.highlight : col}
                strokeWidth={r * 0.7}
                opacity={0.35}
                strokeLinecap="round"
              />
            ) : null}
            <circle
              cx={f2(at.x)}
              cy={f2(at.y)}
              r={f2(r)}
              fill={hi ? theme.highlight : col}
              stroke={p.twinkle ? undefined : theme.ink}
              strokeWidth={p.twinkle ? 0 : sw * 0.3}
            />
            {q.charge !== 0 ? (
              <Txt
                x={at.x}
                y={at.y + r * 0.05}
                size={r * 1.7}
                color={theme.paper}
                halo={col}
                fontFamily={fontFamily}
                weight={900}
              >
                {q.charge < 0 ? "−" : "+"}
              </Txt>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};
