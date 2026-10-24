import React from "react";
import { mixOk as mix, shade } from "../../lib/color";
import { rand, randRange } from "../../lib/seed";
import { derived } from "../palettes";
import { flipAt, partBase, partX, type PartComponent } from "./types";

/**
 * The story kit, outdoors: flat, outline-free shapes for the shape tier (round hills, lollipop
 * trees, puffy clouds). Palette roles: `sky`; `wallA` / `wallB` far and near hills; `floor` the
 * ground; `detail` foliage, `shade` its dark side; `accent` flowers, doors and roofs.
 */

/** Where the story ground starts: a low horizon, so the hills read behind short figures. */
export const storyHorizon = (groundY: number, fig: number) => groundY - fig * 0.26;

const Cloud: React.FC<{ x: number; y: number; s: number; fill: string }> = ({ x, y, s, fill }) => (
  <g fill={fill}>
    <ellipse cx={x} cy={y} rx={s * 0.9} ry={s * 0.28} />
    <circle cx={x - s * 0.35} cy={y - s * 0.12} r={s * 0.3} />
    <circle cx={x + s * 0.15} cy={y - s * 0.22} r={s * 0.38} />
  </g>
);

/** Sky with clouds; `variant`: "sun" (default), "moon" (stars and a moon), "plain". */
export const StorySky: PartComponent = ({ part, palette, W, groundY, fig, seed }) => {
  const v = part.variant ?? "sun";
  const night = v === "moon";
  const cloud = night ? shade(palette.sky, -0.21) : shade(palette.sky, -0.83);
  const glow = palette.glow ?? shade(palette.accent, night ? -0.63 : -0.29);
  return (
    <g>
      <rect width={W} height={groundY + 4} fill={palette.sky} />
      {v === "sun" ? (
        <g>
          <circle cx={W * 0.82} cy={groundY * 0.2} r={fig * 0.16} fill={shade(glow, -0.57)} opacity={0.5} />
          <circle cx={W * 0.82} cy={groundY * 0.2} r={fig * 0.11} fill={glow} />
        </g>
      ) : null}
      {night ? (
        <g>
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={W * rand(seed, `sx${i}`)} cy={groundY * randRange(seed, `sy${i}`, 0.03, 0.55)} r={fig * randRange(seed, `sr${i}`, 0.004, 0.009)} fill={glow} />
          ))}
          <circle cx={W * 0.8} cy={groundY * 0.18} r={fig * 0.09} fill={glow} />
          <circle cx={W * 0.8 + fig * 0.04} cy={groundY * 0.18 - fig * 0.02} r={fig * 0.08} fill={palette.sky} />
        </g>
      ) : null}
      {v === "plain"
        ? null
        : [0, 1, 2].map((i) => (
            <Cloud key={i} x={W * (0.12 + 0.33 * i) + randRange(seed, `cx${i}`, -80, 80)} y={groundY * randRange(seed, `cy${i}`, 0.14, 0.38)} s={fig * randRange(seed, `cs${i}`, 0.16, 0.24)} fill={cloud} />
          ))}
    </g>
  );
};

/** Two bands of round hills behind the ground. */
export const StoryHills: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const hz = storyHorizon(groundY, fig);
  const humps = (key: string, n: number, y: number, r0: number, r1: number, fill: string) => (
    <g fill={fill}>
      {Array.from({ length: n }, (_, i) => {
        const r = fig * randRange(seed, `${key}r${i}`, r0, r1);
        return <ellipse key={i} cx={(W * (i + randRange(seed, `${key}x${i}`, 0.1, 0.9))) / (n - 1)} cy={y} rx={r * 1.6} ry={r} />;
      })}
      <rect x={0} y={y} width={W} height={H - y} />
    </g>
  );
  return (
    <g>
      {humps("far", 5, hz + fig * 0.02, 0.32, 0.5, palette.wallA)}
      {humps("near", 6, hz + fig * 0.08, 0.16, 0.28, palette.wallB)}
    </g>
  );
};

/** The ground from the horizon down; `variant: "path"` lays a winding path toward the front. */
export const StoryGround: PartComponent = ({ part, palette, W, H, groundY, fig }) => {
  const hz = storyHorizon(groundY, fig) + fig * 0.12;
  const path = shade(mix(palette.floor, palette.accent, 0.15), -0.40);
  return (
    <g>
      <rect x={0} y={hz} width={W} height={H - hz} fill={palette.floor} />
      {part.variant === "path" ? (
        <path d={`M${W * 0.46},${hz} C${W * 0.44},${groundY - fig * 0.05} ${W * 0.2},${groundY} ${W * 0.1},${H} L${W * 0.9},${H} C${W * 0.8},${groundY} ${W * 0.56},${groundY - fig * 0.05} ${W * 0.54},${hz} Z`} fill={path} />
      ) : null}
    </g>
  );
};

