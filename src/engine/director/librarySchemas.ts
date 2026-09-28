import { z } from "zod";

/** Listener reaction defaults (`src/data/reactions.json`): speaker expression → listener expression. */
export const ReactionTableSchema = z.object({
  schemaVersion: z.literal(1),
  /** Listener's expression on the speaker's last word, for ordinary lines. */
  listen: z.record(z.string(), z.string()),
  defaultListen: z.string(),
  /** Listener's expression in the reaction close-up after the punchline. */
  punchline: z.record(z.string(), z.string()),
  defaultPunchline: z.string(),
});
export type ReactionTable = z.infer<typeof ReactionTableSchema>;

/** SFX library manifest (`src/data/sfx.json`). Every file records its license. */
export const SfxManifestSchema = z.object({
  schemaVersion: z.literal(1),
  sounds: z.array(
    z.object({
      id: z.string(),
      /** Relative to `public/`. */
      file: z.string(),
      durationMs: z.number().positive(),
      /** Playback gain so stings sit under dialog. */
      gain: z.number().min(0).max(2).default(0.8),
      license: z.string().min(1),
      source: z.string().min(1),
      tags: z.array(z.string()).default([]),
    }),
  ),
});
export type SfxManifest = z.infer<typeof SfxManifestSchema>;
