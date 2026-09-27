import type { Catalog } from "../catalog";
import type { TemplateId } from "../templates/premise";

/** What the writer may name: ids and template blurbs. Set descriptions stay out of the prompt. */
export type WriterWorld = {
  characters: readonly string[];
  sets: readonly string[];
  templates: readonly { id: TemplateId; cast: 1 | 2; description: string }[];
  expressions: readonly string[];
  /** Character id → how they are played. Missing: played straight. */
  notes: Readonly<Record<string, string>>;
};

export const writerWorld = (catalog: Catalog, notes: Readonly<Record<string, string>>): WriterWorld => ({
  characters: catalog.characters.map((c) => c.id),
  sets: catalog.sets.map((s) => s.id),
  templates: catalog.templates,
  expressions: catalog.expressions,
  notes,
});
