import React, { useId } from "react";
import { Actor } from "../rig/Actor";
import type { ActorState } from "../rig/actorState";
import { f2 } from "../lib/math";
import { SetLayers } from "../set/Set";
import type { PartLabel, SetDef } from "../set/schema";
import { getPalette } from "../set/palettes";
import { Figures } from "../viz/Figures";
import { themeFor } from "../viz/theme";
import type { FigureTrack } from "../viz/track";

export type StageActor = {
  id: string;
  state: ActorState;
  /** Horizontal root position, fraction of frame width. */
  x: number;
  facing: "left" | "right";
  /** Vertical root offset in stage px (negative = up), e.g. a hop. */
  dy?: number;
  /** Forward tilt in degrees, around the feet (a faint). */
  tilt?: number;
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
  /** Font for text on props, boards, and screens. */
  fontFamily?: string;
  /** Scene words for boards, desks, and TVs. */
  labels?: readonly PartLabel[];
  /** Diagrams: back-layer figures sit behind the cast, front-layer ones over it. */
  figures?: readonly FigureTrack[];
  fps?: number;
};

/** Set background → actors → set foreground, under one camera transform. */
export const Stage: React.FC<StageProps> = ({ set, actors, width, height, frame, camera, fontFamily, labels, figures, fps = 30 }) => {
  const cam = camera ?? FULL_FRAME(width, height);
  const palette = getPalette(set.palette);
  const figs = figures?.length ? { figures, frame, fps, width, height, theme: themeFor(palette), fontFamily } : undefined;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rimId = "rim" + uid;
  const lightId = "light" + uid;
  const t = `translate(${f2(width / 2)} ${f2(height / 2)}) scale(${f2(cam.scale)}) translate(${f2(-cam.cx)} ${f2(-cam.cy)})`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }}>
      <g transform={t}>
        <SetLayers set={set} width={width} height={height} layer="background" labels={labels} fontFamily={fontFamily} />
        {figs ? <Figures {...figs} layer="back" /> : null}
        {palette.rim ? <RimFilter id={rimId} color={palette.rim} radius={(set.figureHeightPx / 640) * 6} /> : null}
        {palette.light ? <LightFilter id={lightId} color={palette.light} /> : null}
        <g filter={palette.rim ? `url(#${rimId})` : undefined}>
          <g filter={palette.light ? `url(#${lightId})` : undefined}>
            {actors.map((a) => (
              <Actor key={a.id} state={a.state} x={a.x * width} groundY={set.groundY + (a.dy ?? 0)} facing={a.facing} frame={frame} fontFamily={fontFamily} tilt={a.tilt} />
            ))}
          </g>
        </g>
        {figs ? <Figures {...figs} layer="front" /> : null}
        <SetLayers set={set} width={width} height={height} layer="foreground" labels={labels} fontFamily={fontFamily} />
      </g>
      {figs ? <Figures {...figs} layer="screen" /> : null}
    </svg>
  );
};

/** A soft light outline around everything it wraps: dilate the alpha, flood it light, blur a touch. */
const RimFilter: React.FC<{ id: string; color: string; radius: number }> = ({ id, color, radius }) => (
  <defs>
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={f2(radius)} result="d" />
      <feFlood floodColor={color} floodOpacity={0.75} />
      <feComposite in2="d" operator="in" result="rim" />
      <feGaussianBlur in="rim" stdDeviation={f2(radius / 3)} result="rb" />
      <feMerge>
        <feMergeNode in="rb" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/** The place's light on the cast: a soft-light wash of `color`, kept inside the figures' shapes. */
const LightFilter: React.FC<{ id: string; color: string }> = ({ id, color }) => (
  <defs>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feFlood floodColor={color} floodOpacity={0.45} result="f" />
      <feBlend in="f" in2="SourceGraphic" mode="soft-light" result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" />
    </filter>
  </defs>
);
