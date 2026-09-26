import { SEAT_HEIGHT, SEAT_PARTS } from "./parts/seats";
import type { SetDef } from "./schema";

/**
 * Seat-top height (px above the ground) for the cast member standing on `mark`, or
 * `undefined` if no seat part lists that mark in `seatFor`.
 */
export const seatHeightAt = (set: SetDef, mark: string): number | undefined => {
  for (const p of [...set.layers, ...set.foreground]) {
    const kind = SEAT_PARTS[p.part];
    if (kind && p.seatFor.includes(mark)) return SEAT_HEIGHT[kind] * set.figureHeightPx * p.size;
  }
  return undefined;
};
