import React from "react";
import { Brow } from "../../face/Brows";
import type { FaceState } from "../../face/expressions";
import { lidPolygon } from "../../face/Eyes";
import { Mouth } from "../../face/Mouth";
import type { SymbolId } from "../../face/schema";
import { Symbols } from "../../face/Symbols";
import { clamp, f2 } from "../../lib/math";
import { EarFront, EarsBack, faceLayout, HairBack, HairFront, headPath } from "./head";
import type { Look } from "./look";
import { DetailsOnHead } from "./details";

const WHITE = "#ffffff";
const WATER = "#9fd8f5";

type EyeProps = {
  x: number;
  y: number;
  R: number;
  face: FaceState;
  blink: number;
  look: Look;
  behind: string;
};

/** A shape eye: a dark dot (or a white with a dot) with a highlight; lids in the colour behind it. */
const ShapeEye: React.FC<EyeProps> = ({ x, y, R, face, blink, look, behind }) => {
  const { kind, size } = look.s.eyes;
  const ink = look.ink;
  const shape = face.eyeShape;
  const lineW = R * 0.05;
  if (shape === "closed-happy" || shape === "closed" || blink > 0.7) {
    const w = R * 0.1 * size;
    const d =
      shape === "closed-happy"
        ? `M${f2(x - w)},${f2(y + w * 0.35)} Q${f2(x)},${f2(y - w * 0.9)} ${f2(x + w)},${f2(y + w * 0.35)}`
        : `M${f2(x - w)},${f2(y)} Q${f2(x)},${f2(y + w * 0.6)} ${f2(x + w)},${f2(y)}`;
    return <path d={d} fill="none" stroke={ink} strokeWidth={lineW} strokeLinecap="round" />;
  }
  const wide = kind === "wide" || shape === "shock";
  const squint = shape === "squint" ? 0.45 : 1;
  const pupil = 0.8 + 0.2 * face.pupil;
  const dotRx = R * (kind === "oval" ? 0.08 : 0.075) * size * pupil * (wide ? 0.85 : 1);
  const dotRy = R * (kind === "oval" ? 0.13 : 0.1) * size * pupil * squint * (wide ? 0.85 : 1);
  const whiteRx = R * 0.14 * size * (shape === "shock" ? 1.15 : 1);
  const whiteRy = R * 0.16 * size * (shape === "shock" ? 1.2 : 1) * squint;
  const px = x + face.gaze.x * R * (wide ? 0.05 : 0.035);
  const py = y + face.gaze.y * R * (wide ? 0.05 : 0.035);
  const lid = clamp(Math.max(face.lid, blink), 0, 1);
  const tilt = face.lidTilt * -1;
  const lidRx = (wide ? whiteRx : dotRx) * 1.25;
  const lidRy = (wide ? whiteRy : dotRy) * 1.15;
  return (
    <g>
      {wide ? <ellipse cx={x} cy={y} rx={whiteRx} ry={whiteRy} fill={WHITE} /> : null}
      {shape === "teary" ? (
        <ellipse cx={x} cy={y + dotRy * 1.2} rx={dotRx * 1.8} ry={dotRy * 0.5} fill={WATER} />
      ) : null}
      <ellipse cx={px} cy={py} rx={dotRx} ry={dotRy} fill={ink} />
      <circle cx={px + dotRx * 0.35} cy={py - dotRy * 0.4} r={dotRx * 0.34} fill={WHITE} />
      {lid > 0.04 || Math.abs(tilt) > 2 ? (
        <polygon
          points={lidPolygon(x, y, lidRx, lidRy, Math.max(lid, 0.12), tilt, "top")}
          fill={behind}
        />
      ) : null}
      {face.lower > 0.04 ? (
        <polygon
          points={lidPolygon(x, y, lidRx, lidRy, face.lower * 0.5, -tilt, "bottom")}
          fill={behind}
        />
      ) : null}
    </g>
  );
};

/** Muzzle, snout or beak, with the nose and the mouth. Returns where the mouth sits. */
const Muzzle: React.FC<{ R: number; look: Look; face: FaceState }> = ({ R, look, face }) => {
  const L = faceLayout(R, look.s.eyes.spacing);
  const kind = look.s.muzzle.kind;
  const ink = look.ink;
  // A soft mouth: no ink rim on an open mouth, a warm rose inside instead of near-black.
  const mouthAt = (cx: number, cy: number, scale = 1) => (
    <Mouth
      cx={cx}
      cy={cy}
      R={R * scale * 0.9}
      m={face.mouth}
      stroke={look.mouth.inside}
      lip={ink}
      sw={R * 0.075}
      colors={look.mouth}
    />
  );
  if (kind === "beak") {
    const hx = L.fx - 0.02 * R;
    const hy = 0.3 * R;
    const open = clamp(face.mouth.open, 0, 1) * 26;
    return (
      <g fill={look.muzzle}>
        <path
          transform={`rotate(${f2(open)} ${f2(hx)} ${f2(hy)})`}
          d={`M${f2(hx)},${f2(hy)} L${f2(L.fx + 0.55 * R)},${f2(0.36 * R)} Q${f2(L.fx + 0.2 * R)},${f2(0.5 * R)} ${f2(hx)},${f2(0.42 * R)} Z`}
          opacity={0.85}
        />
        <path
          d={`M${f2(hx)},${f2(0.1 * R)} Q${f2(L.fx + 0.4 * R)},${f2(0.12 * R)} ${f2(L.fx + 0.7 * R)},${f2(0.32 * R)} L${f2(hx)},${f2(hy + 0.02 * R)} Z`}
        />
      </g>
    );
  }
  if (kind === "oval" || kind === "snout") {
    const snout = kind === "snout";
    const cx = L.fx + (snout ? 0.55 : 0.1) * R;
    const cy = (snout ? 0.3 : 0.38) * R;
    const rx = (snout ? 0.45 : 0.42) * R;
    const ry = (snout ? 0.32 : 0.3) * R;
    const noseX = snout ? cx + rx * 0.72 : cx + 0.06 * R;
    const noseY = cy - ry * 0.55;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={look.muzzle} />
        {look.nose ? (
          <ellipse cx={noseX} cy={noseY} rx={R * 0.1} ry={R * 0.075} fill={look.nose} />
        ) : null}
        {mouthAt(snout ? cx - 0.02 * R : cx + 0.02 * R, cy + ry * 0.35, 0.85)}
      </g>
    );
  }
  return mouthAt(L.mouthX, L.mouthY);
};

