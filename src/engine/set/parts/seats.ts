/** Seat-top height of each seat part, as a fraction of standing figure height (× part size). */
export const SEAT_HEIGHT = {
  chair: 0.19,
  bench: 0.18,
  couch: 0.17,
  bed: 0.2,
  /** Story kit: sized for the shorter shape figures. */
  "story-bench": 0.07,
  "story-bed": 0.08,
  "story-sofa": 0.075,
} as const;

/** Set part id → seat kind. */
export const SEAT_PARTS: Record<string, keyof typeof SEAT_HEIGHT> = {
  chair: "chair",
  bench: "bench",
  couch: "couch",
  bed: "bed",
  "story-bench": "story-bench",
  "story-bed": "story-bed",
  "story-sofa": "story-sofa",
};
