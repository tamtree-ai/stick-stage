import type { PropKind } from "./schema";

/**
 * Prop outlines in prop-local space: origin = grip point (where the hand is), up = −y,
 * in units of `u`. Used to rest a dropped prop on the floor.
 */
export const PROP_BOUNDS: Record<PropKind, { x0: number; x1: number; y0: number; y1: number }> = {
  phone: { x0: -0.03, x1: 0.03, y0: -0.085, y1: 0.025 },
  mic: { x0: -0.03, x1: 0.03, y0: -0.12, y1: 0.04 },
  cup: { x0: -0.02, x1: 0.1, y0: -0.05, y1: 0.035 },
  laptop: { x0: -0.1, x1: 0.1, y0: -0.13, y1: 0.012 },
  sign: { x0: -0.15, x1: 0.15, y0: -0.49, y1: 0.06 },
};
