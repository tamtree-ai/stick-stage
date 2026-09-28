import type { Catalog } from "../catalog";
import type { Aspect } from "../format/aspect";
import type { TemplateId } from "../templates/premise";

/** What the writer may name: ids and template blurbs. Set descriptions stay out of the prompt. */
export type WriterWorld = {
  characters: readonly string[];
  /** Catalog character → frame. A missing id is not in the catalog. */
  characterAspect?: Readonly<Record<string, Aspect>>;
  sets: readonly string[];
  /** Catalog set → frame. Missing: treated as a short. */
  setAspect?: Readonly<Record<string, Aspect>>;
  templates: readonly { id: TemplateId; cast: 1 | 2 | 3; castMax: 1 | 2 | 3; description: string }[];
  expressions: readonly string[];
  /** Character id → how they are played. Missing: played straight. */
  notes: Readonly<Record<string, string>>;
};

export const writerWorld = (catalog: Catalog, notes: Readonly<Record<string, string>>): WriterWorld => ({
  characters: catalog.characters.map((c) => c.id),
  characterAspect: Object.fromEntries(catalog.characters.map((c) => [c.id, c.aspect])),
  sets: catalog.sets.map((s) => s.id),
  setAspect: Object.fromEntries(catalog.sets.map((s) => [s.id, s.aspect])),
  templates: catalog.templates,
  expressions: catalog.expressions,
  notes,
});