/** A lollipop tree. `variant`: "round" (default), "tall" (a rounded cone), "apple" (with fruit). */
export const StoryTree: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.15);
  const base = partBase(part, H, groundY);
  const { wood } = derived(palette);
  const trunkW = s * 0.07;
  const v = part.variant ?? "round";
  const top = base - s * 0.55;
  const crown =
    v === "tall" ? (
      <path d={`M${cx},${top - s * 0.62} C${cx + s * 0.2},${top - s * 0.4} ${cx + s * 0.26},${top + s * 0.08} ${cx},${top + s * 0.1} C${cx - s * 0.26},${top + s * 0.08} ${cx - s * 0.2},${top - s * 0.4} ${cx},${top - s * 0.62} Z`} fill={palette.detail} />
    ) : (
      <g>
        <circle cx={cx} cy={top - s * 0.12} r={s * 0.3} fill={palette.detail} />
        <circle cx={cx + s * 0.08} cy={top - s * 0.2} r={s * 0.14} fill={shade(palette.detail, -0.14)} />
      </g>
    );
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={cx - trunkW / 2} y={top} width={trunkW} height={base - top} rx={trunkW / 2} fill={wood} />
      {crown}
      {v === "apple"
        ? [0, 1, 2, 3].map((i) => (
            <circle key={i} cx={cx + s * randRange(seed, `ax${i}`, -0.2, 0.2)} cy={top - s * randRange(seed, `ay${i}`, -0.02, 0.3)} r={s * 0.035} fill={palette.accent} />
          ))
        : null}
    </g>
  );
};

export const StoryBush: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.25);
  const base = partBase(part, H, groundY);
  const c = mix(palette.detail, palette.shade, 0.3);
  return (
    <g fill={c}>
      <ellipse cx={cx} cy={base - s * 0.06} rx={s * 0.22} ry={s * 0.08} />
      <circle cx={cx - s * 0.1} cy={base - s * 0.1} r={s * 0.09} />
      <circle cx={cx + s * 0.06} cy={base - s * 0.13} r={s * 0.11} />
    </g>
  );
};

/** A clump of flowers in the accent colour. */
export const StoryFlowers: PartComponent = ({ part, palette, W, H, groundY, fig, seed, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.3);
  const base = partBase(part, H, groundY);
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => {
        const x = cx + s * (i - 2) * 0.06 + s * randRange(seed, `fx${i}`, -0.015, 0.015);
        const h = s * randRange(seed, `fh${i}`, 0.06, 0.12);
        const petal = i % 2 ? palette.accent : shade(palette.accent, -0.46);
        return (
          <g key={i}>
            <rect x={x - s * 0.006} y={base - h} width={s * 0.012} height={h} fill={palette.shade} />
            <circle cx={x} cy={base - h} r={s * 0.022} fill={petal} />
          </g>
        );
      })}
    </g>
  );
};

/** A pond: a flat ellipse on the ground with a light ripple. */
export const StoryPond: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.75);
  const base = partBase(part, H, groundY) + s * 0.06;
  const water = mix(palette.sky, shade(palette.sky, 0.32), 0.5);
  return (
    <g>
      <ellipse cx={cx} cy={base} rx={s * 0.42} ry={s * 0.09} fill={water} />
      <ellipse cx={cx - s * 0.08} cy={base - s * 0.015} rx={s * 0.14} ry={s * 0.02} fill={shade(water, -0.46)} />
    </g>
  );
};

export const StoryRock: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.7);
  const base = partBase(part, H, groundY);
  const c = mix(palette.wallB, shade(palette.floor, 0.48), 0.5);
  return <path d={`M${cx - s * 0.14},${base} C${cx - s * 0.14},${base - s * 0.12} ${cx + s * 0.1},${base - s * 0.14} ${cx + s * 0.14},${base} Z`} fill={c} />;
};

/** A picket fence across the frame behind the cast. */
export const StoryFence: PartComponent = ({ part, palette, W, groundY, fig }) => {
  const s = fig * part.size;
  const base = storyHorizon(groundY, fig) + fig * 0.16;
  const c = shade(derived(palette).wood, -0.52);
  const n = Math.ceil(W / (s * 0.12));
  return (
    <g fill={c}>
      <rect x={0} y={base - s * 0.14} width={W} height={s * 0.025} />
      <rect x={0} y={base - s * 0.07} width={W} height={s * 0.025} />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * s * 0.12},${base} v${-s * 0.18} l${s * 0.025},${-s * 0.03} l${s * 0.025},${s * 0.03} v${s * 0.18} Z`} />
      ))}
    </g>
  );
};

/** Beach: the sea band at the horizon (`wallA` / `wallB` blues) and sand (`floor`) from it down. */
export const StorySea: PartComponent = ({ palette, W, H, groundY, fig }) => {
  const hz = storyHorizon(groundY, fig);
  return (
    <g>
      <rect x={0} y={hz - fig * 0.04} width={W} height={H - hz} fill={palette.wallA} />
      <rect x={0} y={hz + fig * 0.06} width={W} height={H - hz} fill={palette.wallB} />
      <path d={`M0,${hz + fig * 0.14} ${Array.from({ length: 13 }, (_, i) => `Q${(W * (i + 0.5)) / 12},${hz + fig * 0.1} ${(W * (i + 1)) / 12},${hz + fig * 0.14}`).join(" ")} V${H} H0 Z`} fill={palette.floor} />
    </g>
  );
};
