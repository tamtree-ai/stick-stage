/** Building blocks shared by the figure param schemas. */
import { z } from "zod";

/** A theme slot (`ink`, `accent`, `a1`…`a5`, `myth`, `truth`, `muted`, `highlight`) or a hex. */
export const COLOR_SLOTS = ["ink", "accent", "a1", "a2", "a3", "a4", "a5", "myth", "truth", "muted", "highlight", "paper"] as const;
export const color = z.union([z.enum(COLOR_SLOTS), z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "a theme slot or a hex color")]);
export type ColorRef = z.infer<typeof color>;

export const range = z.tuple([z.number(), z.number()]).refine(([a, b]) => b > a, "range is [low, high] with high > low");
export const pt = z.tuple([z.number(), z.number()]);
export const numOrExpr = z.union([z.number(), z.string().min(1)]);
export const text = z.string().min(1).max(60);
