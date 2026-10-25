import { clamp } from "./math";

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (r: number, g: number, b: number): string =>
  "#" +
  [r, g, b]
    .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
    .join("");

/** Mix two hex colors; t=0 → a, t=1 → b. */
export const mix = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
};

/** One tone darker/lighter than a fill (for set outlines and shade). */
export const darken = (hex: string, amount = 0.12): string => mix(hex, "#1a1420", amount);
export const lighten = (hex: string, amount = 0.12): string => mix(hex, "#ffffff", amount);

/** WCAG relative luminance of a hex color. */
export const luminance = (hex: string): number => {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parse(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** WCAG contrast ratio (1…21). */
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

// OKLCH (Björn Ottosson's OKLab in polar form): perceptually even lightness, so hue shifts and
// shade steps look the same size on every colour.
export type Oklch = { l: number; c: number; h: number };

const toLin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLin = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export const toOklch = (hex: string): Oklch => {
  const [r, g, b] = parse(hex).map(toLin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
};

const oklchToRgb = ({ l: L, c, h }: Oklch): [number, number, number] => {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

/** OKLCH → hex, pulling chroma in until the colour fits sRGB. */
export const fromOklch = (o: Oklch): string => {
  const l = clamp(o.l, 0, 1);
  let c = Math.max(0, o.c);
  for (let i = 0; i < 24; i++) {
    const rgb = oklchToRgb({ l, c, h: o.h });
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005) || c < 0.001) return toHex(...(rgb.map((v) => fromLin(clamp(v, 0, 1))) as [number, number, number]));
    c *= 0.9;
  }
  return toHex(...(oklchToRgb({ l, c: 0, h: o.h }).map((v) => fromLin(clamp(v, 0, 1))) as [number, number, number]));
};

/** Rotate hue `h` toward `target` by up to `deg` degrees, the short way round. */
const hueToward = (h: number, target: number, deg: number): number => {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
};

/**
 * A painter's shade step: `t > 0` darker, `t < 0` lighter (about -1…1). Shadows drift toward
 * blue-violet and lights toward warm yellow, the hue-shifted ramps of curated palettes such as
 * Apollo and Resurrect 64, so a character's tones read as one family instead of going grey.
 */
export const shade = (hex: string, t: number): string => {
  const o = toOklch(hex);
  // Near-neutrals (white fur, grey) shade toward a cool lilac, not toward flat grey.
  if (t >= 0 && o.c < 0.02) return fromOklch({ l: o.l - t * 0.42 * o.l, c: o.c + t * 0.04, h: 280 });
  if (t >= 0) return fromOklch({ l: o.l - t * 0.42 * o.l, c: o.c * (1 + t * 0.08), h: hueToward(o.h, 285, t * 30) });
  const u = -t;
  return fromOklch({ l: o.l + u * (1 - o.l) * 0.85, c: o.c * (1 - u * 0.55), h: o.c < 0.02 ? o.h : hueToward(o.h, 85, u * 22) });
};

/** Mix in OKLab, so the midpoint of two colours keeps its brightness and doesn't go muddy. */
export const mixOk = (a: string, b: string, t: number): string => {
  const p = toOklch(a);
  const q = toOklch(b);
  const ax = p.c * Math.cos((p.h * Math.PI) / 180) * (1 - t) + q.c * Math.cos((q.h * Math.PI) / 180) * t;
  const ay = p.c * Math.sin((p.h * Math.PI) / 180) * (1 - t) + q.c * Math.sin((q.h * Math.PI) / 180) * t;
  const h = (Math.atan2(ay, ax) * 180) / Math.PI;
  return fromOklch({ l: p.l * (1 - t) + q.l * t, c: Math.hypot(ax, ay), h: h < 0 ? h + 360 : h });
};
