import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { composePlace, evalActor, seatHeightAt, Stage, type PlaceInput } from "../../engine";
import { library } from "../../data";
import { Label } from "./Label";

/** Ten places from one-line descriptions: the S2 review sheet. */
export const PLACE_LAB_PLACES: { id: string; place: PlaceInput }[] = [
  { id: "park", place: { setting: "park" } },
  { id: "park-sunset-bench", place: { setting: "park", time: "sunset", features: ["pond"], seats: ["left", "right"] } },
  { id: "garden", place: { setting: "garden", features: ["house"] } },
  { id: "meadow-autumn", place: { setting: "meadow", season: "autumn", features: ["pond"] } },
  { id: "forest-night", place: { setting: "forest", time: "night" } },
  { id: "beach", place: { setting: "beach", features: ["flowers"] } },
  { id: "village", place: { setting: "village", features: ["bench"], seats: ["left"] } },
  { id: "clubhouse", place: { setting: "clubhouse", features: ["fence"] } },
  { id: "bedroom-night", place: { setting: "bedroom", time: "night", seats: ["left"] } },
  { id: "kitchen", place: { setting: "kitchen" } },
];

export const placeLabSchema = z.object({ cast: z.array(z.string()), showLabels: z.boolean() });
export const PLACE_LAB_SIZE = { width: 1920, height: 2700 };

const TILE_W = 1920;
const TILE_H = 1080;
const SCALE = 0.5;

export const PlaceLab: React.FC<z.infer<typeof placeLabSchema>> = ({ cast, showLabels }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#222" }}>
      {PLACE_LAB_PLACES.map(({ id, place }, i) => {
        const set = composePlace(id, place, "16:9");
        const marks = ["left", "right"];
        const actors = cast.slice(0, 2).map((c, k) => {
          const mark = marks[k]!;
          const seat = seatHeightAt(set, mark);
          return {
            id: c,
            x: set.marks[mark]!,
            facing: (k === 0 ? "right" : "left") as "left" | "right",
            state: evalActor(
              library,
              { character: c, poseKeys: [{ frame: 0, pose: seat ? "sit" : "idle" }], expressionKeys: [{ frame: 0, expression: "happy" }], seatKeys: seat ? [{ frame: -60, seatPx: seat }] : undefined },
              frame,
              fps,
              set.figureHeightPx,
            ),
          };
        });
        return (
          <div key={id} style={{ position: "absolute", left: (i % 2) * TILE_W * SCALE, top: Math.floor(i / 2) * TILE_H * SCALE, width: TILE_W, height: TILE_H, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
            <Stage set={set} actors={actors} width={TILE_W} height={TILE_H} frame={frame} />
            {showLabels ? (
              <Label x={30} y={30} size={40}>
                {`${id}: ${set.description}`}
              </Label>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
