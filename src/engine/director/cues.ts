import { z } from "zod";
import { AnchorSchema } from "./anchor";

const at = AnchorSchema.optional();

export const MAX_LIST_ITEMS = 5;
export const TextCueSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("slam"),
    value: z.string().min(1).max(40),
    at,
    durationMs: z.number().min(200).max(5000).default(1100),
  }),
  /** Items stack in the upper-middle band; each pops in on its anchor and stays until the next cut. */
  z
    .strictObject({
      type: z.literal("list"),
      items: z.array(z.string().min(1).max(40)).min(1).max(MAX_LIST_ITEMS),
      /** One anchor per item. */
      at: z.array(AnchorSchema).min(1).max(MAX_LIST_ITEMS),
    })
    .refine((t) => t.items.length === t.at.length, { message: `"at" needs one anchor per item`, path: ["at"] }),
]);
export type TextCue = z.infer<typeof TextCueSchema>;

export const AudioSourceSchema = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("tts") }),
  /**
   * Lip-sync to existing audio (e.g. a trending sound): `src` is relative to the skit folder,
   * trimmed to `startMs`–`endMs`. Consecutive beats cut from one file keep the file's own timing.
   * `words` are optional word start times in the source file's ms (else Whisper, else estimated).
   */
  z.strictObject({
    source: z.literal("file"),
    src: z.string().min(1),
    startMs: z.number().min(0).optional(),
    endMs: z.number().min(0).optional(),
    words: z.array(z.strictObject({ text: z.string().min(1), startMs: z.number().min(0), endMs: z.number().min(0).optional() })).optional(),
  }),
]);

