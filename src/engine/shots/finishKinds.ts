/**
 * How the stage is finished (`shots/finish.tsx` draws them). "flat" is the house look every
 * channel has used so far; "illustrated" is opt-in per skit (`finish`).
 */
export const FINISHES = ["flat", "illustrated"] as const;
export type Finish = (typeof FINISHES)[number];
