import type { Character } from "./schema";
import type { Toon } from "./toon/schema";

export type Build = Character["style"]["build"];

/** The toon block when this character draws as a toon, else undefined. */
export const toonOf = (c: Character): Toon | undefined => (c.style.build === "toon" ? c.toon : undefined);

/** Body proportions of the build this character draws in. */
export const proportionsOf = (c: Character): Character["proportions"] => toonOf(c)?.proportions ?? c.proportions;

/** The same character drawn in another tier. Characters without a toon block stay stick. */
export const withBuild = (c: Character, build: Build): Character =>
  build === "toon" && !c.toon ? c : { ...c, style: { ...c.style, build } };

/** A library whose characters draw in `build` where they can (labs: stick vs toon). */
export const charactersWithBuild = (characters: Record<string, Character>, build: Build): Record<string, Character> =>
  Object.fromEntries(Object.entries(characters).map(([id, c]) => [id, withBuild(c, build)]));
