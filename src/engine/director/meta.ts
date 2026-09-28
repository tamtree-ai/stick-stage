import { z } from "zod";
import { ASPECTS, frameOfMeta } from "../format/aspect";
import { SeriesRefSchema } from "../series/schema";

/** Title, frame and post text. `parseSkit` fills `aspect`, `width` and `height`. */
export const MetaSchema = z
  .strictObject({
    title: z.string().min(1),
    fps: z.number().int().min(12).max(60).default(30),
    /** `9:16` short or `16:9` widescreen. Omitted with no size: a short. Size must match. */
    aspect: z.enum(ASPECTS).optional(),
    /** Pixel size. Omit both and set `aspect`, or set both to 1080×1920 or 1920×1080. */
    width: z.number().int().min(360).optional(),
    height: z.number().int().min(360).optional(),
    /** Post caption (batch render writes it to `<name>.txt`). Default: the title. */
    description: z.string().max(2000).optional(),
    hashtags: z.array(z.string().regex(/^#?[\p{L}\p{N}_]+$/u, "one word, no spaces")).default([]),
    /** Synthetic (TTS) voices: add the AI-voice disclosure line to the post text. */
    syntheticVoices: z.boolean().default(true),
    /** Season and episode for the post manifest. Does not post. */
    series: SeriesRefSchema.optional(),
    /** BCP 47. Tokenizing, timing and the font follow it. Default English. */
    language: z.string().min(2).max(16).optional(),
  })
  .superRefine((meta, ctx) => {
    const frame = frameOfMeta(meta);
    if (!frame.ok) ctx.addIssue({ code: "custom", path: [frame.path], message: frame.message });
  });
