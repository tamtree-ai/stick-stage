import { composePlace } from "../set/compose";
import type { SetDef } from "../set/schema";
import type { Library } from "../rig/actorState";
import type { SkitDoc } from "./schema";
import type { Program } from "./timeline";

/**
 * Turn described places into sets: the skit's `place` becomes set `place-main`, a scene's becomes
 * `place-<scene id>`. Returns the document with every `set` filled in and the composed sets, which
 * travel with the program so the renderer never needs them in the catalog.
 */
export const placeSets = (doc: SkitDoc): { doc: SkitDoc; sets: Record<string, SetDef> } => {
  const sets: Record<string, SetDef> = {};
  const aspect = doc.meta.aspect;
  const root = doc.place ? "place-main" : undefined;
  const looked = (p: NonNullable<SkitDoc["place"]>) => (p.look || !doc.look ? p : { ...p, look: doc.look });
  if (doc.place) sets[root!] = composePlace(root!, looked(doc.place), aspect);
  const scenes = doc.scenes?.map((sc) => {
    if (!sc.place) return sc;
    const id = `place-${sc.id}`;
    sets[id] = composePlace(id, looked(sc.place), aspect);
    return { ...sc, set: id };
  });
  if (!Object.keys(sets).length) return { doc, sets };
  return { doc: { ...doc, set: doc.set ?? root, ...(scenes ? { scenes } : {}) }, sets };
};

/** The catalog library with the program's workspace characters and props on top. */
export const withProgramAssets = (lib: Library, program: Pick<Program, "characters" | "props">): Library =>
  program.characters || program.props ? { ...lib, characters: { ...lib.characters, ...program.characters }, props: { ...lib.props, ...program.props } } : lib;
