import React from "react";
import { Brow } from "../../face/Brows";
import type { FaceState } from "../../face/expressions";
import { Mouth } from "../../face/Mouth";
import type { SymbolId } from "../../face/schema";
import { Symbols } from "../../face/Symbols";
import { clamp, f2 } from "../../lib/math";
import { EarFront, EarsBack, faceLayout, HairBack, HairFront, headPath } from "./head";
import type { Look } from "./look";
import { DetailsOnHead } from "./details";
import { patchPath, ShapeEye } from "./eyes";
import { blushOf, SHAPE_DRAWN_SYMBOLS, ShapeSymbols } from "./symbols";

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
  const ageOf = (id: SymbolId) => symbolAges?.[id] ?? frame - symbolsSince;
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
      {patchColor ? <path d={patchPath(L.exR, L.eyeY, R)} fill={patchColor} /> : null}
      {look.cheeks ? (
        <g fill={look.cheeks} opacity={0.6}>
          <circle cx={L.exR + 0.24 * R} cy={0.2 * R} r={0.13 * R} />
          <circle cx={L.exL - 0.3 * R} cy={0.2 * R} r={0.1 * R} />
        </g>
      ) : null}
      <ShapeSymbols
        symbols={face.symbols.filter((s) => s === "blush")}
        R={R}
        eyes={[L.exL, L.exR]}
        eyeY={L.eyeY}
        frame={frame}
        ageOf={ageOf}
        cheeks={blushOf(look.cheeks)}
      />
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
      {withSymbols ? <DetailsOnHead R={R} look={look} frame={frame} /> : null}
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
        <Overlays {...symbols} face={face} look={look} eyes={[L.exL, L.exR]} ageOf={ageOf} />
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
  const ageOf = (id: SymbolId) => symbolAges?.[id] ?? frame - symbolsSince;
  return (
    <g>
      <DetailsOnHead R={R} look={look} frame={frame} />
      <Overlays
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
        face={face}
        look={look}
        eyes={[L.exL, L.exR]}
        ageOf={ageOf}
      />
    </g>
  );
};

/** Emanata over the head: flat shape tears and sweat; the shared marks (!, ?, anger) for the rest. */
const Overlays: React.FC<
  Omit<React.ComponentProps<typeof Symbols>, "symbols"> & {
    face: FaceState;
    look: Look;
    eyes: readonly number[];
    ageOf: (id: SymbolId) => number;
  }
> = ({ face, look, eyes, ageOf, ...marks }) => (
  <g>
    <ShapeSymbols
      symbols={face.symbols.filter((s) => s !== "blush")}
      R={marks.R}
      eyes={eyes}
      eyeY={marks.eyeY}
      frame={marks.frame}
      ageOf={ageOf}
      cheeks={blushOf(look.cheeks)}
    />
    <Symbols symbols={face.symbols.filter((s) => !SHAPE_DRAWN_SYMBOLS.includes(s))} {...marks} />
  </g>
);
