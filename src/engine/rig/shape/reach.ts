import type { Shape } from "./schema";

/**
 * How far above the head centre a shape figure reaches, in head radii: tall ears, a crown or a
 * hat. The camera keeps it in a group shot (`shots/framing.ts`). Matches the drawings in `head.tsx`
 * and `details.tsx`.
 */
export const headTop = (s: Shape): number => {
  const k = s.ears.size;
  const ears = { none: 1, round: 0.88 + 0.34 * k, small: 0.88 + 0.2 * k, long: 0.68 + 1.57 * 0.72 * k + 0.2, floppy: 1, pointed: 0.76 + 0.6 * k, antennae: 0.78 + 0.55 * k + 0.12 }[s.ears.kind];
  const hair = { none: 1, tuft: 1.32, bob: 1.14, bun: 1.42, spikes: 1.35, curls: 1.31, pigtails: 1.32 }[s.hair?.kind ?? "none"];
  const worn = Math.max(1, ...s.details.map((d) => ({ crown: 1.4, "bobble-hat": 1.3, cap: 1.15, bow: 1.12, flower: 1.0 })[d.id as string] ?? 1));
  return Math.max(ears, hair, worn) * (s.head.kind === "oval" ? 1.08 : 1);
};
