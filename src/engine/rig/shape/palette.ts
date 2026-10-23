import { z } from "zod";
import { darken, lighten, luminance } from "../../lib/color";

/**
 * The shape tier's colour box: flat, soft, saturated tones that sit together on any shape set.
 * Characters name a token ("berry", "sky") so a cast made months apart still reads as one show;
 * a raw hex is allowed for a one-off.
 */
export const SHAPE_COLORS = {
  red: "#e8453c",
  coral: "#f2735a",
  orange: "#f5913e",
  sunflower: "#f8bf2e",
  lemon: "#f7e15c",
  lime: "#b5d443",
  grass: "#6cbf4f",
  mint: "#8fdcc0",
  teal: "#2fa59a",
  sky: "#7cc6ef",
  blue: "#3f7fd9",
  navy: "#2c3e7a",
  lilac: "#b9a3e8",
  purple: "#7e57c2",
  berry: "#c43f7c",
  pink: "#f59ac0",
  blush: "#f8c4cf",
  peach: "#f9c79e",
  sand: "#e9cf9a",
  tan: "#cf9a62",
  brown: "#9a5e3a",
  chocolate: "#5e3b2a",
  cream: "#fbf1dc",
  white: "#ffffff",
  grey: "#b9bcc4",
  slate: "#6f7787",
  charcoal: "#3b3f4a",
  black: "#1f1d26",
} as const;

export type ShapeColorToken = keyof typeof SHAPE_COLORS;
export const SHAPE_COLOR_TOKENS = Object.keys(SHAPE_COLORS) as [ShapeColorToken, ...ShapeColorToken[]];

/** Ink for eyes, mouths and noses: never pure black. */
export const SHAPE_INK = "#2a2433";

/** A palette token or a hex colour. */
export const ShapeColor = z.union([
  z.enum(SHAPE_COLOR_TOKENS),
  z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'expected a colour token like "sky" or a hex like #7cc6ef'),
]);
export type ShapeColorValue = z.infer<typeof ShapeColor>;

export const colorOf = (c: ShapeColorValue): string => (c in SHAPE_COLORS ? SHAPE_COLORS[c as ShapeColorToken] : c);

/** The back-side tone: back limbs, the far ear. */
export const backTone = (hex: string): string => darken(hex, 0.12);
/** The edge that separates a front limb from a body of the same colour: darker, or lighter on a dark body. */
export const edgeTone = (hex: string): string => (luminance(hex) < 0.06 ? lighten(hex, 0.28) : darken(hex, 0.2));
/** The pale tone of a muzzle or belly when none is given. */
export const paleTone = (hex: string): string => lighten(hex, 0.55);
