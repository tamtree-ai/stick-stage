import { z } from "zod";

/** Dubbed words for one language. Staging stays; timing follows the new voice. */
export const I18nPackSchema = z.strictObject({
  lines: z.record(z.string(), z.string().min(1)),
  slams: z.record(z.string(), z.string().min(1).max(40)).optional(),
  pov: z.string().max(80).optional(),
  cards: z.record(z.string(), z.string().min(1).max(60)).optional(),
  /** Set-part labels, keyed by part id. */
  labels: z.record(z.string(), z.string().min(1).max(80)).optional(),
});

export const I18nSchema = z.record(z.string().min(2).max(16), I18nPackSchema);
