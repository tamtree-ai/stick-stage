import { z } from "zod";
import { pathError } from "./path";
import { ScreenTextSchema } from "../lib/screenText";

const hex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "expected a hex color like #1b1b1f");

/** Coded kinds keep a React component. New props are `drawn`. */
export const PROP_KINDS = ["phone", "mic", "cup", "laptop", "sign"] as const;
export type CodedKind = (typeof PROP_KINDS)[number];
export type PropKind = CodedKind | "drawn";

const unit = z.number().gte(-0.6).lte(0.6);
const FILL = z.string().refine(
  (s) => s === "none" || /^#[0-9a-fA-F]{3,8}$/.test(s) || /^(body|accent|screen)(-(dark|light))?$/.test(s),
  "fill is a color slot (body, accent, screen, body-dark, accent-light), none, or a hex",
);

const partCommon = {
  fill: FILL.default("body"),
  /** `false` skips the character stroke (inner detail). */
  stroke: z.boolean().optional(),
  angle: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
};

const within = (label: string, v: number, ctx: z.RefinementCtx, path: string) => {
  if (v < -0.6 || v > 0.6) ctx.addIssue({ code: "custom", path: [path], message: `${label} ${v} is outside ±0.6` });
};

const RectPart = z
  .object({ shape: z.literal("rect"), x: unit, y: unit, w: z.number().positive().max(1.2), h: z.number().positive().max(1.2), rx: z.number().min(0).max(0.6).optional(), ...partCommon })
  .superRefine((p, ctx) => {
    within("x + w", p.x + p.w, ctx, "w");
    within("y + h", p.y + p.h, ctx, "h");
  });

const CirclePart = z
  .object({ shape: z.literal("circle"), x: unit, y: unit, r: z.number().positive().max(0.6), ...partCommon })
  .superRefine((p, ctx) => {
    within("x - r", p.x - p.r, ctx, "r");
    within("x + r", p.x + p.r, ctx, "r");
    within("y - r", p.y - p.r, ctx, "r");
    within("y + r", p.y + p.r, ctx, "r");
  });

const EllipsePart = z
  .object({ shape: z.literal("ellipse"), x: unit, y: unit, rx: z.number().positive().max(0.6), ry: z.number().positive().max(0.6), ...partCommon })
  .superRefine((p, ctx) => {
    within("x - rx", p.x - p.rx, ctx, "rx");
    within("x + rx", p.x + p.rx, ctx, "rx");
    within("y - ry", p.y - p.ry, ctx, "ry");
    within("y + ry", p.y + p.ry, ctx, "ry");
  });

const PolyPart = z.object({
  shape: z.literal("poly"),
  points: z.array(z.tuple([unit, unit])).min(3).max(32),
  ...partCommon,
});

const LinePart = z.object({
  shape: z.literal("line"),
  x1: unit,
  y1: unit,
  x2: unit,
  y2: unit,
  ...partCommon,
});

const PathPart = z
  .object({ shape: z.literal("path"), d: z.string().min(1), ...partCommon })
  .superRefine((p, ctx) => {
    const err = pathError(p.d);
    if (err) ctx.addIssue({ code: "custom", path: ["d"], message: err });
  });

export const DrawnPartSchema = z.discriminatedUnion("shape", [RectPart, CirclePart, EllipsePart, PolyPart, LinePart, PathPart]);
export type DrawnPart = z.infer<typeof DrawnPartSchema>;

const meta = {
  /** Picker label. Falls back to the id. */
  name: z.string().min(1).optional(),
  /** Prompt group and picker tab (`food`, `drinks`, …). */
  category: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
  /** Other names for the writer and the picker. Shared aliases are allowed; ids are not. */
  aliases: z.array(z.string().min(1)).default([]),
  /** Lower comes first in the prompt and the picker. */
  rank: z.number().int().nonnegative().default(1000),
};

const shared = {
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  /** Multiplier on the kind's default size (which is tied to figure height). */
  size: z.number().min(0.3).max(3).default(1),
  colors: z.object({ body: hex, accent: hex.optional(), screen: hex.optional() }),
  /** "forearm": the prop's up axis follows the forearm; "upright": stays vertical. */
  align: z.enum(["forearm", "upright"]),
  /** Extra rotation in degrees (+ = clockwise in the right-facing view). */
  angle: z.number().default(0),
  /** Sign text. A hold can override it for one use. */
  text: z.string().max(24).optional(),
  /** Laptop screen words. A hold can override them for one use. */
  screen: ScreenTextSchema.optional(),
  ...meta,
};

export const CodedPropSchema = z.object({ ...shared, kind: z.enum(PROP_KINDS) });

export const DrawnPropSchema = z
  .object({ ...shared, kind: z.literal("drawn"), parts: z.array(DrawnPartSchema).min(1).max(24) })
  .superRefine((p, ctx) => {
    if (p.parts.length > 24) ctx.addIssue({ code: "custom", path: ["parts"], message: "a drawn prop has at most 24 parts" });
  });

/**
 * A hand prop. Coded kinds draw from a component; `drawn` props store their geometry in `parts`.
 * Props are drawn in the character layer with the character's stroke.
 */
export const PropSchema = z.union([CodedPropSchema, DrawnPropSchema]);
export type PropDef = z.infer<typeof PropSchema>;
export type DrawnProp = z.infer<typeof DrawnPropSchema>;

/** Hold a prop in a hand, put it away (`prop: null`), or drop it (`drop: true`) so it falls. */
export type PropKey = { frame: number; hand: "L" | "R"; prop: string | null; drop?: boolean; text?: string; screen?: string };

export const isDrawn = (def: PropDef): def is DrawnProp => def.kind === "drawn";
