import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { evalActor, frameShot, Stage, type ExpressionKey, type StageActor } from "../../engine";
import { EXPRESSION_IDS, library, sets } from "../../data";
import { Label } from "./Label";

const W = 1080;
const H = 1920;

/** Expression's own close-up hint, falling back to `close` so every face gets reviewed up close. */
const closeupFor = (expression: string): "close" | "extreme" =>
  library.expressions[expression]?.closeup ?? "close";

export const closeupLabSchema = z.object({
  set: z.string(),
  left: z.string(),
  right: z.string(),
  showLabels: z.boolean(),
});

/** Per expression: the reaction lands in the two-shot, then a hard cut to the face close-up. */
export const CLOSEUP_SEGMENT = 54;
const LAND = 6;
const CUT = 18;
export const CLOSEUP_LAB_FRAMES = CLOSEUP_SEGMENT * EXPRESSION_IDS.length;

/**
 * The direction pattern for emotions: two-shot → the expression lands → cut to the
 * expression's close-up on that character. Subjects alternate so both faces get covered.
 */
export const CloseupLab: React.FC<z.infer<typeof closeupLabSchema>> = ({
  set: setId,
  left,
  right,
  showLabels,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const set = sets[setId]!;
  const seg = Math.min(EXPRESSION_IDS.length - 1, Math.floor(frame / CLOSEUP_SEGMENT));
  const local = frame - seg * CLOSEUP_SEGMENT;
  const cast = [
    { id: left, x: set.marks.left ?? 0.3, facing: "right" as const, turn: 0 },
    { id: right, x: set.marks.right ?? 0.7, facing: "left" as const, turn: 1 },
  ];
  const actors: StageActor[] = cast.map((c) => {
    // Each character is neutral until its own segment, where the expression lands at LAND.
    const expressionKeys: ExpressionKey[] = [{ frame: 0, expression: "neutral" }];
    EXPRESSION_IDS.forEach((expression, i) => {
      if (i % 2 !== c.turn) return;
      const at = i * CLOSEUP_SEGMENT;
      if (at > 0) expressionKeys.push({ frame: at, expression: "neutral" });
      expressionKeys.push({ frame: at + LAND, expression });
    });
    return {
      id: c.id,
      x: c.x,
      facing: c.facing,
      state: evalActor(
        library,
        { character: c.id, poseKeys: [{ frame: 0, pose: "idle" }], expressionKeys },
        frame,
        fps,
        set.figureHeightPx,
      ),
    };
  });
  const expression = EXPRESSION_IDS[seg]!;
  const subject = cast[seg % 2]!.id;
  const framing = local < CUT ? "two" : closeupFor(expression);
  const camera = frameShot({ framing, on: subject }, actors, W, H, set.groundY);
  return (
    <AbsoluteFill>
      <Stage set={set} actors={actors} width={W} height={H} frame={frame} camera={camera} />
      {showLabels ? (
        <Label x={W / 2} y={1560} size={36} align="center">
          {`${expression}\n${framing}${framing === "two" ? "" : ` on ${subject}`}`}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};

export const closeupSheetSchema = z.object({
  set: z.string(),
  characters: z.array(z.string()),
  framing: z.enum(["medium", "close", "extreme"]),
});

const COLS = 6;
const CELL_W = 270;
const CELL_H = 480;
const CELL_SCALE = CELL_W / W;

export const closeupSheetSize = (characters: number) => ({
  width: COLS * CELL_W,
  height: Math.ceil((EXPRESSION_IDS.length * characters) / COLS) * CELL_H,
});

/** Still: every expression × character at one face framing, as it would be cropped on the phone. */
export const CloseupSheet: React.FC<z.infer<typeof closeupSheetSchema>> = ({
  set: setId,
  characters,
  framing,
}) => {
  const { fps } = useVideoConfig();
  const set = sets[setId]!;
  // Past the expression blend, with a mid-blink-free frame so eyes read clearly.
  const frame = 12;
  const cells = characters.flatMap((character) =>
    EXPRESSION_IDS.map((expression) => ({ character, expression })),
  );
  return (
    <AbsoluteFill style={{ background: "#1b1b1f" }}>
      {cells.map(({ character, expression }, i) => {
        const actor: StageActor = {
          id: character,
          x: set.marks.left ?? 0.3,
          facing: "right",
          state: evalActor(
            library,
            {
              character,
              poseKeys: [{ frame: 0, pose: "idle" }],
              expressionKeys: [{ frame: 0, expression }],
              idle: 0,
            },
            frame,
            fps,
            set.figureHeightPx,
          ),
        };
        actor.state.blink = 0;
        const camera = frameShot({ framing, on: character }, [actor], W, H, set.groundY);
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return (
          <div
            key={`${character}-${expression}`}
            style={{
              position: "absolute",
              left: col * CELL_W,
              top: row * CELL_H,
              width: CELL_W,
              height: CELL_H,
              overflow: "hidden",
              outline: "2px solid #1b1b1f",
            }}
          >
            <div style={{ transform: `scale(${CELL_SCALE})`, transformOrigin: "0 0" }}>
              <Stage
                set={set}
                actors={[actor]}
                width={W}
                height={H}
                frame={frame}
                camera={camera}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: 8,
                bottom: 8,
                font: "700 20px ui-monospace, Menlo, monospace",
                color: "#1b1b1f",
                background: "rgba(255,255,255,0.85)",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              {`${character} · ${expression}`}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
