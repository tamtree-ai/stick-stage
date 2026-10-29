import { z } from "zod";

/**
 * The "Who's wrong?" meter: a two-sided bar at the top of the frame that tips toward whoever
 * sounds worse as the argument goes, then asks the viewer to vote in the comments.
 * Beats move it with `verdict` (0–100: the share blaming `sides[0]`).
 */
export const VerdictSchema = z.strictObject({
  /** The stamp on frame 0, then the meter's header. */
  question: z.string().min(1).max(28).default("Who's wrong?"),
  /** The two cast ids, left bar first. Default: the first two cast members. */
  sides: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  /** Names on the bar. Default: the cast ids in capitals. */
  names: z.tuple([z.string().min(1).max(12), z.string().min(1).max(12)]).optional(),
  /** Where the meter starts (share blaming the left side). */
  start: z.number().min(0).max(100).default(50),
  /** The comment ask after the punchline. Default: "Comment: A or B?". */
  ask: z.string().min(1).max(40).optional(),
  /** The frame-0 stamp. Later scenes of a multi-scene skit turn it off. */
  intro: z.boolean().default(true),
});
export type Verdict = z.infer<typeof VerdictSchema>;
