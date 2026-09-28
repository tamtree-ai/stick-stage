/**
 * Named directing styles. They change the director's numbers, not the shape of a skit.
 * `classic` is today's defaults, so a skit with no style renders as it always has.
 */

import classicJson from "../../data/styles/classic.json";
import deadpanJson from "../../data/styles/deadpan.json";
import snappyJson from "../../data/styles/snappy.json";
import chaoticJson from "../../data/styles/chaotic.json";
import sitcomJson from "../../data/styles/sitcom.json";

export const STYLE_IDS = ["classic", "deadpan", "snappy", "chaotic", "sitcom"] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export type DirectingStyle = {
  id: StyleId;
  reactionMs: number;
  gapMs: number;
  fadeMs: number;
  minPunchGapMs: number;
  closeupBudgetMs: number;
  minCloseupMs: number;
  /** Camera events closer than this (frames) trip the `one-thing` check. */
  oneThingFrames: number;
  /** `punchline`: keep sounds only on the punchline. `actions`: also a swish on poses. */
  sfx: "all" | "punchline" | "actions";
  punchIns: "default" | "more";
  /** `punchline`: face close-ups only for the punchline and its reaction. */
  emotion: "default" | "punchline";
  /** `wide`: stay on `two` or `wide`. A punch-in is the camera event. */
  coverage: "default" | "wide";
  shakes: boolean;
  speedLines: boolean;
  reactors: 1 | 2;
  transition: "fade" | "slide" | "cut";
  /** Sound added on the punchline when the beat has none. */
  punchSfx?: string;
  /** QA length band (seconds) for a skit with no narrator. */
  length: [number, number];
};

const asStyle = (raw: DirectingStyle): DirectingStyle => raw;

/** Shipped styles. The JSON in `src/data/styles/` is the source; classic matches the old constants. */
export const STYLES: Record<StyleId, DirectingStyle> = {
  classic: asStyle(classicJson as DirectingStyle),
  deadpan: asStyle(deadpanJson as DirectingStyle),
  snappy: asStyle(snappyJson as DirectingStyle),
  chaotic: asStyle(chaoticJson as DirectingStyle),
  sitcom: asStyle(sitcomJson as DirectingStyle),
};

export const CLASSIC: DirectingStyle = STYLES.classic;

export const isStyleId = (id: string): id is StyleId => (STYLE_IDS as readonly string[]).includes(id);

export const styleById = (id: string | undefined): DirectingStyle => (id && isStyleId(id) ? STYLES[id] : CLASSIC);
