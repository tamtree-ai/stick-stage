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
