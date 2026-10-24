import { z } from "zod";
import { luminance, shade } from "../../lib/color";

/**
 * The shape tier's colour box. Values come from two curated, hue-shifted pixel-art palettes,
 * Apollo (AdamCYounis) and Resurrect 64 (Kerrie Lake) on lospec.com, nudged for flat fills: every
 * family is a ramp whose darks lean blue-violet and lights lean warm, so tones picked from it sit
 * together. Characters name a token ("berry", "sky") so a cast made months apart still reads as
 * one show; a raw hex is allowed for a one-off. Keep a character to one family plus one accent.
 */
export const SHAPE_COLORS = {
  red: "#cf573c",
  coral: "#ef7d6a",
  orange: "#e6904e",
  sunflower: "#fbb954",
  lemon: "#f2d67a",
  lime: "#a8ca58",
  grass: "#75a743",
  mint: "#a4dddb",
  teal: "#2f9a8e",
  sky: "#73bed3",
  blue: "#4f8fba",
  navy: "#3c5e8b",
  lilac: "#b49ad8",
  purple: "#7a4f9a",
  berry: "#a23e8c",
  pink: "#df84a5",
  blush: "#f3b8c6",
  peach: "#fdcbb0",
  sand: "#e7d5b3",
  tan: "#c09473",
  brown: "#ad7757",
  chocolate: "#7a4841",
  cream: "#f6ead2",
  white: "#fbf8f2",
  grey: "#a8b5b2",
  slate: "#577277",
  charcoal: "#394a50",
  black: "#202e37",
} as const;

export type ShapeColorToken = keyof typeof SHAPE_COLORS;
export const SHAPE_COLOR_TOKENS = Object.keys(SHAPE_COLORS) as [ShapeColorToken, ...ShapeColorToken[]];

/** Ink for eyes, closed mouths and noses: a deep plum, never black. */
export const SHAPE_INK = "#33243a";

/** A palette token or a hex colour. */
export const ShapeColor = z.union([
  z.enum(SHAPE_COLOR_TOKENS),
  z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'expected a colour token like "sky" or a hex like #7cc6ef'),
]);
export type ShapeColorValue = z.infer<typeof ShapeColor>;

export const colorOf = (c: ShapeColorValue): string => (c in SHAPE_COLORS ? SHAPE_COLORS[c as ShapeColorToken] : c);

/** The back-side tone: back limbs, the far ear. */
export const backTone = (hex: string): string => shade(hex, 0.2);
/** The edge that separates a front limb from a body of the same colour: darker, or lighter on a dark body. */
export const edgeTone = (hex: string): string => (luminance(hex) < 0.06 ? shade(hex, -0.22) : shade(hex, 0.3));
/** The shadow a near limb casts on the body behind it. */
export const castTone = (hex: string): string => shade(hex, luminance(hex) < 0.06 ? 0.38 : 0.24);
/** The pale tone of a muzzle or belly when none is given. */
export const paleTone = (hex: string): string => shade(hex, -0.62);
