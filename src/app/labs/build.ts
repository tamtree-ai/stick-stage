import { z } from "zod";
import { charactersWithBuild, type Library } from "../../engine";
import { library } from "../../data";

/** Labs draw each character as its file says, or force the stick or toon tier to compare them. */
export const buildProp = z.enum(["as-is", "stick", "toon"]).optional();
export type LabBuild = z.infer<typeof buildProp>;

export const labLibrary = (build: LabBuild): Library =>
  !build || build === "as-is" ? library : { ...library, characters: charactersWithBuild(library.characters, build) };
