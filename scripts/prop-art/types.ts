/** A drawn prop before it is written to `src/data/props/<category>/<id>.json`. */

export type Part = Record<string, unknown>;

export type Art = {
  id: string;
  category: string;
  name: string;
  rank: number;
  tags: string[];
  aliases: string[];
  align: "upright" | "forearm";
  size?: number;
  colors: { body: string; accent?: string; screen?: string };
  parts: Part[];
};

type Fill = string;

export const R = (x: number, y: number, w: number, h: number, fill: Fill = "body", extra: Part = {}): Part => ({ shape: "rect", x, y, w, h, fill, ...extra });
export const C = (x: number, y: number, r: number, fill: Fill = "body", extra: Part = {}): Part => ({ shape: "circle", x, y, r, fill, ...extra });
export const E = (x: number, y: number, rx: number, ry: number, fill: Fill = "body", extra: Part = {}): Part => ({ shape: "ellipse", x, y, rx, ry, fill, ...extra });
export const P = (points: [number, number][], fill: Fill = "body", extra: Part = {}): Part => ({ shape: "poly", points, fill, ...extra });
export const D = (d: string, fill: Fill = "body", extra: Part = {}): Part => ({ shape: "path", d, fill, ...extra });

export const prop = (
  id: string,
  category: string,
  name: string,
  rank: number,
  tags: string[],
  aliases: string[],
  align: Art["align"],
  body: string,
  accent: string | undefined,
  parts: Part[],
  size = 1,
): Art => ({
  id,
  category,
  name,
  rank,
  tags,
  aliases,
  align,
  ...(size !== 1 ? { size } : {}),
  colors: { body, ...(accent ? { accent } : {}) },
  parts,
});
