import React from "react";
import { darken, lighten, mix } from "../../lib/color";
import { derived } from "../palettes";
import { SEAT_HEIGHT } from "./seats";
import { storyHorizon } from "./storyOutdoor";
import { flipAt, partBase, partX, type PartComponent } from "./types";

/**
 * The story kit's buildings, rooms and furniture: flat, outline-free. Indoors the roles are
 * `wallA` the wall, `wallB` the skirting band, `floor`, `accent` rugs and doors, `detail` plants,
 * `shade` frames and wood trim, `sky` window glass.
 */

/** A small house behind the cast: a box, a roof, a door and a window. */
export const StoryHouse: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.8);
  const base = part.y !== undefined ? part.y * H : storyHorizon(groundY, fig) + fig * 0.14;
  const w = s * 0.62;
  const h = s * 0.42;
  const wall = lighten(palette.wallA, 0.55);
  const roof = palette.accent;
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={cx - w / 2} y={base - h} width={w} height={h} fill={wall} />
      <path d={`M${cx - w * 0.6},${base - h} L${cx},${base - h - s * 0.3} L${cx + w * 0.6},${base - h} Z`} fill={roof} />
      <rect x={cx - w * 0.12} y={base - h * 0.55} width={w * 0.24} height={h * 0.55} rx={w * 0.12} fill={darken(roof, 0.15)} />
      <rect x={cx + w * 0.2} y={base - h * 0.78} width={w * 0.2} height={w * 0.18} rx={w * 0.03} fill={lighten(palette.sky, 0.2)} />
    </g>
  );
};

/** The clubhouse: a round-topped hut with a big round door and a flag. Stands on the ground line. */
export const StoryClubhouse: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY) - fig * 0.02;
  const w = s * 1.1;
  const h = s * 0.62;
  const wall = lighten(palette.accent, 0.5);
  const door = darken(palette.accent, 0.1);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <path d={`M${cx - w / 2},${base} V${base - h * 0.55} A${w / 2},${h * 0.45} 0 0 1 ${cx + w / 2},${base - h * 0.55} V${base} Z`} fill={wall} />
      <path d={`M${cx - w * 0.16},${base} V${base - h * 0.32} A${w * 0.16},${w * 0.16} 0 0 1 ${cx + w * 0.16},${base - h * 0.32} V${base} Z`} fill={door} />
      <circle cx={cx + w * 0.3} cy={base - h * 0.62} r={w * 0.08} fill={lighten(palette.sky, 0.25)} />
      <circle cx={cx - w * 0.3} cy={base - h * 0.62} r={w * 0.08} fill={lighten(palette.sky, 0.25)} />
      <rect x={cx - s * 0.008} y={base - h - s * 0.32} width={s * 0.016} height={s * 0.34} fill={palette.shade} />
      <path d={`M${cx},${base - h - s * 0.32} l${s * 0.18},${s * 0.05} l${-s * 0.18},${s * 0.05} Z`} fill={palette.accent} />
    </g>
  );
};

/** A low story bench; cast on `seatFor` marks sit on it. */
export const StoryBench: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.75;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT["story-bench"] * s;
  const wood = derived(palette).wood;
  return (
    <g>
      <rect x={cx - w / 2} y={seatTop - s * 0.13} width={w} height={s * 0.05} rx={s * 0.025} fill={lighten(wood, 0.1)} />
      <rect x={cx - w * 0.42} y={seatTop} width={s * 0.04} height={base - seatTop} rx={s * 0.015} fill={darken(wood, 0.1)} />
      <rect x={cx + w * 0.42 - s * 0.04} y={seatTop} width={s * 0.04} height={base - seatTop} rx={s * 0.015} fill={darken(wood, 0.1)} />
      <rect x={cx - w / 2 - s * 0.02} y={seatTop - s * 0.01} width={w + s * 0.04} height={s * 0.045} rx={s * 0.02} fill={wood} />
    </g>
  );
};

/** A room: wall and skirting band. */
export const StoryWall: PartComponent = ({ palette, W, groundY, fig }) => {
  const skirt = groundY - fig * 0.12;
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.wallA} />
      <rect x={0} y={skirt} width={W} height={groundY - skirt} fill={palette.wallB} />
    </g>
  );
};

export const StoryFloor: PartComponent = ({ palette, W, H, groundY, fig }) => (
  <g>
    <rect x={0} y={groundY - fig * 0.04} width={W} height={H - groundY + fig * 0.04} fill={palette.floor} />
    <rect x={0} y={groundY - fig * 0.04} width={W} height={fig * 0.015} fill={darken(palette.floor, 0.1)} />
  </g>
);

/** A window with sky behind; `variant: "night"` shows a dark pane with stars. */
export const StoryWindow: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.25);
  const cy = part.y !== undefined ? part.y * H : groundY - fig * 0.78;
  const w = s * 0.34;
  const h = s * 0.4;
  const night = part.variant === "night";
  const pane = night ? darken(palette.sky, 0.6) : lighten(palette.sky, 0.1);
  const frame = lighten(palette.shade, 0.3);
  return (
    <g>
      <rect x={cx - w / 2 - s * 0.02} y={cy - h / 2 - s * 0.02} width={w + s * 0.04} height={h + s * 0.04} rx={s * 0.03} fill={frame} />
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={s * 0.02} fill={pane} />
      {night ? <circle cx={cx + w * 0.2} cy={cy - h * 0.2} r={s * 0.03} fill={lighten(palette.accent, 0.5)} /> : <ellipse cx={cx - w * 0.15} cy={cy - h * 0.1} rx={w * 0.22} ry={h * 0.07} fill={lighten(pane, 0.6)} />}
      <rect x={cx - s * 0.008} y={cy - h / 2} width={s * 0.016} height={h} fill={frame} />
      <rect x={cx - w / 2} y={cy - s * 0.008} width={w} height={s * 0.016} fill={frame} />
    </g>
  );
};

