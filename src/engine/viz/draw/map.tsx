import React from "react";
import { mix } from "../../lib/color";
import { f2 } from "../../lib/math";
import { project, WORLD_VIEW } from "../geo";
import { REGIONS } from "../map";
import { formatValue, type MapP } from "../paramsData";
import { phase, Txt, type DrawProps } from "./common";

/** A world map: land, a choropleth, highlighted countries, dots and arcs, framed on `view`. */
export const MapFig: React.FC<DrawProps<MapP> & { fs: number; id: string }> = ({ p, w, h, theme, reveal, fontFamily, unit, fs, id }) => {
  const [x0, y0, x1, y1] = p.view ?? WORLD_VIEW;
  // Fit the view in the box (meet), centred.
  const s = Math.min(w / (x1 - x0), h / (y1 - y0));
  const ox = (w - (x1 - x0) * s) / 2 - x0 * s;
  const oy = (h - (y1 - y0) * s) / 2 - y0 * s;
  const at = (lon: number, lat: number) => {
    const [x, y] = project(lon, lat);
    return { x: ox + x * s, y: oy + y * s };
  };
  const values = new Map((p.data ?? []).map(([k, v]) => [String(k), v]));
  const vs = [...values.values()];
  const lo = vs.length ? Math.min(...vs) : 0;
  const hi = vs.length ? Math.max(...vs) : 1;
  const bold = p.variant === "bold";
  const land = bold ? theme.paper : mix(theme.muted, theme.paper, 0.55);
  const low = mix(theme.a[0], theme.paper, 0.8);
  const fillIn = phase(reveal, 0.35, 1);
  const lit = new Set(p.highlight);
  const fillOf = (rid: string) => {
    if (lit.has(rid)) return mix(land, theme.highlight, fillIn);
    const v = values.get(rid);
    if (v === undefined) return land;
    return mix(land, mix(low, theme.a[0], hi > lo ? (v - lo) / (hi - lo) : 1), fillIn);
  };
  const clip = `map-clip-${id}`;
  const draw = Math.min(p.draw, phase(reveal, 0.4, 1));
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={f2(w)} height={f2(h)} rx={f2(bold ? fs * 0.6 : 0)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`} opacity={phase(reveal, 0, 0.35)}>
        {bold ? <rect x={0} y={0} width={f2(w)} height={f2(h)} fill={mix(theme.a[0], theme.paper, 0.88)} /> : null}
        <g transform={`translate(${f2(ox)} ${f2(oy)}) scale(${s.toFixed(5)})`}>
          {REGIONS.map((r) => (
            <path key={r.id} d={r.d} fill={fillOf(r.id)} stroke={bold ? mix(theme.muted, theme.paper, 0.4) : theme.paper} strokeWidth={f2(unit * 1.4)} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
        </g>
        {p.routes.map((rt, i) => {
          const a = at(rt.from[0], rt.from[1]);
          const b = at(rt.to[0], rt.to[1]);
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - len * 0.3 };
          return <path key={`r${i}`} d={`M ${f2(a.x)} ${f2(a.y)} Q ${f2(c.x)} ${f2(c.y)} ${f2(b.x)} ${f2(b.y)}`} fill="none" stroke={theme.highlight} strokeWidth={f2(unit * 5)} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={f2(1 - draw)} />;
        })}
        {p.points.map((pt, i) => {
          const q = at(pt.lon, pt.lat);
          const pop = phase(reveal, 0.4 + (0.5 * i) / Math.max(1, p.points.length), 0.6 + (0.4 * i) / Math.max(1, p.points.length));
          const r = fs * 0.32 * pt.size * pop;
          return (
            <g key={`p${i}`}>
              <circle cx={f2(q.x)} cy={f2(q.y)} r={f2(r)} fill={theme.highlight} stroke={theme.paper} strokeWidth={f2(unit * 3)} />
              {pt.label && pop > 0.5 ? <Txt x={q.x + r + fs * 0.25} y={q.y} size={fs * 0.75} color={theme.ink} halo={theme.paper} anchor="start" weight={800} fontFamily={fontFamily}>{pt.label}</Txt> : null}
            </g>
          );
        })}
      </g>
      {p.legend && vs.length ? (
        <g opacity={fillIn}>
          <defs>
            <linearGradient id={`${clip}-key`}>
              <stop offset="0" stopColor={low} />
              <stop offset="1" stopColor={theme.a[0]} />
            </linearGradient>
          </defs>
          <rect x={f2(fs * 0.5)} y={f2(h - fs * 1.2)} width={f2(w * 0.22)} height={f2(fs * 0.45)} rx={f2(fs * 0.2)} fill={`url(#${clip}-key)`} />
          <Txt x={fs * 0.5} y={h - fs * 1.75} size={fs * 0.62} color={theme.muted} halo={theme.paper} anchor="start" weight={700} fontFamily={fontFamily}>{formatValue(lo, p.unit)}</Txt>
          <Txt x={fs * 0.5 + w * 0.22} y={h - fs * 1.75} size={fs * 0.62} color={theme.muted} halo={theme.paper} anchor="end" weight={700} fontFamily={fontFamily}>{formatValue(hi, p.unit)}</Txt>
        </g>
      ) : null}
    </g>
  );
};
