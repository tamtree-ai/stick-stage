import { z } from "zod";

/**
 * The toon drawing tier: skin-coloured limbs, clothes, hands, ears, nose and eyes with whites
 * and lids. Read only when `style.build` is "toon". Sizes are in toon units: 1 unit is 1 px on
 * a 610 px figure (the scale the designs were drawn at), so they grow with the figure.
 */
const hex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "expected a hex color like #1b1b1f");
const frac = (lo: number, hi: number) => z.number().min(lo).max(hi);

/** A garment colour. `shade` is the cel-shade tone on the back side; missing means a darker `fill`. */
const Cloth = z.object({ fill: hex, shade: hex.optional() });

/** Toon hand shapes. `hold` is a fist closed around a held prop. */
export const HAND_SHAPES = ["open", "fist", "point", "thumb", "wave", "palmup", "hold"] as const;
export type HandShape = (typeof HAND_SHAPES)[number];

export const TOON_DETAILS = [
  "pocket-pens",
  "planet-pin",
  "star-patch",
  "headphones",
  "star-earring",
  "freckles",
] as const;

export const ToonSchema = z.object({
  /** Body proportions for this build (the stick build keeps the top-level `proportions`). */
  proportions: z
    .object({
      height: frac(0.5, 1.5),
      headRadius: frac(0.08, 0.25),
      neck: frac(0, 0.1),
      torso: frac(0.1, 0.5),
      upperArm: frac(0.05, 0.3),
      forearm: frac(0.05, 0.3),
      thigh: frac(0.05, 0.35),
      shin: frac(0.05, 0.35),
    })
    .optional(),
  /** Outline width in toon units. */
  outline: frac(2, 14).default(6),
  /** Line colour for every outline; dark sets add a light rim around the whole figure instead. */
  ink: hex.default("#1d1b2b"),
  skin: hex,
  skinShade: hex.optional(),
  /** Torso widths in toon units. `waist` narrows a fitted top; a straight top ignores it. */
  body: z.object({
    shoulders: frac(40, 160),
    waist: frac(30, 140).optional(),
    hips: frac(40, 160),
    /** Skin tube widths of the arms and the neck. */
    arm: frac(14, 40).default(25),
    neck: frac(14, 40).default(22),
  }),
  head: z
    .object({
      /** < 1 narrows the jaw. */
      jaw: frac(0.8, 1.1).default(1),
    })
    .default({ jaw: 1 }),
  eyes: z.object({ iris: hex, lashes: z.boolean().default(false) }),
  brows: z.object({
    color: hex,
    /** Line width in toon units. */
    thickness: frac(3, 12).default(7),
    /** Brow height above the eye centre, × head radius. Clears a fringe. */
    gap: frac(0.25, 0.7).default(0.42),
  }),
  lip: hex,
  nose: z.enum(["hook", "button", "none"]).default("hook"),
  ears: z.boolean().default(true),
  cheeks: z.object({ color: hex, opacity: frac(0, 1) }).default({ color: "#e8737a", opacity: 0.22 }),
  nails: hex.optional(),
  hair: z.object({
    kind: z.enum(["long-streak", "curly-mop"]),
    fill: hex,
    shade: hex.optional(),
    /** A contrasting lock (long-streak). */
    streak: hex.optional(),
  }),
  glasses: z.object({ kind: z.enum(["cat-eye"]), fill: hex }).optional(),
  top: Cloth.extend({
    kind: z.enum(["turtleneck", "tee"]),
    belt: hex.optional(),
    /** A ringed-planet print on the chest. */
    print: hex.optional(),
  }),
  outer: Cloth.extend({
    kind: z.enum(["labcoat", "varsity"]),
    /** Sleeve colour when it differs from the body (varsity). */
    sleeve: Cloth.optional(),
    /** Ribbed cuffs, hem and collar (varsity), and the stripe through them. */
    rib: hex.optional(),
    ribStripe: hex.optional(),
    /** Where the sleeve ends along the forearm, 0 = elbow, 1 = wrist. */
    cuffAt: frac(0, 1).default(0.7),
  }).optional(),
  bottom: Cloth.extend({
    kind: z.enum(["skirt", "jeans"]),
    /** Tights under a skirt. */
    legs: hex.optional(),
    /** Turned-up hem of jeans. */
    cuff: hex.optional(),
  }),
  shoes: Cloth.extend({
    kind: z.enum(["boot", "sneaker"]),
    accent: hex.optional(),
    lace: hex.optional(),
    sole: hex.optional(),
  }),
  /** Small drawn details. `color` overrides each one's default from the palette above. */
  details: z.array(z.object({ id: z.enum(TOON_DETAILS), color: hex.optional() })).default([]),
  /** Gold for pins, earrings and buckles. */
  accent: hex.default("#f6c445"),
});

export type Toon = z.infer<typeof ToonSchema>;
export type ToonDetail = (typeof TOON_DETAILS)[number];
