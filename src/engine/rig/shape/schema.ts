import { z } from "zod";
import { ShapeColor } from "./palette";

/**
 * The shape drawing tier: flat, outline-free characters built from simple shapes (circles,
 * beans, rounded triangles). Read only when `style.build` is "shape". A character is a spec,
 * not a drawing: a body plan, a build preset and a handful of part kinds, each drawn in code
 * (`rig/shape/`). Sizes are multipliers on the build preset, so they stay in proportion.
 */
const mult = (lo: number, hi: number) => z.number().min(lo).max(hi);

/** Skeletons. Only the biped ships today; the others are planned body plans. */
export const SHAPE_PLANS = ["biped"] as const;
/** Body proportion presets (`shape/proportions.ts`). */
export const SHAPE_BUILDS = ["kid", "adult", "tall", "tiny", "round"] as const;
export const HEAD_KINDS = ["circle", "oval", "wide", "pear"] as const;
export const BODY_KINDS = ["bean", "pear", "egg", "block", "barrel"] as const;
export const EAR_KINDS = ["none", "round", "long", "floppy", "pointed", "small", "antennae"] as const;
export const MUZZLE_KINDS = ["none", "oval", "snout", "beak"] as const;
export const EYE_KINDS = ["dot", "oval", "wide"] as const;
export const TAIL_KINDS = ["none", "puff", "long", "curl", "stub", "fluffy"] as const;
export const HAIR_KINDS = ["none", "tuft", "bob", "bun", "spikes", "curls", "pigtails"] as const;
export const MARKING_KINDS = ["eye-patch", "spots", "stripes"] as const;
export const SHAPE_DETAILS = ["scarf", "bow", "cap", "bobble-hat", "glasses", "badge", "necktie", "crown", "backpack", "flower"] as const;

export type ShapeDetail = (typeof SHAPE_DETAILS)[number];

export const ShapeSchema = z.object({
  plan: z.enum(SHAPE_PLANS).default("biped"),
  /** What it is, for the writer and the cast bible ("rabbit", "robot"). Not drawn. */
  species: z.string().max(40).optional(),
  build: z.enum(SHAPE_BUILDS).default("kid"),
  /** Overall size × the build's height. */
  size: mult(0.6, 1.4).default(1),
  /** The main colour: body, head, limbs and ears unless a part says otherwise. */
  color: ShapeColor,
  head: z
    .object({ kind: z.enum(HEAD_KINDS).default("circle"), size: mult(0.8, 1.3).default(1), color: ShapeColor.optional() })
    .default({ kind: "circle", size: 1 }),
  body: z
    .object({ kind: z.enum(BODY_KINDS).default("bean"), width: mult(0.7, 1.4).default(1), color: ShapeColor.optional() })
    .default({ kind: "bean", width: 1 }),
  /** Arms and legs; missing means the body colour. */
  limbs: ShapeColor.optional(),
  /** Hands and feet (mittens, socks, hooves); missing means a little darker than the limbs. */
  hands: ShapeColor.optional(),
  feet: ShapeColor.optional(),
  /** A pale tummy patch. */
  belly: ShapeColor.optional(),
  ears: z
    .object({ kind: z.enum(EAR_KINDS).default("none"), size: mult(0.5, 1.8).default(1), color: ShapeColor.optional(), inner: ShapeColor.optional() })
    .default({ kind: "none", size: 1 }),
  muzzle: z
    .object({
      kind: z.enum(MUZZLE_KINDS).default("none"),
      color: ShapeColor.optional(),
      /** The nose on a muzzle or snout; "none" leaves it off. */
      nose: z.union([ShapeColor, z.literal("none")]).optional(),
    })
    .default({ kind: "none" }),
  eyes: z
    .object({ kind: z.enum(EYE_KINDS).default("dot"), size: mult(0.7, 1.5).default(1), spacing: mult(0.7, 1.4).default(1) })
    .default({ kind: "dot", size: 1, spacing: 1 }),
  /** Small brows help acting; the look leaves them off by default. */
  brows: z.boolean().default(false),
  cheeks: ShapeColor.optional(),
  tail: z
    .object({ kind: z.enum(TAIL_KINDS).default("none"), size: mult(0.5, 1.8).default(1), color: ShapeColor.optional() })
    .default({ kind: "none", size: 1 }),
  hair: z.object({ kind: z.enum(HAIR_KINDS), color: ShapeColor }).optional(),
  markings: z.array(z.object({ kind: z.enum(MARKING_KINDS), color: ShapeColor })).max(3).default([]),
  /** Clothes and props worn. `color` overrides each one's default. */
  details: z.array(z.object({ id: z.enum(SHAPE_DETAILS), color: ShapeColor.optional() })).max(4).default([]),
});

export type Shape = z.infer<typeof ShapeSchema>;
