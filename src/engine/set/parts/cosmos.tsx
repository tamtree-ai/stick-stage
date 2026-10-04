/** Nebula night (`space` kit): stepped sky bands with nebula glow, a spiral galaxy, a ringed planet, a moon floor. */
import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { f2 } from "../../lib/math";
import { rand, randRange } from "../../lib/seed";
import { edge, partBase, partX, SET_LINE, type PartComponent } from "./types";

/** A four-point sparkle, `r` px from centre to tip. */
export const sparklePath = (x: number, y: number, r: number): string => {
  const k = r * 0.18;
  return `M${f2(x)},${f2(y - r)} Q${f2(x + k)},${f2(y - k)} ${f2(x + r)},${f2(y)} Q${f2(x + k)},${f2(y + k)} ${f2(x)},${f2(y + r)} Q${f2(x - k)},${f2(y + k)} ${f2(x - r)},${f2(y)} Q${f2(x - k)},${f2(y - k)} ${f2(x)},${f2(y - r)} Z`;
};

/**
 * A two-armed spiral galaxy in flat colours (core, arm dots, halo), tilted into an ellipse.
 * `spin` turns it (degrees); `speed` adds three motion arcs around the rim. Shared with the
 * galaxy figure.
 */
export const GalaxyShape: React.FC<{
  x: number;
  y: number;
  r: number;
  spin: number;
  tilt?: number;
  core: string;
  arm: string;
  halo: string;
  speed?: { color: string; width: number; opacity: number };
}> = ({ x, y, r, spin, tilt = -18, core, arm, halo, speed }) => {
  const dots: React.ReactNode[] = [];
  for (let a = 0; a < 2; a++)
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const ang = a * Math.PI + t * 3.4;
      const rr = r * (0.12 + t * 0.9);
      dots.push(
        <circle key={`${a}-${i}`} cx={f2(Math.cos(ang) * rr)} cy={f2(Math.sin(ang) * rr)} r={f2(r * (0.13 - t * 0.09))} fill={i % 3 ? arm : halo} opacity={f2(0.9 - t * 0.5)} />,
      );
    }
  const R = r * 1.15;
  return (
    <g transform={`translate(${f2(x)} ${f2(y)}) rotate(${f2(tilt)}) scale(1 0.55)`}>
      <circle r={r * 1.05} fill={halo} opacity={0.18} />
      <g transform={`rotate(${f2(spin)})`}>
        {dots}
        {speed
          ? [0, 1, 2].map((k) => {
              const a0 = k * 2.1;
              return (
                <path
                  key={k}
                  d={`M${f2(Math.cos(a0) * R)},${f2(Math.sin(a0) * R)} A${f2(R)},${f2(R)} 0 0 1 ${f2(Math.cos(a0 + 0.9) * R)},${f2(Math.sin(a0 + 0.9) * R)}`}
                  fill="none"
                  stroke={speed.color}
                  strokeWidth={speed.width}
                  strokeLinecap="round"
                  opacity={speed.opacity}
                />
              );
            })
          : null}
      </g>
      <circle r={r * 0.2} fill={core} />
      <circle r={r * 0.1} fill={lighten(core, 0.75)} />
    </g>
  );
};

/** Deep sky in stepped bands (wallA at the top → wallB), soft nebula glows, seeded stars and sparkles. */
export const NebulaSky: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const bands = 4;
  const top = -W * 0.4;
  const span = groundY - top;
  const star = lighten(palette.accent, 0.82);
  const glows = [palette.sky, palette.detail, palette.shade];
  const n = Math.round(120 * part.size);
  return (
    <g>
      {Array.from({ length: bands }, (_, i) => (
        <rect key={`b${i}`} x={-W * 0.4} y={f2(top + (i * span) / bands)} width={W * 1.8} height={f2(span / bands + 2)} fill={mix(palette.wallA, palette.wallB, i / (bands - 1))} />
      ))}
      <g opacity={0.33}>
        <ellipse cx={W * 0.19} cy={groundY * 0.35} rx={W * 0.48} ry={W * 0.2} fill={glows[0]} transform={`rotate(-24 ${f2(W * 0.19)} ${f2(groundY * 0.35)})`} />
        <ellipse cx={W * 0.83} cy={groundY * 0.2} rx={W * 0.39} ry={W * 0.15} fill={glows[1]} transform={`rotate(18 ${f2(W * 0.83)} ${f2(groundY * 0.2)})`} />
        <ellipse cx={W * 0.7} cy={groundY * 0.7} rx={W * 0.44} ry={W * 0.16} fill={glows[2]} transform={`rotate(-12 ${f2(W * 0.7)} ${f2(groundY * 0.7)})`} />
      </g>
      <g opacity={0.3}>
        <ellipse cx={W * 0.24} cy={groundY * 0.37} rx={W * 0.28} ry={W * 0.083} fill={glows[0]} transform={`rotate(-24 ${f2(W * 0.24)} ${f2(groundY * 0.37)})`} />
        <ellipse cx={W * 0.8} cy={groundY * 0.22} rx={W * 0.21} ry={W * 0.065} fill={glows[1]} transform={`rotate(18 ${f2(W * 0.8)} ${f2(groundY * 0.22)})`} />
      </g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={`s${i}`} cx={f2(W * rand(seed, `x${i}`))} cy={f2(groundY * rand(seed, `y${i}`))} r={f2(fig * randRange(seed, `r${i}`, 0.0019, 0.0066))} fill={star} opacity={f2(randRange(seed, `o${i}`, 0.35, 1))} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <path key={`k${i}`} d={sparklePath(W * rand(seed, `kx${i}`), (groundY - fig * 0.45) * rand(seed, `ky${i}`), fig * randRange(seed, `kr${i}`, 0.014, 0.033))} fill={star} />
      ))}
    </g>
  );
};

