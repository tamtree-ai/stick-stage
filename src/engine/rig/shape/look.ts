import { fromOklch, shade, toOklch } from "../../lib/color";
import { backTone, colorOf, paleTone, SHAPE_INK, type ShapeColorValue } from "./palette";
import type { Shape, ShapeDetail } from "./schema";

/** Every colour a shape figure draws with, resolved to hex once per frame. */
export type Look = {
  s: Shape;
  main: string;
  head: string;
  body: string;
  limbs: string;
  hands: string;
  feet: string;
  belly?: string;
  ears: string;
  earInner?: string;
  muzzle: string;
  nose?: string;
  cheeks?: string;
  tail: string;
  hair?: string;
  /** Marking colours by kind. */
  marks: Partial<Record<Shape["markings"][number]["kind"], string>>;
  ink: string;
  /** Inside of an open mouth, tongue and teeth: warm, never black. */
  mouth: { inside: string; tongue: string; teeth: string };
  details: Partial<Record<ShapeDetail, string>>;
};

/** Default colours of worn details. */
const DETAIL_DEFAULTS: Record<ShapeDetail, ShapeColorValue> = {
  scarf: "red",
  bow: "berry",
  cap: "blue",
  "bobble-hat": "sunflower",
  glasses: "charcoal",
  badge: "sunflower",
  necktie: "navy",
  crown: "sunflower",
  backpack: "orange",
  flower: "pink",
};

const opt = (c: ShapeColorValue | undefined): string | undefined => (c === undefined ? undefined : colorOf(c));

/** A rosy mouth, leaning a little toward the character's own hue so it belongs to the face. */
const mouthOf = (main: string): Look["mouth"] => {
  const h = toOklch(main);
  const hue = h.c < 0.03 ? 15 : (15 + Math.max(-12, Math.min(12, ((h.h - 15 + 540) % 360) - 180)) * 0.25 + 360) % 360;
  return { inside: fromOklch({ l: 0.47, c: 0.12, h: hue }), tongue: fromOklch({ l: 0.74, c: 0.12, h: hue - 4 }), teeth: colorOf("white") };
};

export const lookOf = (s: Shape): Look => {
  const main = colorOf(s.color);
  const limbs = opt(s.limbs) ?? opt(s.body.color) ?? main;
  const muzzle = opt(s.muzzle.color) ?? (s.muzzle.kind === "beak" ? colorOf("orange") : paleTone(main));
  return {
    s,
    main,
    head: opt(s.head.color) ?? main,
    body: opt(s.body.color) ?? main,
    limbs,
    hands: opt(s.hands) ?? shade(limbs, 0.08),
    feet: opt(s.feet) ?? shade(limbs, 0.14),
    belly: opt(s.belly),
    ears: opt(s.ears.color) ?? opt(s.head.color) ?? main,
    earInner: opt(s.ears.inner),
    muzzle,
    nose: s.muzzle.nose === "none" ? undefined : (opt(s.muzzle.nose) ?? (s.muzzle.kind === "beak" ? undefined : SHAPE_INK)),
    cheeks: opt(s.cheeks),
    tail: opt(s.tail.color) ?? main,
    hair: opt(s.hair?.color),
    marks: Object.fromEntries(s.markings.map((m) => [m.kind, colorOf(m.color)])),
    ink: SHAPE_INK,
    mouth: mouthOf(main),
    details: Object.fromEntries(s.details.map((d) => [d.id, colorOf(d.color ?? DETAIL_DEFAULTS[d.id])])),
  };
};

export { backTone };

/** Props in a shape figure's hands match the flat look: drawn props lose their outline; coded kinds keep a thin one for their details. */
export const propLine = (def: { kind: string }): number => (def.kind === "drawn" ? 0 : 3);
