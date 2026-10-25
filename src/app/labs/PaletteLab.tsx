import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { composePlace, evalActor, seatHeightAt, Stage, STORY_LOOKS, type PlaceInput, type StoryLook } from "../../engine";
import { library } from "../../data";
import { Label } from "./Label";

/** The story kit's three colour looks side by side on the same places and cast (`set/storyPalettes.ts`). */
const NAMES: Record<StoryLook, string> = { bright: "bright (default)", retro: "retro", pastel: "pastel" };

const PLACES: { id: string; place: PlaceInput }[] = [
  { id: "park", place: { setting: "park", features: ["flowers"] } },
  { id: "clubhouse", place: { setting: "clubhouse", features: ["fence"] } },
  { id: "living-room", place: { setting: "living-room", seats: ["left"] } },
  { id: "beach-sunset", place: { setting: "beach", time: "sunset" } },
  { id: "forest-night", place: { setting: "forest", time: "night" } },
];

export const paletteLabSchema = z.object({ cast: z.array(z.string()) });
const TILE_W = 1920;
const TILE_H = 1080;
const SCALE = 1 / 3;
const HEAD = 60;
export const PALETTE_LAB_SIZE = { width: TILE_W, height: HEAD + PLACES.length * TILE_H * SCALE };

export const PaletteLab: React.FC<z.infer<typeof paletteLabSchema>> = ({ cast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#1d1b22" }}>
      {STORY_LOOKS.map((d, col) => (
        <div key={d} style={{ position: "absolute", left: col * TILE_W * SCALE + 16, top: 14, color: "#f2eee6", font: "600 28px sans-serif" }}>
          {NAMES[d]}
        </div>
      ))}
      {PLACES.flatMap(({ id, place }, row) =>
        STORY_LOOKS.map((d, col) => {
          const set = composePlace(id, { ...place, look: d }, "16:9");
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
            <div key={`${id}-${d}`} style={{ position: "absolute", left: col * TILE_W * SCALE, top: HEAD + row * TILE_H * SCALE, width: TILE_W, height: TILE_H, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
              <Stage set={set} actors={actors} width={TILE_W} height={TILE_H} frame={frame} />
              {col === 0 ? (
                <Label x={30} y={30} size={48}>
                  {id}
                </Label>
              ) : null}
            </div>
          );
        }),
      )}
    </AbsoluteFill>
  );
};
