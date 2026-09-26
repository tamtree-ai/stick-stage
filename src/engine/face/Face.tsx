import React from "react";
import type { Character } from "../rig/schema";
import { Brow } from "./Brows";
import { Eye } from "./Eyes";
import type { FaceState } from "./expressions";
import { Mouth } from "./Mouth";
import { Symbols } from "./Symbols";

export type FaceProps = {
  character: Character;
  face: FaceState;
  R: number;
  blink: number;
  frame: number;
  symbolsSince: number;
};

/** Face in head-local coordinates (origin = head center, canonical right-facing). */
export const Face: React.FC<FaceProps> = ({ character, face, R, blink, frame, symbolsSince }) => {
  const f = character.face;
  const { stroke, strokeWidth: sw, headFill } = character.style;
  const faceX = f.offsetX * R;
  const eyeY = f.eyeY * R;
  const eyeDx = (f.eyeSpacing / 2) * R;
  const shape =
    face.eyeShape === "base" ? (f.eyes === "dot" ? "dot" : "big") : face.eyeShape;
  const browGap = shape === "dot" ? 0.24 : shape === "shock" ? 0.4 : 0.34;
  // Faces look toward their gaze a little: shift features by a fraction of gaze.x.
  const lookX = face.gaze.x * 0.04 * R;

  return (
    <g>
      <Symbols
        symbols={face.symbols.filter((s) => s === "blush")}
        R={R}
        faceX={faceX + lookX}
        eyeY={eyeY}
        eyeDx={eyeDx}
        frame={frame}
        sw={sw}
        since={symbolsSince}
      />
      {(["L", "R"] as const).map((side) => {
        const cx = faceX + lookX + (side === "L" ? -eyeDx : eyeDx);
        return (
          <g key={side}>
            <Eye
              cx={cx}
              cy={eyeY}
              R={R}
              side={side}
              shape={shape}
              face={face}
              blink={shape === "closed-happy" || shape === "closed" || shape === "squint" ? 0 : blink}
              stroke={stroke}
              sw={sw}
              skin={headFill}
            />
            {f.brows ? (
              <Brow
                cx={cx}
                eyeY={eyeY}
                R={R}
                side={side}
                brow={side === "L" ? face.browL : face.browR}
                stroke={stroke}
                sw={sw}
                gap={browGap}
              />
            ) : null}
          </g>
        );
      })}
      <Mouth cx={faceX + lookX * 1.2 + 0.02 * R} cy={f.mouthY * R} R={R} m={face.mouth} stroke={stroke} sw={sw} />
      <Symbols
        symbols={face.symbols.filter((s) => s !== "blush")}
        R={R}
        faceX={faceX + lookX}
        eyeY={eyeY}
        eyeDx={eyeDx}
        frame={frame}
        sw={sw}
        since={symbolsSince}
      />
    </g>
  );
};
