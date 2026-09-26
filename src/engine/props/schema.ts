import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "expected a hex color like #1b1b1f");

export const PROP_KINDS = ["phone", "mic", "cup", "laptop", "sign"] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/**
 * A hand prop. Geometry comes from `kind`; the JSON picks colors, size and how it sits in
 * the hand. Props are drawn in the character layer with the character's stroke.
 */
export const PropSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  kind: z.enum(PROP_KINDS),
  /** Multiplier on the kind's default size (which is tied to figure height). */
  size: z.number().min(0.3).max(3).default(1),
  colors: z.object({ body: hex, accent: hex.optional(), screen: hex.optional() }),
  /** "forearm": the prop's up axis follows the forearm; "upright": stays vertical. */
  align: z.enum(["forearm", "upright"]),
  /** Extra rotation in degrees (+ = clockwise in the right-facing view). */
  angle: z.number().default(0),
  /** Sign text. */
  text: z.string().max(24).optional(),
});
export type PropDef = z.infer<typeof PropSchema>;

/** Hold a prop in a hand, put it away (`prop: null`), or drop it (`drop: true`) so it falls. */
export type PropKey = { frame: number; hand: "L" | "R"; prop: string | null; drop?: boolean };
