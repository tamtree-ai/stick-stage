import React from "react";
import { f2 } from "../lib/math";
import type { ActorState } from "./actorState";
import { Rig } from "./Rig";

export type ActorProps = {
  state: ActorState;
  /** Root position in stage pixels (feet contact point). */
  x: number;
  groundY: number;
  facing: "left" | "right";
  frame: number;
};

export const Actor: React.FC<ActorProps> = ({ state, x, groundY, facing, frame }) => (
  <g transform={`translate(${f2(x)} ${f2(groundY)}) scale(${facing === "left" ? -1 : 1} 1)`}>
    <Rig
      character={state.character}
      joints={state.joints}
      metrics={state.metrics}
      bend={state.angles.bend}
      face={state.face}
      blink={state.blink}
      frame={frame}
      symbolsSince={state.symbolsSince}
    />
  </g>
);
