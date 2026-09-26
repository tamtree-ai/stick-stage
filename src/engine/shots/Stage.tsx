import React from "react";
import { Actor } from "../rig/Actor";
import type { ActorState } from "../rig/actorState";
import { f2 } from "../lib/math";
import { SetLayers } from "../set/Set";
import type { SetDef } from "../set/schema";

export type StageActor = {
  id: string;
  state: ActorState;
  /** Horizontal root position, fraction of frame width. */
  x: number;
  facing: "left" | "right";
};

export type Camera = {
  /** Zoom factor (1 = full frame). */
  scale: number;
  /** Stage point (px) that lands at the frame center when zoomed. */
  cx: number;
  cy: number;
};

export const FULL_FRAME = (width: number, height: number): Camera => ({ scale: 1, cx: width / 2, cy: height / 2 });

export type StageProps = {
  set: SetDef;
  actors: readonly StageActor[];
  width: number;
  height: number;
  frame: number;
  camera?: Camera;
  /** Font for text on props (signs). */
  fontFamily?: string;
};

/** Set background → actors → set foreground, under one camera transform. */
export const Stage: React.FC<StageProps> = ({ set, actors, width, height, frame, camera, fontFamily }) => {
  const cam = camera ?? FULL_FRAME(width, height);
  const t = `translate(${f2(width / 2)} ${f2(height / 2)}) scale(${f2(cam.scale)}) translate(${f2(-cam.cx)} ${f2(-cam.cy)})`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }}>
      <g transform={t}>
        <SetLayers set={set} width={width} height={height} layer="background" />
        {actors.map((a) => (
          <Actor key={a.id} state={a.state} x={a.x * width} groundY={set.groundY} facing={a.facing} frame={frame} fontFamily={fontFamily} />
        ))}
        <SetLayers set={set} width={width} height={height} layer="foreground" />
      </g>
    </svg>
  );
};
