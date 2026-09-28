import { z } from "zod";

/** Fractions of frame size kept free of faces, subtitles and slam text (platform UI overlays). */
export const SafeAreaSchema = z.object({
  schemaVersion: z.literal(1),
  top: z.number().min(0).max(0.5),
  bottom: z.number().min(0).max(0.5),
  left: z.number().min(0).max(0.5),
  right: z.number().min(0).max(0.5),
});
export type SafeArea = z.infer<typeof SafeAreaSchema>;

/**
 * Margins for a 16:9 frame. The shorts profile reserves a TikTok rail and a tall
 * bottom drawer; a widescreen video does not, and still leaves a caption band.
 */
export const WIDE_SAFE_AREA: SafeArea = { schemaVersion: 1, top: 0.08, bottom: 0.16, left: 0.05, right: 0.05 };

export type Rect = { x: number; y: number; w: number; h: number };

export const safeRect = (sa: SafeArea, width: number, height: number): Rect => ({
  x: sa.left * width,
  y: sa.top * height,
  w: (1 - sa.left - sa.right) * width,
  h: (1 - sa.top - sa.bottom) * height,
});

/** Measured platform overlays (`src/data/safe-area-profiles.json`). */
export const SafeAreaProfilesSchema = z.object({
  schemaVersion: z.literal(1),
  note: z.string().optional(),
  platforms: z.record(
    z.string(),
    z.object({ verified: z.boolean(), top: z.number().min(0).max(0.5), bottom: z.number().min(0).max(0.5), left: z.number().min(0).max(0.5), right: z.number().min(0).max(0.5) }),
  ),
});
export type SafeAreaProfiles = z.infer<typeof SafeAreaProfilesSchema>;

/** One profile safe on every platform: the largest margin on each side. */
export const strictestSafeArea = (p: SafeAreaProfiles): SafeArea => {
  const all = Object.values(p.platforms);
  const max = (k: "top" | "bottom" | "left" | "right") => Math.max(...all.map((x) => x[k]));
  return { schemaVersion: 1, top: max("top"), bottom: max("bottom"), left: max("left"), right: max("right") };
};
