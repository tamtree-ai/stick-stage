import { z } from "zod";

/** A moment inside a beat. Word anchors match the script text, tokenized like the TTS timings. */
export const AnchorSchema = z.union([
  z.strictObject({ word: z.string().min(1), occurrence: z.number().int().min(1).default(1) }),
  z.strictObject({ ms: z.number() }),
  z.strictObject({ fraction: z.number().min(0).max(1) }),
]);
export type Anchor = z.infer<typeof AnchorSchema>;
