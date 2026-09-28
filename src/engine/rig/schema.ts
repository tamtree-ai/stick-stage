import { z } from "zod";
import { ASPECTS } from "../format/aspect";

const hex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "expected a hex color like #1b1b1f");
const frac = (lo: number, hi: number) => z.number().min(lo).max(hi);

export const ProportionsSchema = z.object({
  height: frac(0.5, 1.5).default(1),
  headRadius: frac(0.08, 0.25),
  neck: frac(0, 0.1).default(0.02),
  torso: frac(0.1, 0.5),
  upperArm: frac(0.05, 0.3),
  forearm: frac(0.05, 0.3),
  thigh: frac(0.05, 0.35),
  shin: frac(0.05, 0.35),
});

export const TorsoStyleSchema = z.discriminatedUnion("style", [
  z.object({ style: z.literal("line") }),
  z.object({
    style: z.literal("bean"),
    fill: hex,
    /** Bean width as a fraction of figure height. */
    width: frac(0.04, 0.3).default(0.13),
  }),
]);

export const AccessorySchema = z.object({
  slot: z.enum(["hair", "eyewear", "headwear", "neck", "body"]),
  id: z.string(),
  color: hex.optional(),
});

export const CharacterSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  displayName: z.string().optional(),
  /**
   * Which frame this face is drawn for. Catalog characters set it (missing means a short,
   * stamped when the library loads). A workspace character may omit it and follow the skit.
   */
  aspect: z.enum(ASPECTS).optional(),
  proportions: ProportionsSchema,
  style: z.object({
    stroke: hex,
    strokeWidth: z.number().min(2).max(30),
    headFill: hex,
    torso: TorsoStyleSchema,
    /** Rubber-hose bow of limbs, 0 = straight segments. */
    limbCurve: frac(0, 1),
    hands: z.enum(["nub"]),
    feet: z.enum(["oval"]),
    footFill: hex,
    cheek: hex.optional(),
  }),
  face: z.object({
    eyes: z.enum(["big-pupil", "dot"]),
    brows: z.boolean(),
    mouthSet: z.string().default("default"),
    /** Horizontal face shift toward facing direction, fraction of head radius (3/4 view). */
    offsetX: frac(-0.5, 0.5).default(0.14),
    eyeSpacing: frac(0.2, 0.8).default(0.44),
    eyeY: frac(-0.5, 0.5).default(-0.06),
    mouthY: frac(0, 0.8).default(0.42),
  }),
  accessories: z.array(AccessorySchema).default([]),
  /** How much speech motion this character does. 1 is Dash, near 0 is Moss. Default 0.55. */
  energy: z.number().min(0).max(1).optional(),
  /** One line the writer reads the way it reads cast notes. Not drawn. */
  personality: z.string().max(160).optional(),
  /**
   * Voice hints. TTS runs in the tamtree harness, which reads `provider` / `voiceId` / `settings`;
   * `say` is the macOS voice `pnpm voice:say` uses for local dev.
   */
  voice: z
    .object({
      provider: z.string().optional(),
      voiceId: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).default({}),
      say: z.string().optional(),
    })
    .optional(),
});

export type Character = z.infer<typeof CharacterSchema>;
export type Accessory = z.infer<typeof AccessorySchema>;

const limbBend = z.object({
  armL: z.number().optional(),
  armR: z.number().optional(),
  legL: z.number().optional(),
  legR: z.number().optional(),
});

/**
 * Joint angles in degrees. Canonical view faces right; L = back (screen-left) limb,
 * R = front limb. Arms: 0 = hanging along the torso, +90 = forward, 180 = up;
 * elbow + bends the forearm forward. Legs are world-relative: 0 = straight down,
 * + = forward; knee + bends the shin back. torso + leans forward; head + tilts forward.
 */
export const PoseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  torso: z.number().default(0),
  head: z.number().default(0),
  shoulderL: z.number(),
  elbowL: z.number(),
  shoulderR: z.number(),
  elbowR: z.number(),
  hipL: z.number().default(-5),
  kneeL: z.number().default(0),
  hipR: z.number().default(5),
  kneeR: z.number().default(0),
  bend: limbBend.default({}),
  /** Big gestures get a short opposite dip before the move. */
  anticipation: z.boolean().default(false),
});

export type Pose = z.infer<typeof PoseSchema>;

/** The numeric pose channels that blend between poses. */
export const POSE_ANGLES = [
  "torso",
  "head",
  "shoulderL",
  "elbowL",
  "shoulderR",
  "elbowR",
  "hipL",
  "kneeL",
  "hipR",
  "kneeR",
] as const;
export type PoseAngle = (typeof POSE_ANGLES)[number];
export type PoseAngles = Record<PoseAngle, number> & { bend: z.infer<typeof limbBend> };
