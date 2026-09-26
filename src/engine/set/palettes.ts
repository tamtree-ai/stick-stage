export type Palette = {
  wallA: string;
  wallB: string;
  floor: string;
  accent: string;
  shade: string;
  sky: string;
  detail: string;
};

/**
 * Set palettes are soft and low-contrast so the near-black character strokes always win.
 * Set parts use only these tokens (or darken/lighten of them), never raw hex.
 */
export const PALETTES: Record<string, Palette> = {
  lilac: {
    wallA: "#ddd4f0",
    wallB: "#cfc3e9",
    floor: "#b3a2d3",
    accent: "#f3bccb",
    shade: "#c2b3e0",
    sky: "#c4e4f4",
    detail: "#9a88c2",
  },
  mint: {
    wallA: "#d5eee3",
    wallB: "#c4e5d6",
    floor: "#9cc8b3",
    accent: "#f6c894",
    shade: "#b5dac8",
    sky: "#cfe9f6",
    detail: "#76a893",
  },
  peach: {
    wallA: "#f8e0d0",
    wallB: "#f1cfbb",
    floor: "#dcab93",
    accent: "#9cc8dd",
    shade: "#ecc4ae",
    sky: "#d2e9f5",
    detail: "#bf8b74",
  },
};

export const getPalette = (id: string): Palette => {
  const p = PALETTES[id];
  if (!p) throw new Error(`Unknown palette "${id}". Known: ${Object.keys(PALETTES).join(", ")}`);
  return p;
};
