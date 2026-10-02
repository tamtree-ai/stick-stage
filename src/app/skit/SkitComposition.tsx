import React from "react";
import { SkitProgram } from "../../engine";
import { library, safeArea, sets } from "../../data";
import { fontFor, withSymbolFallbacks } from "../../engine/text/fonts";
import { TEXT_FONT } from "../fonts";
import type { SkitCompositionProps } from "./skitData";

const familyOf = (language: string | undefined): string => {
  const choice = fontFor(language);
  return choice.family === "Montserrat" ? TEXT_FONT : withSymbolFallbacks(choice.family);
};

/** A skit from `public/skits/<id>/skit.json`, compiled in `calculateSkitMetadata`. */
export const SkitComposition: React.FC<SkitCompositionProps> = ({ program, showLabels }) => {
  if (!program) throw new Error("Skit: program missing (calculateMetadata did not run)");
  return <SkitProgram program={program} sets={sets} lib={library} safeArea={safeArea} fontFamily={familyOf(program.scenes[0]?.timeline.language)} showLabels={showLabels} />;
};
