import { z } from "zod";
import { ASPECTS } from "../format/aspect";
import { ScreenTextSchema } from "../lib/screenText";

export const PATTERNS = ["none", "halftone", "stripes", "dots"] as const;

/** Words drawn on one part for this scene. `text` is the chalkboard. `screen` is a desk or TV. */
export const PartLabelSchema = z
  .strictObject({
    part: z.string().min(1),
    text: ScreenTextSchema.optional(),
    screen: ScreenTextSchema.optional(),
  })
  .refine((label) => label.text !== undefined || label.screen !== undefined, { message: "a label needs text or screen" });
export type PartLabel = z.infer<typeof PartLabelSchema>;

export const SetPartSchema = z.object({
  part: z.string(),
  /** Horizontal center, fraction of frame width. */
  x: z.number().min(-0.5).max(1.5).optional(),
  /** Vertical anchor, fraction of frame height (part-specific meaning). */
  y: z.number().min(-0.5).max(1.5).optional(),
  /** Size multiplier relative to the part's default (which is tied to figure height). */
  size: z.number().min(0.2).max(4).default(1),
  seed: z.union([z.string(), z.number()]).optional(),
  pattern: z.enum(PATTERNS).optional(),
  flip: z.boolean().default(false),
  /** Snap x to a named mark (plus `dx`) instead of giving `x`. */
  mark: z.string().optional(),
  /** Horizontal nudge from the mark, fraction of frame width. */
  dx: z.number().min(-1).max(1).default(0),
  /** Part-specific look, e.g. window "blinds", desk "clear". */
  variant: z.string().optional(),
  /** Chalkboard words. Up to three short lines; `\n` breaks. */
  text: ScreenTextSchema.optional(),
  /** Desk or TV screen words. Up to three short lines; `\n` breaks. */
  screen: ScreenTextSchema.optional(),
  /** Marks whose cast member sits on this part (seat parts only: chair, bench, couch). */
  seatFor: z.array(z.string()).default([]),
});
export type SetPart = z.infer<typeof SetPartSchema>;

export const SetSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  /** `9:16` rooms are shorts. `16:9` rooms are laid out for a wide frame. Default short. */
  aspect: z.enum(ASPECTS).default("9:16"),
  kit: z.enum(["plain", "interior", "office", "park", "street", "beach"]),
  /** Catalog text for whoever picks the set (an LLM or a person): what the place is and what it suits. */
  description: z.string().optional(),
  /** Topic keywords this set suits, e.g. "work", "date", "morning"; `GET /sets` lists them. */
  tags: z.array(z.string()).default([]),
  palette: z.string(),
  groundY: z.number().min(0),
  /** Standing figure height in px at this set's scale. */
  figureHeightPx: z.number().min(100).default(760),
  layers: z.array(SetPartSchema),
  foreground: z.array(SetPartSchema).default([]),
  marks: z.record(z.string(), z.number()).default({ left: 0.3, center: 0.5, right: 0.7 }),
});
export type SetDef = z.infer<typeof SetSchema>;
