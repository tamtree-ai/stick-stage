/**
 * Real images (NASA, ESA) as credited inserts. Downloaded once into `public/images/` and listed
 * in `src/data/images.json`; nothing is fetched at render time. Only licences on the allow-list
 * load, and every image carries the credit line that is burned in while it is on screen.
 */
import { z } from "zod";

/**
 * `nasa-pd`: NASA media, generally not copyrighted (credit still required; no insignia).
 * `cc-by-4.0`: ESA/Webb, ESA/Hubble. `cc-by-sa-3.0-igo`: many other ESA images.
 * The "ESA Standard Licence" is deliberately absent until someone has read it for a monetised channel.
 */
export const IMAGE_LICENCES = ["nasa-pd", "cc-by-4.0", "cc-by-sa-3.0-igo"] as const;

export const ImageDefSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and -"),
  /** Under `public/` (e.g. `images/pillars-webb.jpg`). */
  file: z
    .string()
    .regex(/^images\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$/, "images/<name>.jpg|png|webp"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Exactly as the source asks, e.g. "NASA, ESA, CSA, STScI". Burned in and written to sources.txt. */
  credit: z.string().min(3).max(120),
  licence: z.enum(IMAGE_LICENCES),
  /** The page the image came from. */
  source: z.string().url(),
  /** ISO date it was downloaded. */
  fetched: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** What is in it, for whoever picks images. */
  description: z.string().min(1).max(300),
  /** A human-made artist's impression, not a photograph: labelled on screen. AI images are never allowed. */
  impression: z.boolean().default(false),
});
export type ImageDef = z.infer<typeof ImageDefSchema>;

export const ImageManifestSchema = z
  .strictObject({ schemaVersion: z.literal(1), images: z.array(ImageDefSchema) })
  .superRefine((m, ctx) => {
    const ids = m.images.map((i) => i.id);
    ids.forEach(
      (id, i) =>
        ids.indexOf(id) !== i &&
        ctx.addIssue({
          code: "custom",
          path: ["images", i, "id"],
          message: `duplicate image id "${id}"`,
        }),
    );
  });
export type ImageManifest = z.infer<typeof ImageManifestSchema>;

/** The burned-in credit line. */
export const creditLine = (img: Pick<ImageDef, "credit" | "impression">): string =>
  `${img.impression ? "Artist's impression · " : ""}Image: ${img.credit}`;
