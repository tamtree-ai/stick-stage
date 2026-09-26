import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, Stage, type ExpressionKey, type PoseKey, type PropKey } from "../../engine";
import { library, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import { Label } from "./Label";
import { PROP_POSES } from "./propPoses";

export const propLabSchema = z.object({ set: z.string(), showLabels: z.boolean() });

const SEG = 84;
/** Poses the prop is carried through after its own pose, to prove it stays in the hand. */
const CARRY = ["point", "shrug", "arms-up"];
export const PROP_LAB_FRAMES = SEG * PROP_POSES.length + 30;

const tracks = (offset: number) => {
  const poseKeys: PoseKey[] = [{ frame: 0, pose: "idle" }];
  const propKeys: PropKey[] = [];
  const expressionKeys: ExpressionKey[] = [{ frame: 0, expression: "neutral" }];
  PROP_POSES.forEach(([prop, pose], i) => {
    const t = i * SEG + offset;
    propKeys.push({ frame: t + 4, hand: "R", prop });
    poseKeys.push({ frame: t + 4, pose });
    CARRY.forEach((c, k) => poseKeys.push({ frame: t + 30 + k * 14, pose: c }));
    const last = i === PROP_POSES.length - 1;
    if (last) {
      // The finale: shock, and the phone hits the floor.
      expressionKeys.push({ frame: t + 70, expression: "shocked" });
      propKeys.push({ frame: t + 72, hand: "R", prop: null, drop: true });
      poseKeys.push({ frame: t + 72, pose: "recoil" });
    } else {
      propKeys.push({ frame: t + SEG - 2, hand: "R", prop: null });
      poseKeys.push({ frame: t + SEG - 2, pose: "idle" });
    }
  });
  return { poseKeys, propKeys, expressionKeys };
};

/** Two characters hold every prop, carry it through pose changes, then the phone gets dropped. */
export const PropLab: React.FC<z.infer<typeof propLabSchema>> = ({ set: setId, showLabels }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const set = sets[setId]!;
  const cast = [
    { id: "milo", x: set.marks.left ?? 0.3, facing: "right" as const, offset: 0 },
    { id: "june", x: set.marks.right ?? 0.7, facing: "left" as const, offset: 6 },
  ];
  const actors = cast.map((c) => ({
    id: c.id,
    x: c.x,
    facing: c.facing,
    state: evalActor(library, { character: c.id, ...tracks(c.offset) }, frame, fps, set.figureHeightPx),
  }));
  const seg = Math.min(PROP_POSES.length - 1, Math.floor(frame / SEG));
  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={width} height={height} frame={frame} fontFamily={TEXT_FONT} />
      {showLabels ? (
        <Label x={540} y={1600} align="center">
          {`${PROP_POSES[seg]![0]} · ${actors[0]!.state.props.held.R ? "held" : "—"}`}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