export const StoryDoor: PartComponent = ({ part, palette, W, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.85);
  const base = groundY - fig * 0.03;
  const w = s * 0.28;
  const h = s * 0.62;
  return (
    <g>
      <path d={`M${cx - w / 2},${base} V${base - h + w / 2} A${w / 2},${w / 2} 0 0 1 ${cx + w / 2},${base - h + w / 2} V${base} Z`} fill={palette.accent} />
      <circle cx={cx + w * 0.3} cy={base - h * 0.45} r={s * 0.018} fill={lighten(palette.accent, 0.6)} />
    </g>
  );
};

/** A round rug on the floor under the cast. */
export const StoryRug: PartComponent = ({ part, palette, W, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.5);
  return (
    <g>
      <ellipse cx={cx} cy={groundY + fig * 0.02} rx={s * 0.7} ry={s * 0.08} fill={lighten(palette.accent, 0.35)} />
      <ellipse cx={cx} cy={groundY + fig * 0.02} rx={s * 0.5} ry={s * 0.05} fill={lighten(palette.accent, 0.55)} />
    </g>
  );
};

/** A bed; cast on `seatFor` marks sit on it. */
export const StoryBed: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.9;
  const cx = partX(part, W, marks, 0.6);
  const base = partBase(part, H, groundY);
  const top = base - SEAT_HEIGHT["story-bed"] * s;
  const wood = derived(palette).wood;
  const cover = mix(palette.accent, palette.sky, 0.4);
  return (
    <g transform={flipAt(part.flip, cx)}>
      <rect x={cx - w / 2 - s * 0.03} y={top - s * 0.22} width={s * 0.06} height={base - top + s * 0.22} rx={s * 0.03} fill={wood} />
      <rect x={cx - w / 2} y={top} width={w} height={base - top} rx={s * 0.03} fill={darken(wood, 0.08)} />
      <rect x={cx - w / 2} y={top - s * 0.04} width={w} height={s * 0.07} rx={s * 0.035} fill={cover} />
      <ellipse cx={cx - w * 0.33} cy={top - s * 0.06} rx={s * 0.1} ry={s * 0.04} fill={lighten(palette.wallA, 0.7)} />
    </g>
  );
};

export const StoryTable: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.5;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const top = base - s * 0.16;
  const wood = derived(palette).wood;
  return (
    <g>
      <rect x={cx - w * 0.38} y={top} width={s * 0.035} height={base - top} fill={darken(wood, 0.1)} />
      <rect x={cx + w * 0.38 - s * 0.035} y={top} width={s * 0.035} height={base - top} fill={darken(wood, 0.1)} />
      <rect x={cx - w / 2} y={top - s * 0.03} width={w} height={s * 0.04} rx={s * 0.02} fill={wood} />
    </g>
  );
};

/** A wall shelf with a plant and books. */
export const StoryShelf: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const cx = partX(part, W, marks, 0.7);
  const y = part.y !== undefined ? part.y * H : groundY - fig * 0.7;
  const w = s * 0.4;
  const wood = derived(palette).wood;
  return (
    <g>
      <rect x={cx - w / 2} y={y} width={w} height={s * 0.025} rx={s * 0.01} fill={wood} />
      <rect x={cx - w * 0.4} y={y - s * 0.1} width={s * 0.035} height={s * 0.1} fill={palette.accent} />
      <rect x={cx - w * 0.4 + s * 0.04} y={y - s * 0.085} width={s * 0.03} height={s * 0.085} fill={palette.sky} />
      <path d={`M${cx + w * 0.22},${y} l${-s * 0.03},${-s * 0.06} h${s * 0.06} Z`} fill={palette.shade} />
      <circle cx={cx + w * 0.22} cy={y - s * 0.09} r={s * 0.045} fill={palette.detail} />
    </g>
  );
};

/** A round-armed sofa; cast on `seatFor` marks sit on it. */
export const StorySofa: PartComponent = ({ part, palette, W, H, groundY, fig, marks }) => {
  const s = fig * part.size;
  const w = s * 0.8;
  const cx = partX(part, W, marks, 0.5);
  const base = partBase(part, H, groundY);
  const seatTop = base - SEAT_HEIGHT["story-sofa"] * s;
  const cloth = mix(palette.accent, palette.wallB, 0.35);
  const arm = s * 0.07;
  return (
    <g>
      <rect x={cx - w / 2} y={seatTop - s * 0.17} width={w} height={s * 0.2} rx={s * 0.06} fill={darken(cloth, 0.08)} />
      <rect x={cx - w / 2} y={seatTop} width={w} height={base - seatTop - s * 0.01} rx={s * 0.03} fill={cloth} />
      <rect x={cx - w / 2 - arm * 0.6} y={seatTop - s * 0.07} width={arm} height={base - seatTop + s * 0.06} rx={arm / 2} fill={lighten(cloth, 0.08)} />
      <rect x={cx + w / 2 - arm * 0.4} y={seatTop - s * 0.07} width={arm} height={base - seatTop + s * 0.06} rx={arm / 2} fill={lighten(cloth, 0.08)} />
    </g>
  );
};
