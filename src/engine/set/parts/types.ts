import type React from "react";
import type { Palette } from "../palettes";
import type { SetPart } from "../schema";

export type PartProps = {
  part: SetPart;
  palette: Palette;
  /** Frame size in px. */
  W: number;
  H: number;
  groundY: number;
  /** Standing figure height in px; furniture scales from this. */
  fig: number;
  /** Unique prefix for pattern/def ids. */
  prefix: string;
  seed: string;
};

export type PartComponent = React.FC<PartProps>;

/** Thin set outline: one tone darker than the fill, never the character stroke. */
export const SET_LINE = 3;
