import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, shapeOf, Stage } from "../../engine";
import { EXPRESSION_IDS, EXTRA_EXPRESSION_IDS, EXTRA_POSE_IDS, library, POSE_IDS, sets } from "../../data";
import { cycleKeys } from "./cycle";
import { Label } from "./Label";

export const shapeLabSchema = z.object({
  set: z.string(),
  /** Characters left to right; empty means every shape character in the library. */
  cast: z.array(z.string()),
  showLabels: z.boolean(),
  /** Hold one pose and expression (a lineup still) instead of cycling. */
  hold: z.object({ pose: z.string(), expression: z.string() }).optional(),
});

export const SHAPE_LAB_SEGMENT = 40;
const POSES = [...POSE_IDS, ...EXTRA_POSE_IDS];
const EXPRESSIONS = [...EXPRESSION_IDS, ...EXTRA_EXPRESSION_IDS];
export const SHAPE_LAB_FRAMES = SHAPE_LAB_SEGMENT * POSES.length;

export const shapeCast = (cast: readonly string[]): string[] =>
  cast.length ? [...cast] : Object.values(library.characters).filter((c) => shapeOf(c)).map((c) => c.id);

/**
 * The shape cast in one 16:9 frame: everyone in a row, stepping through every pose and
 * expression a little out of step, so a reviewer sees the whole look at once.
 */
export const ShapeLab: React.FC<z.infer<typeof shapeLabSchema>> = ({ set: setId, cast, showLabels, hold }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const set = sets[setId]!;
  const ids = shapeCast(cast);
  const n = ids.length;
  const actors = ids.map((id, i) => {
    const x = 0.1 + (0.8 * (i + 0.5)) / n;
    const offset = (i * 7) % SHAPE_LAB_SEGMENT;
    return {
      id,
      x,
      facing: (x < 0.5 ? "right" : "left") as "left" | "right",
      state: evalActor(
        library,
        hold
          ? { character: id, poseKeys: [{ frame: 0, pose: hold.pose }], expressionKeys: [{ frame: 0, expression: hold.expression }] }
          : {
              character: id,
              poseKeys: cycleKeys("pose", POSES, SHAPE_LAB_SEGMENT, offset, i),
              expressionKeys: cycleKeys("expression", EXPRESSIONS, SHAPE_LAB_SEGMENT, offset, i * 3),
            },
        frame,
        fps,
        set.figureHeightPx,
      ),
    };
  });
  const seg = Math.floor(frame / SHAPE_LAB_SEGMENT);
  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={width} height={height} frame={frame} />
      {showLabels
        ? actors.map((a, i) => (
            <Label key={a.id} x={a.x * width - 90} y={height - 130} size={24}>
              {hold ? a.id : `${a.id}\n${POSES[(seg + i) % POSES.length]}\n${EXPRESSIONS[(seg + i * 3) % EXPRESSIONS.length]}`}
            </Label>
          ))
        : null}
    </AbsoluteFill>
  );
};
