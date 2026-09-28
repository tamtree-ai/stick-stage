import { z } from "zod";

/**
 * A show the skill reads before it stages an episode. Catchphrases stay out of `bible`
 * until a posted short has said them. This document does not post anything.
 */
export const SeriesSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words separated by single hyphens"),
  title: z.string().min(1).max(80),
  cast: z.array(z.string().min(1)).min(1).max(4),
  homeSets: z.array(z.string().min(1)).min(1).max(8),
  /** How episodes usually open. `teaser` flashes the punchline reaction, then rewinds. */
  coldOpen: z.enum(["pov", "none", "teaser"]).default("none"),
  /** How the show is cut. A skit inherits this unless it names its own `style`. */
  style: z.enum(["classic", "deadpan", "snappy", "chaotic", "sitcom"]).optional(),
  /** Notes for the skill. Not drawn. */
  bible: z.string().max(2000).optional(),
});
export type Series = z.infer<typeof SeriesSchema>;

/** Which episode a skit is, for the post manifest. YouTube can use season and episode. */
export const SeriesRefSchema = z.strictObject({
  id: z.string().min(1),
  season: z.number().int().min(1).max(99),
  episode: z.number().int().min(1).max(999),
});
export type SeriesRef = z.infer<typeof SeriesRefSchema>;
