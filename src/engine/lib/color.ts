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
