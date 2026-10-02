/**
 * Figures: the diagram layer. A scene lists figures next to its cast; beats change them with
 * cues (`beat.figures`), timed by the same anchors as actions. Params are checked per kind in
 * `params.ts` once states and cues are merged.
 */
import { z } from "zod";
import { FIGURE_KINDS } from "./params";

const frac = z.number().min(-0.5).max(1.5);
const params = z.record(z.string(), z.unknown());

/** Where a figure sits on the stage: centre and size as fractions of the frame. */
export const FigureRectSchema = z.strictObject({
  x: frac.default(0.5),
  y: frac.default(0.32),
  w: z.number().min(0.02).max(2).default(0.8),
  h: z.number().min(0.02).max(2).default(0.3),
});
export type FigureRect = z.infer<typeof FigureRectSchema>;

export const REVEALS = ["draw", "fade", "pop", "none"] as const;
export type Reveal = (typeof REVEALS)[number];

export const FigureSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "letters, digits, - and _ only"),
  kind: z.enum(FIGURE_KINDS as [string, ...string[]]),
  at: FigureRectSchema.default({ x: 0.5, y: 0.32, w: 0.8, h: 0.3 }),
  /** `back`: behind the cast (default). `front`: over them. */
  layer: z.enum(["back", "front"]).default("back"),
  params: params.default({}),
  /** Named parameter sets (`myth`, `truth`), merged over `params`. A `state` cue switches. */
  states: z.record(z.string().min(1), params).optional(),
  /** The state it starts in. */
  state: z.string().min(1).optional(),
  /** `true`: off until a `show` cue. Default: on from the scene start. */
  hidden: z.boolean().default(false),
  reveal: z.enum(REVEALS).default("draw"),
  /** Caption under the figure. States may override it with a `label` key. */
  label: z.string().min(1).max(48).optional(),
  /** A soft card behind the figure, so it reads over a busy set. */
  panel: z.boolean().default(false),
  /** Corner tag: "not to scale", "cartoon model". */
  tag: z.string().min(1).max(24).optional(),
});
export type Figure = z.infer<typeof FigureSchema>;
export type FigureInput = z.input<typeof FigureSchema>;

const at = z
  .union([
    z.strictObject({ word: z.string().min(1), occurrence: z.number().int().min(1).default(1) }),
    z.strictObject({ ms: z.number() }),
    z.strictObject({ fraction: z.number().min(0).max(1) }),
  ])
  .optional();
const id = z.string().min(1);
const ms = z.number().min(0).max(20000).optional();
/** The cast member whose hand drives the change (a die rolled, a ball let go): they gesture on the cue. */
const by = z.string().min(1).optional();

export const FigureCueSchema = z.discriminatedUnion("do", [
  z.strictObject({
    do: z.literal("show"),
    id,
    at,
    style: z.enum(REVEALS).optional(),
    durationMs: ms,
  }),
  z.strictObject({ do: z.literal("hide"), id, at, durationMs: ms }),
  /**
   * Switch to a named state. `morph` tweens the numbers; `strike` leaves the old one faded and
   * crossed out in red, then draws the new one; `cut` swaps at once.
   */
  z.strictObject({
    do: z.literal("state"),
    id,
    at,
    state: z.string().min(1),
    style: z.enum(["morph", "strike", "cut"]).default("morph"),
    durationMs: ms,
    by,
  }),
  /** Tween some params (a graph drawing on, a pointer moving, 1000 dice rolling). */
  z.strictObject({ do: z.literal("set"), id, at, params, durationMs: ms, by }),
]);
export type FigureCue = z.infer<typeof FigureCueSchema>;
