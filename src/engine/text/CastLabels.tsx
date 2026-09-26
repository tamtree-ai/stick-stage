import React from "react";
import { headInStage } from "../shots/framing";
import type { Camera, StageActor } from "../shots/Stage";

export type CastLabelsProps = {
  actors: readonly (StageActor & { label?: string })[];
  camera: Camera;
  width: number;
  height: number;
  groundY: number;
  /** Labels never rise above this (px): the top safe edge. */
  minY?: number;
  fontFamily: string;
  fontSize?: number;
};

/** Name tags ("me", "my brain") above each labelled head, following the camera (so me-vs-me close-ups still say who is who). */
export const CastLabels: React.FC<CastLabelsProps> = ({ actors, camera, width, height, groundY, minY = 0, fontFamily, fontSize = 44 }) => (
  <>
    {actors.map((a) => {
      if (!a.label) return null;
      const { head, R } = headInStage(a, width, groundY);
      const x = (head.x - camera.cx) * camera.scale + width / 2;
      // In a close-up the head top is off frame: the tag pins just inside the top safe edge.
      const y = Math.max(minY + fontSize * 1.4, (head.y - R * 1.3 - camera.cy) * camera.scale + height / 2);
      if (x < 0 || x > width) return null;
      return (
        <div
          key={a.id}
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: "translate(-50%, -100%)",
            padding: `${fontSize * 0.18}px ${fontSize * 0.42}px`,
            background: "#16161a",
            color: "#ffffff",
            borderRadius: fontSize * 0.3,
            fontFamily,
            fontWeight: 800,
            fontSize,
            whiteSpace: "nowrap",
          }}
        >
          {a.label}
        </div>
      );
    })}
  </>
);
