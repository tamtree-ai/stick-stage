/** Seat-top height of each seat part, as a fraction of standing figure height (× part size). */
export const SEAT_HEIGHT = {
  chair: 0.19,
  bench: 0.18,
  couch: 0.17,
} as const;

/** Set part id → seat kind. */
export const SEAT_PARTS: Record<string, keyof typeof SEAT_HEIGHT> = {
  chair: "chair",
  bench: "bench",
  couch: "couch",
};
