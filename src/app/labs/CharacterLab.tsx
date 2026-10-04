import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, Stage } from "../../engine";
import { EXPRESSION_IDS, EXTRA_POSE_IDS, POSE_IDS, sets } from "../../data";
import { buildProp, labLibrary } from "./build";
import { activeIndex, cycleKeys } from "./cycle";
import { Label } from "./Label";

export const characterLabSchema = z.object({
  set: z.string(),
  left: z.string(),
  right: z.string(),
  showLabels: z.boolean(),
  build: buildProp,
  /** Also cycle the poses added after M1 (sit, hold-*, wave, thumbs-up, …). */
  extraPoses: z.boolean().optional(),
});

export const SEGMENT = 36;
export const CHARACTER_LAB_FRAMES = SEGMENT * POSE_IDS.length + SEGMENT;
const ALL_POSES = [...POSE_IDS, ...EXTRA_POSE_IDS];
export const CHARACTER_LAB_ALL_FRAMES = SEGMENT * ALL_POSES.length + SEGMENT;

/**
 * Two characters face each other and alternate through every pose and expression, like
 * an exchange: the right character changes half a segment after the left one.
 */
export const CharacterLab: React.FC<z.infer<typeof characterLabSchema>> = ({ set: setId, left, right, showLabels, build, extraPoses }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 1080;
  const H = 1920;
  const set = sets[setId]!;
  const poses = extraPoses ? ALL_POSES : POSE_IDS;
  const n = poses.length;
  const expressions = Array.from({ length: n }, (_, i) => EXPRESSION_IDS[i % EXPRESSION_IDS.length]!);
  const cast = [
    { id: left, x: set.marks.left ?? 0.3, facing: "right" as const, offset: 0, start: 0, exprStart: 0 },
    { id: right, x: set.marks.right ?? 0.7, facing: "left" as const, offset: SEGMENT / 2, start: 6, exprStart: 4 },
  ];
  const actors = cast.map((c) => ({
    id: c.id,
    x: c.x,
    facing: c.facing,
    state: evalActor(
      labLibrary(build),
      {
        character: c.id,
        poseKeys: cycleKeys("pose", poses, SEGMENT, c.offset, c.start),
        expressionKeys: cycleKeys("expression", expressions, SEGMENT, c.offset, c.exprStart),
      },
      frame,
      fps,
      set.figureHeightPx,
    ),
  }));

  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={W} height={H} frame={frame} />
      {showLabels
        ? cast.map((c, i) => {
            const k = activeIndex(frame, SEGMENT, c.offset, n);
            return (
              <Label key={c.id} x={i === 0 ? 40 : 560} y={1560} size={30}>
                {`${c.id}\n${poses[(k + c.start) % n]}\n${expressions[(k + c.exprStart) % n]}`}
              </Label>
            );
          })
        : null}
    </AbsoluteFill>
  );
};