/** A spiral galaxy hanging in the sky (`x`, `y`, `size`; `variant: "speed"` adds motion arcs). */
export const Galaxy: PartComponent = ({ part, palette, W, H, fig, seed, marks }) => (
  <GalaxyShape
    x={partX(part, W, marks, 0.8)}
    y={(part.y ?? 0.58) * H}
    r={fig * 0.17 * part.size}
    spin={randRange(seed, "spin", 0, 360)}
    core={palette.accent}
    arm={lighten(palette.sky, 0.45)}
    halo={lighten(palette.shade, 0.45)}
    speed={part.variant === "speed" ? { color: lighten(palette.accent, 0.82), width: fig * 0.011, opacity: 0.9 } : undefined}
  />
);

/** A ringed planet, front half of the ring over the ball. */
export const RingedPlanet: PartComponent = ({ part, palette, W, H, fig, marks }) => {
  const cx = partX(part, W, marks, 0.14);
  const cy = (part.y ?? 0.62) * H;
  const r = fig * 0.11 * part.size;
  const ball = mix(palette.sky, palette.accent, 0.7);
  const ring = palette.accent;
  const line = darken(palette.wallA, 0.2);
  const rot = `rotate(-16 ${f2(cx)} ${f2(cy)})`;
  const sw = SET_LINE * 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={ball} stroke={line} strokeWidth={sw} />
      <path d={`M${f2(cx - r * 0.8)},${f2(cy - r * 0.42)} q${f2(r * 0.8)},${f2(-r * 0.2)} ${f2(r * 1.6)},${f2(r * 0.14)}`} fill="none" stroke={darken(ball, 0.14)} strokeWidth={r * 0.14} strokeLinecap="round" />
      <ellipse cx={cx} cy={cy} rx={r * 1.7} ry={r * 0.37} fill="none" stroke={line} strokeWidth={r * 0.2} transform={rot} />
      <ellipse cx={cx} cy={cy} rx={r * 1.7} ry={r * 0.37} fill="none" stroke={ring} strokeWidth={r * 0.1} transform={rot} />
      <path d={`M${f2(cx - r)},${f2(cy)} a${f2(r)},${f2(r)} 0 0 0 ${f2(2 * r)},0`} fill={ball} stroke={line} strokeWidth={sw} />
    </g>
  );
};

/** A curved moon floor with a darker near band and a few craters; feet stand a little inside its rim. */
export const MoonFloor: PartComponent = ({ part, palette, W, H, groundY, fig, seed }) => {
  const g = partBase(part, H, groundY);
  const rim = edge(palette.floor, 0.45);
  const near = darken(palette.floor, 0.14);
  const crater = darken(palette.floor, 0.1);
  const craters = [0, 1, 2, 3].map((i) => ({
    x: W * (0.1 + 0.27 * i + randRange(seed, `cx${i}`, -0.05, 0.05)),
    y: g + fig * randRange(seed, `cy${i}`, -0.03, 0.27),
    r: fig * randRange(seed, `cr${i}`, 0.045, 0.085),
  }));
  return (
    <g>
      <path d={`M${-W * 0.4},${g - 40} Q${W / 2},${g - 110} ${W * 1.4},${g - 40} V${H + 10} H${-W * 0.4} Z`} fill={palette.floor} stroke={rim} strokeWidth={SET_LINE * 2} />
      <path d={`M${-W * 0.4},${g + 120} Q${W / 2},${g + 60} ${W * 1.4},${g + 120} V${H + 10} H${-W * 0.4} Z`} fill={near} />
      {craters.map((c, i) => (
        <ellipse key={i} cx={f2(c.x)} cy={f2(c.y)} rx={f2(c.r)} ry={f2(c.r * 0.32)} fill={crater} stroke={rim} strokeWidth={SET_LINE * 1.3} />
      ))}
    </g>
  );
};
