import React from "react";
import { SkitProgram } from "../../engine";
import { library, safeArea, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import type { SkitCompositionProps } from "./skitData";

/** A skit from `public/skits/<id>/skit.json`, compiled in `calculateSkitMetadata`. */
export const SkitComposition: React.FC<SkitCompositionProps> = ({ program, showLabels }) => {
  if (!program) throw new Error("Skit: program missing (calculateMetadata did not run)");
  return <SkitProgram program={program} sets={sets} lib={library} safeArea={safeArea} fontFamily={TEXT_FONT} showLabels={showLabels} />;
};
