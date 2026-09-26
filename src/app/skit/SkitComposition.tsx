import React from "react";
import { Skit } from "../../engine";
import { library, safeArea, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import type { SkitCompositionProps } from "./skitData";

/** A skit from `public/skits/<id>/skit.json`, compiled in `calculateSkitMetadata`. */
export const SkitComposition: React.FC<SkitCompositionProps> = ({ timeline, showLabels }) => {
  if (!timeline) throw new Error("Skit: timeline missing (calculateMetadata did not run)");
  return <Skit timeline={timeline} lib={library} set={sets[timeline.set]!} safeArea={safeArea} fontFamily={TEXT_FONT} showLabels={showLabels} />;
};
