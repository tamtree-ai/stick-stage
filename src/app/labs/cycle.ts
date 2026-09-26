import type { ExpressionKey, PoseKey } from "../../engine";

/** Build pose/expression keys that step through `ids` every `every` frames, starting at `offset`. */
export const cycleKeys = <K extends "pose" | "expression">(
  kind: K,
  ids: readonly string[],
  every: number,
  offset: number,
  start = 0,
): K extends "pose" ? PoseKey[] : ExpressionKey[] => {
  const keys = ids.map((_, i) => {
    const id = ids[(i + start) % ids.length]!;
    return kind === "pose" ? { frame: offset + i * every, pose: id } : { frame: offset + i * every, expression: id };
  });
  // The first key always sits at frame 0 so the track is defined from the start.
  keys[0]!.frame = 0;
  return keys as K extends "pose" ? PoseKey[] : ExpressionKey[];
};

export const activeIndex = (frame: number, every: number, offset: number, count: number): number =>
  frame < offset ? 0 : Math.min(count - 1, Math.floor((frame - offset) / every));
