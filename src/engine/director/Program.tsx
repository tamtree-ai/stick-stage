import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { linearTiming, TransitionSeries, type TransitionPresentation } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, Freeze, Html5Audio, staticFile } from "remotion";
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

/** Quiet in the gaps, ducked under dialog, silent on the punchline. */
const Bed: React.FC<{ program: Program; audio?: boolean }> = ({ program, audio = true }) => {
  const bed = program.music;
  if (!audio || !bed) return null;
  const talking = (frame: number) =>
    program.scenes.some((sc) => sc.timeline.audio.some((a) => frame >= sc.from + a.frame && frame < sc.from + a.frame + a.durationFrames));
  const punch = (frame: number) =>
    program.scenes.some((sc) => sc.timeline.beats.some((b) => b.punchline && b.kind === "line" && frame >= sc.from + b.from && frame < sc.from + b.to));
  return <Html5Audio src={staticFile(bed.src)} loop volume={(f) => (punch(f) ? 0 : talking(f) ? bed.ducked : bed.gain)} />;
};

/** A compiled skit: its scenes in order, joined by their transitions. A teaser or slam hook plays first. */
export const SkitProgram: React.FC<SkitProgramProps> = ({ program, sets, ...rest }) => {
  const hook = program.hook;
  const hookScene = hook ? program.scenes[hook.scene] : undefined;
  const picture = hook && hookScene ? (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={hook.prefixFrames}>
        <Freeze frame={hook.frame}>
          <Skit timeline={hookScene.timeline} set={sets[hookScene.timeline.set]!} {...rest} audio={false} />
        </Freeze>
        {rest.audio !== false ? <Html5Audio src={staticFile("sfx/whoosh.wav")} volume={0.8} /> : null}
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: hook.transitionFrames })} />
      {program.scenes.map((sc) => (
        <React.Fragment key={sc.id}>
          {sc.transitionIn && sc.transitionIn.durationFrames > 0 ? (
            <TransitionSeries.Transition presentation={presentation(sc.transitionIn, program.width, program.height)} timing={linearTiming({ durationInFrames: sc.transitionIn.durationFrames })} />
          ) : null}
          <TransitionSeries.Sequence durationInFrames={sc.timeline.durationInFrames}>
            <Skit timeline={sc.timeline} set={sets[sc.timeline.set]!} {...rest} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  ) : (
    program.scenes.length === 1 ? (
      <Skit timeline={program.scenes[0]!.timeline} set={sets[program.scenes[0]!.timeline.set]!} {...rest} />
    ) : (
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
    )
  );
  return (
    <AbsoluteFill>
      {picture}
      <Bed program={program} audio={rest.audio} />
    </AbsoluteFill>
  );
};