export type ShapeHeadProps = {
  R: number;
  look: Look;
  face: FaceState;
  blink: number;
  frame: number;
  symbolsSince: number;
  symbolAges?: Partial<Record<SymbolId, number>>;
  mirrored?: boolean;
  seed: string;
  /** False when the rig draws worn details and emanata itself (`ShapeHeadSymbols`), outside the soft silhouette. */
  withSymbols?: boolean;
};

/** Drawn behind the body: pigtails and the ears that sit behind the head. */
export const ShapeHeadBack: React.FC<{ R: number; look: Look; frame: number }> = ({
  R,
  look,
  frame,
}) => (
  <g>
    <HairBack R={R} look={look} />
    <EarsBack R={R} look={look} frame={frame} />
  </g>
);

/**
 * The head over the body, head-local px: skin, markings, cheeks, eyes, muzzle and mouth, hair,
 * a floppy ear, hats and glasses, brows, then symbols.
 */
export const ShapeHead: React.FC<ShapeHeadProps> = ({
  R,
  look,
  face,
  blink,
  frame,
  symbolsSince,
  symbolAges,
  mirrored,
  seed,
  withSymbols = true,
}) => {
  const L = faceLayout(R, look.s.eyes.spacing);
  const patchColor = look.marks["eye-patch"];
  const symbols = {
    R,
    faceX: L.fx,
    eyeY: L.eyeY,
    eyeDx: L.gap / 2,
    frame,
    sw: R * 0.06,
    since: symbolsSince,
    ages: symbolAges,
    stroke: look.ink,
    mirrored,
    seed,
  };
  return (
    <g>
      <path d={headPath(R, look.s.head.kind)} fill={look.head} />
      {patchColor ? (
        <ellipse cx={L.exR + 0.02 * R} cy={L.eyeY} rx={0.24 * R} ry={0.27 * R} fill={patchColor} />
      ) : null}
      {look.cheeks ? (
        <g fill={look.cheeks} opacity={0.6}>
          <circle cx={L.exR + 0.24 * R} cy={0.2 * R} r={0.13 * R} />
          <circle cx={L.exL - 0.3 * R} cy={0.2 * R} r={0.1 * R} />
        </g>
      ) : null}
      <Symbols symbols={face.symbols.filter((s) => s === "blush")} {...symbols} />
      <ShapeEye
        x={L.exL}
        y={L.eyeY}
        R={R}
        face={face}
        blink={blink}
        look={look}
        behind={look.head}
      />
      <ShapeEye
        x={L.exR}
        y={L.eyeY}
        R={R}
        face={face}
        blink={blink}
        look={look}
        behind={patchColor ?? look.head}
      />
      <Muzzle R={R} look={look} face={face} />
      <HairFront R={R} look={look} />
      <EarFront R={R} look={look} frame={frame} />
      {withSymbols ? <DetailsOnHead R={R} look={look} /> : null}
      {look.s.brows ? (
        <>
          <Brow
            cx={L.exL}
            eyeY={L.eyeY}
            R={R}
            side="L"
            brow={face.browL}
            stroke={look.ink}
            sw={R * 0.06}
            gap={0.36}
          />
          <Brow
            cx={L.exR}
            eyeY={L.eyeY}
            R={R}
            side="R"
            brow={face.browR}
            stroke={look.ink}
            sw={R * 0.06}
            gap={0.36}
          />
        </>
      ) : null}
      {withSymbols ? (
        <Symbols symbols={face.symbols.filter((s) => s !== "blush")} {...symbols} />
      ) : null}
    </g>
  );
};

/**
 * What sits over a head drawn inside a soft silhouette: worn details (hats, bows, glasses) and
 * the emanata (sweat, "!", tears), kept crisp and outside the fillets.
 */
export const ShapeHeadSymbols: React.FC<ShapeHeadProps> = ({
  R,
  look,
  face,
  frame,
  symbolsSince,
  symbolAges,
  mirrored,
  seed,
}) => {
  const L = faceLayout(R, look.s.eyes.spacing);
  return (
    <g>
      <DetailsOnHead R={R} look={look} />
      <Symbols
        symbols={face.symbols.filter((s) => s !== "blush")}
        R={R}
        faceX={L.fx}
        eyeY={L.eyeY}
        eyeDx={L.gap / 2}
        frame={frame}
        sw={R * 0.06}
        since={symbolsSince}
        ages={symbolAges}
        stroke={look.ink}
        mirrored={mirrored}
        seed={seed}
      />
    </g>
  );
};
