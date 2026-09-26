import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, Stage } from "../../engine";
import { library, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import { Label } from "./Label";
import { SCENE_FRAMES, SCENES, seatKeysFor } from "./stagingScenes";

export const stagingLabSchema = z.object({ showLabels: z.boolean(), left: z.string(), right: z.string() });

export const STAGING_LAB_FRAMES = SCENE_FRAMES * SCENES.length;

/** Two characters across every set: seating, foreground desk, props, drops and symbol FX. */
export const StagingLab: React.FC<z.infer<typeof stagingLabSchema>> = ({ showLabels, left, right }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const index = Math.min(SCENES.length - 1, Math.floor(frame / SCENE_FRAMES));
  const scene = SCENES[index]!;
  const local = frame - index * SCENE_FRAMES;
  const set = sets[scene.set]!;
  const cast = [
    { id: left, mark: "left", facing: "right" as const, t: scene.cast.left },
    { id: right, mark: "right", facing: "left" as const, t: scene.cast.right },
  ];
  const actors = cast.map((c) => {
    const { poseKeys, expressionKeys, propKeys, symbolKeys } = c.t;
    const tracks = { poseKeys, expressionKeys, propKeys, symbolKeys };
    return {
      id: c.id,
      x: set.marks[c.mark]!,
      facing: c.facing,
      state: evalActor(
        library,
        { ...tracks, character: c.id, seed: `${c.id}-${scene.set}`, seatKeys: seatKeysFor(set, c.mark, c.t) },
        local,
        fps,
        set.figureHeightPx,
      ),
    };
  });
  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={width} height={height} frame={local} fontFamily={TEXT_FONT} />
      {showLabels ? (
        <Label x={40} y={1640} size={30}>
          {`${scene.set}\n${scene.note}`}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
