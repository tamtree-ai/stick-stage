import React from "react";
import { faceRect } from "../shots/framing";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { Camera } from "../shots/Stage";
import { stageActorsAt } from "./placement";
import { safeRect, type SafeArea } from "../text/safeArea";
import type { Timeline } from "./timeline";

/** Debug overlay: the safe area and the face boxes the self-check measures. */
export const QaOverlay: React.FC<{ tl: Timeline; lib: Library; set: SetDef; safeArea: SafeArea; camera: Camera; frame: number }> = ({ tl, lib, set, safeArea, camera, frame }) => {
  const safe = safeRect(safeArea, tl.width, tl.height);
  const faces = stageActorsAt(lib, tl.cast, set, frame, tl.fps, tl.width).map((a) => ({ id: a.id, r: faceRect(a, camera, tl.width, tl.height, set.groundY) }));
  return (
    <svg viewBox={`0 0 ${tl.width} ${tl.height}`} style={{ position: "absolute", inset: 0 }}>
      <rect x={safe.x} y={safe.y} width={safe.w} height={safe.h} fill="none" stroke="#00c2ff" strokeWidth={4} strokeDasharray="18 12" />
      {faces.map((f) => (
        <rect key={f.id} x={f.r.x} y={f.r.y} width={f.r.w} height={f.r.h} fill="none" stroke="#ff2d7a" strokeWidth={4} />
      ))}
    </svg>
  );
};
