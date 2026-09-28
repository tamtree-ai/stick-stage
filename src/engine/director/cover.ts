import type { SeriesRef } from "../series/schema";
import { reactionPoint } from "./hooks";
import type { Program } from "./timeline";

/** The cover the compiler frames: the punchline reaction, the title, and an optional episode badge. */
export const coverOf = (program: Program, series?: SeriesRef): NonNullable<Program["cover"]> => {
  const point = reactionPoint(program) ?? { scene: 0, frame: Math.min(4, Math.max(0, program.durationInFrames - 1)) };
  const badge = series ? `S${series.season} · E${series.episode}` : undefined;
  return { scene: point.scene, frame: point.frame, title: program.title, ...(badge ? { badge } : {}) };
};
