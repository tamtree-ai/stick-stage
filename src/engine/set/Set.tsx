import React from "react";
import { getPalette } from "./palettes";
import { Floor, PlainWall, Wall } from "./parts/room";
import { Plant, PictureFrame, Shelf, Window } from "./parts/decor";
import type { PartComponent } from "./parts/types";
import { PatternDefs } from "./patterns";
import type { SetDef, SetPart } from "./schema";

export const PARTS: Record<string, PartComponent> = {
  wall: Wall,
  "plain-wall": PlainWall,
  floor: Floor,
  window: Window,
  shelf: Shelf,
  frame: PictureFrame,
  plant: Plant,
};

export type SetLayersProps = {
  set: SetDef;
  width: number;
  height: number;
  /** "background" draws defs + layers; "foreground" draws parts that overlap characters. */
  layer: "background" | "foreground";
};

const renderPart = (p: SetPart, i: number, props: Omit<React.ComponentProps<PartComponent>, "part" | "seed">, setId: string) => {
  const Part = PARTS[p.part];
  if (!Part) throw new Error(`Unknown set part "${p.part}" in set "${setId}". Known: ${Object.keys(PARTS).join(", ")}`);
  return <Part key={`${p.part}-${i}`} part={p} seed={`${setId}:${p.part}:${p.seed ?? i}`} {...props} />;
};

export const SetLayers: React.FC<SetLayersProps> = ({ set, width, height, layer }) => {
  const palette = getPalette(set.palette);
  const prefix = `set-${set.id}`;
  const common = { palette, W: width, H: height, groundY: set.groundY, fig: set.figureHeightPx, prefix };
  if (layer === "foreground") {
    return <g>{set.foreground.map((p, i) => renderPart(p, i, common, set.id))}</g>;
  }
  return (
    <g>
      <PatternDefs prefix={prefix} palette={palette} width={width} height={height} />
      {set.layers.map((p, i) => renderPart(p, i, common, set.id))}
    </g>
  );
};
