import React from "react";
import { f2 } from "../lib/math";
import { Drawn, PROP_DRAW } from "./draw";
import type { PropDef } from "./schema";
import { isDrawn } from "./schema";
import { propUnit } from "./track";

export type PropViewProps = {
  def: PropDef;
  x: number;
  y: number;
  angle: number;
  scale?: number;
  figurePx: number;
  stroke: string;
  sw: number;
  mirrored: boolean;
  fontFamily: string;
};

/** One prop placed at its grip point in figure space. */
export const PropView: React.FC<PropViewProps> = ({ def, x, y, angle, scale = 1, figurePx, stroke, sw, mirrored, fontFamily }) => {
  const Draw = isDrawn(def) ? Drawn : PROP_DRAW[def.kind];
  return (
    <g transform={`translate(${f2(x)} ${f2(y)}) rotate(${f2(angle)}) scale(${f2(scale)})`}>
      <Draw def={def} u={propUnit(def, figurePx)} stroke={stroke} sw={sw * 0.75} mirrored={mirrored} fontFamily={fontFamily} />
    </g>
  );
};
