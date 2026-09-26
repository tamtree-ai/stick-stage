import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, Stage } from "../../engine";
import { EXPRESSION_IDS, library, sets } from "../../data";
import { activeIndex, cycleKeys } from "./cycle";
import { Label } from "./Label";

export const faceLabSchema = z.object({
  set: z.string(),
  left: z.string(),
  right: z.string(),
  showLabels: z.boolean(),
});

export const FACE_SEGMENT = 30;
export const FACE_LAB_FRAMES = FACE_SEGMENT * EXPRESSION_IDS.length + FACE_SEGMENT;

/** Close two-shot on both heads, cycling all expressions together. */
export const FaceLab: React.FC<z.infer<typeof faceLabSchema>> = ({ set: setId, left, right, showLabels }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 1080;
  const H = 1920;
  const set = sets[setId]!;
  const expressionKeys = cycleKeys("expression", EXPRESSION_IDS, FACE_SEGMENT, 0);
  const cast = [
    { id: left, x: 0.37, facing: "right" as const },
    { id: right, x: 0.63, facing: "left" as const },
  ];
  const actors = cast.map((c) => ({
    ...c,
    state: evalActor(library, { character: c.id, poseKeys: [{ frame: 0, pose: "idle" }], expressionKeys }, frame, fps, set.figureHeightPx),
  }));
  const headY = actors[0]!.state.joints.head.y + set.groundY;
  const k = activeIndex(frame, FACE_SEGMENT, 0, EXPRESSION_IDS.length);
  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={W} height={H} frame={frame} camera={{ scale: 1.9, cx: W / 2, cy: headY + 160 }} />
      {showLabels ? (
        <Label x={W / 2} y={1500} size={44} align="center">
          {EXPRESSION_IDS[k]}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
