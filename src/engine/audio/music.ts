import { z } from "zod";

/**
 * One original bed (`src/data/music.json`). Same license fields as SFX. Not part of the catalog
 * hash. A skit names an id; the renderer ducks it under dialog and silences it on the punchline.
 */
export const MusicManifestSchema = z.object({
  schemaVersion: z.literal(1),
  beds: z.array(
    z.object({
      id: z.string().min(1),
      /** Relative to `public/`. */
      file: z.string().min(1),
      durationMs: z.number().positive(),
      /** Gain in the gaps between lines. */
      gain: z.number().min(0).max(1).default(0.18),
      /** Gain while someone is speaking. The punchline is silent. */
      ducked: z.number().min(0).max(1).default(0.05),
      license: z.string().min(1),
      source: z.string().min(1),
    }),
  ),
});
export type MusicManifest = z.infer<typeof MusicManifestSchema>;
export type MusicBed = { src: string; gain: number; ducked: number };
