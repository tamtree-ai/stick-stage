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

export type Rect = { x: number; y: number; w: number; h: number };

export const safeRect = (sa: SafeArea, width: number, height: number): Rect => ({
  x: sa.left * width,
  y: sa.top * height,
  w: (1 - sa.left - sa.right) * width,
  h: (1 - sa.top - sa.bottom) * height,
});
