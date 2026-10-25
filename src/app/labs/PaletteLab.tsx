import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { composePlace, evalActor, PALETTES, seatHeightAt, Stage, type Palette, type PlaceInput } from "../../engine";
import { fromOklch } from "../../engine/lib/color";
import { library } from "../../data";
import { Label } from "./Label";

/**
 * Palette directions for the story kit, side by side on the same places and cast, for the owner
 * to choose from. "bright" is the engine's palettes; the others register as `<id>@<direction>` here,
 * in the lab only. "bright" (B) is the engine default since 2026-10-25.
 */
const ok = (l: number, c: number, h: number): string => fromOklch({ l, c, h });

const DIRECTIONS: Record<string, Record<string, Palette>> = {
  // A, calm pastel: the first look pass (2026-10-25): low chroma everywhere; read as washed out.
  calm: {
    "story-day": { sky: ok(0.91, 0.035, 225), wallA: ok(0.87, 0.04, 145), wallB: ok(0.81, 0.062, 138), floor: ok(0.76, 0.07, 130), detail: ok(0.66, 0.085, 142), shade: ok(0.52, 0.05, 165), accent: ok(0.7, 0.1, 35), glow: ok(0.93, 0.09, 92) },
    "story-sunset": { sky: ok(0.87, 0.06, 62), wallA: ok(0.8, 0.045, 22), wallB: ok(0.71, 0.05, 355), floor: ok(0.75, 0.05, 108), detail: ok(0.62, 0.06, 122), shade: ok(0.48, 0.045, 40), accent: ok(0.8, 0.1, 80), glow: ok(0.94, 0.09, 88), light: ok(0.8, 0.12, 55) },
    "story-night": { sky: ok(0.33, 0.065, 272), wallA: ok(0.41, 0.055, 265), wallB: ok(0.37, 0.05, 255), floor: ok(0.42, 0.045, 215), detail: ok(0.36, 0.045, 200), shade: ok(0.28, 0.035, 205), accent: ok(0.88, 0.1, 95), glow: ok(0.93, 0.06, 95), light: ok(0.55, 0.1, 265) },
    "story-autumn": { sky: ok(0.9, 0.035, 230), wallA: ok(0.87, 0.05, 88), wallB: ok(0.8, 0.06, 78), floor: ok(0.76, 0.06, 92), detail: ok(0.71, 0.1, 58), shade: ok(0.5, 0.07, 40), accent: ok(0.63, 0.12, 30), glow: ok(0.93, 0.09, 90), light: ok(0.85, 0.08, 75) },
    "story-beach-sunset": { sky: ok(0.87, 0.06, 62), wallA: ok(0.73, 0.05, 330), wallB: ok(0.66, 0.05, 312), floor: ok(0.83, 0.055, 75), detail: ok(0.62, 0.06, 122), shade: ok(0.66, 0.05, 60), accent: ok(0.8, 0.1, 80), glow: ok(0.94, 0.09, 88), light: ok(0.8, 0.12, 55) },
    "story-beach": { sky: ok(0.91, 0.035, 222), wallA: ok(0.8, 0.06, 218), wallB: ok(0.72, 0.07, 228), floor: ok(0.85, 0.055, 82), detail: ok(0.66, 0.07, 142), shade: ok(0.72, 0.05, 72), accent: ok(0.7, 0.1, 35), glow: ok(0.93, 0.09, 92) },
    "story-indoor": { wallA: ok(0.93, 0.03, 78), wallB: ok(0.88, 0.04, 72), floor: ok(0.7, 0.06, 60), accent: ok(0.62, 0.1, 30), shade: ok(0.55, 0.06, 50), sky: ok(0.9, 0.035, 225), detail: ok(0.66, 0.07, 142), glow: ok(0.93, 0.09, 92), light: ok(0.9, 0.06, 75) },
    "story-bedroom": { wallA: ok(0.88, 0.035, 292), wallB: ok(0.83, 0.04, 292), floor: ok(0.7, 0.04, 62), accent: ok(0.75, 0.08, 350), shade: ok(0.58, 0.06, 295), sky: ok(0.9, 0.035, 225), detail: ok(0.66, 0.07, 142), glow: ok(0.93, 0.05, 95) },
  },
  // Retro print: a limited mid-century palette (teal, mustard, burnt orange, olive on warm paper),
  // from Apollo's earthy ramps; the sky is paper, not blue.
  retro: {
    "story-day": { sky: ok(0.93, 0.03, 90), wallA: ok(0.8, 0.06, 180), wallB: ok(0.7, 0.07, 175), floor: ok(0.74, 0.08, 110), detail: ok(0.55, 0.08, 165), shade: ok(0.42, 0.06, 170), accent: ok(0.66, 0.14, 45), glow: ok(0.84, 0.13, 85) },
    "story-sunset": { sky: ok(0.88, 0.07, 75), wallA: ok(0.76, 0.07, 45), wallB: ok(0.62, 0.07, 30), floor: ok(0.72, 0.08, 95), detail: ok(0.52, 0.07, 140), shade: ok(0.4, 0.05, 40), accent: ok(0.6, 0.12, 175), glow: ok(0.94, 0.09, 90), light: ok(0.82, 0.11, 60) },
    "story-night": { sky: ok(0.3, 0.05, 220), wallA: ok(0.38, 0.05, 200), wallB: ok(0.34, 0.045, 190), floor: ok(0.38, 0.045, 170), detail: ok(0.3, 0.04, 175), shade: ok(0.24, 0.03, 180), accent: ok(0.82, 0.12, 85), glow: ok(0.92, 0.08, 90), light: ok(0.55, 0.08, 220) },
    "story-autumn": { sky: ok(0.92, 0.03, 90), wallA: ok(0.82, 0.08, 80), wallB: ok(0.72, 0.1, 65), floor: ok(0.7, 0.09, 85), detail: ok(0.62, 0.13, 45), shade: ok(0.42, 0.08, 35), accent: ok(0.55, 0.08, 175), glow: ok(0.84, 0.13, 85), light: ok(0.85, 0.08, 75) },
    "story-beach": { sky: ok(0.93, 0.03, 90), wallA: ok(0.72, 0.07, 195), wallB: ok(0.6, 0.07, 200), floor: ok(0.84, 0.07, 85), detail: ok(0.55, 0.08, 165), shade: ok(0.7, 0.06, 70), accent: ok(0.66, 0.14, 45), glow: ok(0.84, 0.13, 85) },
    "story-beach-sunset": { sky: ok(0.88, 0.07, 75), wallA: ok(0.66, 0.07, 30), wallB: ok(0.56, 0.06, 15), floor: ok(0.8, 0.07, 80), detail: ok(0.52, 0.07, 140), shade: ok(0.6, 0.06, 55), accent: ok(0.6, 0.12, 175), glow: ok(0.94, 0.09, 90), light: ok(0.82, 0.11, 60) },
    "story-indoor": { wallA: ok(0.9, 0.04, 95), wallB: ok(0.8, 0.06, 180), floor: ok(0.62, 0.08, 55), accent: ok(0.66, 0.14, 45), shade: ok(0.5, 0.06, 170), sky: ok(0.88, 0.04, 210), detail: ok(0.55, 0.08, 165), glow: ok(0.84, 0.13, 85), light: ok(0.9, 0.06, 80) },
    "story-bedroom": { wallA: ok(0.82, 0.05, 190), wallB: ok(0.76, 0.06, 190), floor: ok(0.62, 0.07, 60), accent: ok(0.8, 0.12, 85), shade: ok(0.52, 0.06, 190), sky: ok(0.88, 0.04, 210), detail: ok(0.55, 0.08, 165), glow: ok(0.92, 0.08, 90) },
  },
};

for (const [dir, pals] of Object.entries(DIRECTIONS)) for (const [id, p] of Object.entries(pals)) PALETTES[`${id}@${dir}`] = p;

export const PALETTE_LAB_DIRECTIONS = ["calm", "bright", "retro"] as const;
const NAMES: Record<string, string> = { calm: "A  calm pastel (before)", bright: "B  storybook bright (default)", retro: "C  retro print" };

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
      {PALETTE_LAB_DIRECTIONS.map((d, col) => (
        <div key={d} style={{ position: "absolute", left: col * TILE_W * SCALE + 16, top: 14, color: "#f2eee6", font: "600 28px sans-serif" }}>
          {NAMES[d]}
        </div>
      ))}
      {PLACES.flatMap(({ id, place }, row) =>
        PALETTE_LAB_DIRECTIONS.map((d, col) => {
          const base = composePlace(id, place, "16:9");
          const set = d === "bright" ? base : { ...base, palette: `${base.palette}@${d}` };
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
