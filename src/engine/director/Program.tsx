import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { linearTiming, TransitionSeries, type TransitionPresentation } from "@remotion/transitions";
import React from "react";
import { Skit, type SkitProps } from "./Skit";
import type { Program, SceneTransition } from "./timeline";
import type { SetDef } from "../set/schema";

export type SkitProgramProps = Omit<SkitProps, "timeline" | "set"> & {
  program: Program;
  sets: Readonly<Record<string, SetDef>>;
};

// The presentations differ only in their props type; TransitionSeries accepts any of them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentation = (t: SceneTransition, width: number, height: number): TransitionPresentation<any> => {
  switch (t.type) {
    case "slide":
      return slide({ direction: "from-right" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "clock-wipe":
      return clockWipe({ width, height });
    default:
      return fade();
  }
};

/** A compiled skit: its scenes in order, joined by their transitions. */
export const SkitProgram: React.FC<SkitProgramProps> = ({ program, sets, ...rest }) => {
  if (program.scenes.length === 1) {
    const tl = program.scenes[0]!.timeline;
    return <Skit timeline={tl} set={sets[tl.set]!} {...rest} />;
  }
  return (
    <TransitionSeries>
      {program.scenes.map((sc) => (
        <React.Fragment key={sc.id}>
          {sc.transitionIn && sc.transitionIn.durationFrames > 0 ? (
            <TransitionSeries.Transition
              presentation={presentation(sc.transitionIn, program.width, program.height)}
              timing={linearTiming({ durationInFrames: sc.transitionIn.durationFrames })}
            />
          ) : null}
          <TransitionSeries.Sequence durationInFrames={sc.timeline.durationInFrames}>
            <Skit timeline={sc.timeline} set={sets[sc.timeline.set]!} {...rest} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
