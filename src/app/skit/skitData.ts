import { staticFile } from "remotion";
import { calculateStickStageMetadata, skitCompositionSchema, type SkitCompositionProps } from "../../engine";
import { images, library, reactions, safeArea, series, sets, sfxLibrary } from "../../data";

export { skitCompositionSchema, type SkitCompositionProps };

const load = async (file: string): Promise<unknown | undefined> => {
  const res = await fetch(staticFile(file));
  return res.ok ? res.json() : undefined;
};

/** Load skit.json + prepared voice from `public/skits/<id>/` (local files only), compile, size the composition. */
export const calculateSkitMetadata = calculateStickStageMetadata({ load, lib: library, sets, sfx: sfxLibrary, reactions, safeArea, series, images });
