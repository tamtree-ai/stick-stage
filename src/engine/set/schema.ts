import { z } from "zod";

export const PATTERNS = ["none", "halftone", "stripes", "dots"] as const;

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
  /** Marks whose cast member sits on this part (seat parts only: chair, bench, couch). */
  seatFor: z.array(z.string()).default([]),
});
export type SetPart = z.infer<typeof SetPartSchema>;

export const SetSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  kit: z.enum(["plain", "interior", "office", "park", "street"]),
  palette: z.string(),
  groundY: z.number().min(0),
  /** Standing figure height in px at this set's scale. */
  figureHeightPx: z.number().min(100).default(760),
  layers: z.array(SetPartSchema),
  foreground: z.array(SetPartSchema).default([]),
  marks: z.record(z.string(), z.number()).default({ left: 0.3, center: 0.5, right: 0.7 }),
});
export type SetDef = z.infer<typeof SetSchema>;
