import { SEAT_PARTS } from "./parts/seats";
import type { SetDef } from "./schema";

export type SetCatalogEntry = {
  id: string;
  aspect: SetDef["aspect"];
  kit: SetDef["kit"];
  description: string;
  tags: string[];
  /** Marks where a cast member sits (on a chair, bench, couch or bed); everyone else stands. */
  seated: string[];
};

/** What a set picker (an LLM writing a premise, or a person) needs to choose one: no drawing details. */
export const setCatalog = (sets: Readonly<Record<string, SetDef>>): SetCatalogEntry[] =>
  Object.values(sets).map((s) => ({
    id: s.id,
    aspect: s.aspect,
    kit: s.kit,
    description: s.description ?? `${s.kit} set`,
    tags: s.tags,
    seated: [...s.layers, ...s.foreground].filter((p) => SEAT_PARTS[p.part]).flatMap((p) => p.seatFor),
  }));
