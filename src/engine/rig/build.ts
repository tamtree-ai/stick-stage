import type { Character } from "./schema";
import { shapeProportions } from "./shape/proportions";
import type { Shape } from "./shape/schema";
import type { Toon } from "./toon/schema";

export type Build = Character["style"]["build"];

/** The toon block when this character draws as a toon, else undefined. */
export const toonOf = (c: Character): Toon | undefined => (c.style.build === "toon" ? c.toon : undefined);

/** The shape block when this character draws as a shape figure, else undefined. */
export const shapeOf = (c: Character): Shape | undefined => (c.style.build === "shape" ? c.shape : undefined);

/** Body proportions of the build this character draws in. */
export const proportionsOf = (c: Character): Character["proportions"] => {
  const s = shapeOf(c);
  return s ? shapeProportions(s) : (toonOf(c)?.proportions ?? c.proportions);
};

/**
 * The same character drawn in another tier. A character without the block for that tier keeps
 * its own build.
 */
export const withBuild = (c: Character, build: Build): Character =>
  (build === "toon" && !c.toon) || (build === "shape" && !c.shape) ? c : { ...c, style: { ...c.style, build } };

/** A library whose characters draw in `build` where they can (labs: stick vs toon). */
export const charactersWithBuild = (characters: Record<string, Character>, build: Build): Record<string, Character> =>
  Object.fromEntries(Object.entries(characters).map(([id, c]) => [id, withBuild(c, build)]));
