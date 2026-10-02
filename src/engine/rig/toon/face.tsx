import React, { useId } from "react";
import { Brow } from "../../face/Brows";
import type { FaceState } from "../../face/expressions";
import { lidPolygon } from "../../face/Eyes";
import { Mouth } from "../../face/Mouth";
import type { SymbolId } from "../../face/schema";
import { Symbols } from "../../face/Symbols";
import { clamp, f2 } from "../../lib/math";
import { Cheeks, Ear, faceLayout, Glasses, HairFront, HeadShape, Nose } from "./head";
import type { Pen } from "./kit";

const SCLERA = "#ffffff";
const WATER = "#9fd8f5";

type EyeProps = { x: number; y: number; side: "L" | "R"; face: FaceState; blink: number; pen: Pen };

/** A toon eye: white, coloured iris, pupil, highlight; lids in skin; optional liner and lashes. */
const ToonEye: React.FC<EyeProps> = ({ x, y, side, face, blink, pen }) => {
  const clipId = "teye" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { t, ink } = pen;
  const outward = side === "L" ? -1 : 1;
  const lashes = t.eyes.lashes;
  const shape = face.eyeShape;

  if (shape === "closed-happy" || shape === "closed") {
    const d = shape === "closed-happy" ? `M${x - 11},${y + 4} Q${x},${y - 10} ${x + 11},${y + 4}` : `M${x - 11},${y + 1} Q${x},${y + 7} ${x + 11},${y + 1}`;
    return (
      <g fill="none" stroke={ink} strokeLinecap="round">
        <path d={d} strokeWidth={5} />
        {lashes ? <path d={`M${x + outward * 10},${y + 1} l${outward * 9},-6`} strokeWidth={4} /> : null}
      </g>
    );
  }

  const wide = shape === "shock";
  const rx = 11.5 * (wide ? 1.15 : 1) * (side === "L" ? 0.94 : 1);
  const ry = 14.5 * (wide ? 1.2 : 1);
  const squint = shape === "squint";
  const lid = clamp(Math.max(face.lid, blink, squint ? 0.55 : 0), 0, 1);
  const lower = Math.max(face.lower, squint ? 0.35 : 0);
  const tilt = face.lidTilt * (side === "L" ? 1 : -1) * -1;
  const irisR = (wide ? 6 : 8) * face.pupil;
  const px = x + face.gaze.x * 5;
  const py = y + 2 + face.gaze.y * 6;
  const lidY = y - ry + lid * 2 * ry;
  const slope = Math.tan((tilt * Math.PI) / 180);
  return (
    <g>
      <clipPath id={clipId}>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} />
      </clipPath>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={SCLERA} />
      <g clipPath={`url(#${clipId})`}>
        {shape === "teary" ? <ellipse cx={x} cy={y + ry * 0.95} rx={rx * 1.1} ry={ry * 0.45} fill={WATER} /> : null}
        <circle cx={px} cy={py} r={irisR} fill={t.eyes.iris} />
        <circle cx={px} cy={py} r={irisR * 0.58} fill={ink} />
        <circle cx={px + 3} cy={py - 4} r={2.4} fill={SCLERA} />
        {lid > 0.02 ? (
          <>
            <polygon points={lidPolygon(x, y, rx, ry, lid, tilt, "top")} fill={t.skin} />
            <path d={`M${f2(x - rx * 1.2)},${f2(lidY + slope * rx * 1.2)} L${f2(x + rx * 1.2)},${f2(lidY - slope * rx * 1.2)}`} stroke={ink} strokeWidth={4} />
          </>
        ) : null}
        {lower > 0.02 ? <polygon points={lidPolygon(x, y, rx, ry, lower * 0.55, -tilt, "bottom")} fill={t.skin} stroke={ink} strokeWidth={3} /> : null}
      </g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={ink} strokeWidth={4} />
      {lashes && lid < 0.3 ? (
        <path
          d={`M${f2(x - rx)},${y - 2} Q${f2(x - rx * 0.6)},${y - ry - 2} ${x},${y - ry - 1} Q${f2(x + rx * 0.7)},${y - ry} ${f2(x + rx + 1)},${y - 4}`}
          fill="none"
          stroke={ink}
          strokeWidth={6.5}
          strokeLinecap="round"
        />
      ) : null}
      {lashes ? (
        <path
          d={`M${f2(x + outward * rx * 0.55)},${f2(y - ry * 0.8 + lid * ry)} l${outward * 9},-8 M${f2(x + outward * rx * 0.9)},${f2(y - ry * 0.4 + lid * ry * 0.6)} l${outward * 11},-4`}
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
};

export type ToonHeadProps = {
  /** Head radius in toon units. */
  R: number;
  face: FaceState;
  blink: number;
  pen: Pen;
  frame: number;
  symbolsSince: number;
  symbolAges?: Partial<Record<SymbolId, number>>;
  mirrored?: boolean;
  seed: string;
};

/**
 * The head over the body, head-local toon units: skin, cheeks, eyes, glasses, nose, mouth,
 * hair, ear, then brows on top so a fringe never hides them, then symbols.
 */
export const ToonHead: React.FC<ToonHeadProps> = ({ R, face, blink, pen, frame, symbolsSince, symbolAges, mirrored, seed }) => {
  const { t, ink } = pen;
  const L = faceLayout(R);
  const closed = face.mouth.open < 0.03;
  const browSw = t.brows.thickness / 0.78;
  const symbols = { R, faceX: L.fx + 2, eyeY: L.eyeY, eyeDx: (L.exR - L.exL) / 2, frame, sw: t.outline, since: symbolsSince, ages: symbolAges, stroke: ink, mirrored, seed };
  return (
    <g>
      <HeadShape R={R} pen={pen} />
      <Cheeks R={R} pen={pen} />
      <Symbols symbols={face.symbols.filter((s) => s === "blush")} {...symbols} />
      <ToonEye x={L.exL} y={L.eyeY} side="L" face={face} blink={blink} pen={pen} />
      <ToonEye x={L.exR} y={L.eyeY} side="R" face={face} blink={blink} pen={pen} />
      <Glasses R={R} pen={pen} />
      <Nose R={R} pen={pen} />
      <Mouth cx={L.mouthX} cy={L.mouthY} R={R} m={face.mouth} stroke={ink} sw={6.6} lip={t.lip} />
      {closed && t.eyes.lashes ? (
        // A hint of the lower lip.
        <path d={`M${f2(L.fx)},${f2(R * 0.71)} q6,3 12,0`} fill="none" stroke={t.lip} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      ) : null}
      <HairFront R={R} pen={pen} />
      <Ear R={R} pen={pen} />
      <Brow cx={L.exL - 1} eyeY={L.eyeY} R={R} side="L" brow={face.browL} stroke={t.brows.color} sw={browSw} gap={t.brows.gap} />
      <Brow cx={L.exR + 1} eyeY={L.eyeY} R={R} side="R" brow={face.browR} stroke={t.brows.color} sw={browSw} gap={t.brows.gap} />
      <Symbols symbols={face.symbols.filter((s) => s !== "blush")} {...symbols} />
    </g>
  );
};
