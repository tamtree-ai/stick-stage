import { z } from "zod";
import { MouthParamsSchema } from "./mouths";

export const EYE_SHAPES = [
  "base",
  "big",
  "dot",
  "closed-happy",
  "closed",
  "squint",
  "shock",
  "teary",
] as const;
export type EyeShape = (typeof EYE_SHAPES)[number];

export const SYMBOLS = ["tears", "sweat", "blush", "anger", "exclaim", "question", "speed-lines"] as const;
export type SymbolId = (typeof SYMBOLS)[number];

const Brow = z.object({
  /** −1 lowered … +1 raised. */
  raise: z.number().min(-1.5).max(1.5).default(0),
  /** Degrees; + lifts the inner end (worried), − drops it (angry). */
  tilt: z.number().min(-45).max(45).default(0),
});

export const ExpressionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  eyes: z
    .object({
      shape: z.enum(EYE_SHAPES).default("base"),
      /** Upper lid closure 0..1. */
      lid: z.number().min(0).max(1).default(0),
      /** Lower lid rise 0..1 (smug, happy squint). */
      lower: z.number().min(0).max(1).default(0),
      /** Degrees; + slants lids down toward the nose (angry). */
      lidTilt: z.number().min(-40).max(40).default(0),
      pupil: z.number().min(0.3).max(1.6).default(1),
      gaze: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
    })
    .default({ shape: "base", lid: 0, lower: 0, lidTilt: 0, pupil: 1, gaze: { x: 0, y: 0 } }),
  brows: Brow.extend({ left: Brow.optional(), right: Brow.optional() }).default({
    raise: 0,
    tilt: 0,
  }),
  mouth: z.union([
    z.literal("speech"),
    z.string(),
    MouthParamsSchema.partial().extend({ preset: z.string() }),
  ]),
  symbols: z.array(z.enum(SYMBOLS)).default([]),
  /**
   * Direction hint: strong emotions read best on a face close-up. The director cuts to this
   * framing on the character when the expression lands on a reaction/punchline beat.
   */
  closeup: z.enum(["close", "extreme"]).optional(),
});

export type Expression = z.infer<typeof ExpressionSchema>;
