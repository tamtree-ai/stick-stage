import type { z } from "zod";
import { ExpressionSchema } from "./face/schema";
import { migrate, type DocKind } from "./migrate";
import { PropSchema } from "./props/schema";
import type { Library } from "./rig/actorState";
import { CharacterSchema, PoseSchema } from "./rig/schema";
import { SetSchema, type SetDef } from "./set/schema";

/**
 * Build a validated table (id → document) from raw JSON documents, migrating each first.
 * Throws with the document id and every problem on the first invalid document.
 */
export const docTable = <S extends z.ZodType<{ id: string }>>(kind: DocKind, schema: S, docs: readonly unknown[]): Record<string, z.infer<S>> => {
  const out: Record<string, z.infer<S>> = {};
  for (const raw of docs) {
    const r = schema.safeParse(migrate(kind, raw).doc);
    if (!r.success) {
      const id = (raw as { id?: string }).id ?? "?";
      throw new Error(`Invalid ${kind} "${id}":\n${r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    }
    if (out[r.data.id]) throw new Error(`Duplicate ${kind} id "${r.data.id}"`);
    out[r.data.id] = r.data;
  }
  return out;
};

export type LibraryDocs = { characters: readonly unknown[]; poses: readonly unknown[]; expressions: readonly unknown[]; props: readonly unknown[] };

/** The consumer's registries: characters, poses, expressions and props, validated. */
export const createLibrary = (docs: LibraryDocs): Library => ({
  characters: Object.fromEntries(
    Object.entries(docTable("character", CharacterSchema, docs.characters)).map(([id, c]) => [
      id,
      { ...c, aspect: c.aspect ?? "9:16" },
    ]),
  ),
  poses: docTable("pose", PoseSchema, docs.poses),
  expressions: docTable("expression", ExpressionSchema, docs.expressions),
  props: docTable("prop", PropSchema, docs.props),
});

export const createSets = (docs: readonly unknown[]): Record<string, SetDef> => docTable("set", SetSchema, docs);
