import React from "react";
import type { FaceState } from "../../face/expressions";
import { lidPolygon } from "../../face/Eyes";
import { clamp, f2 } from "../../lib/math";
import type { Look } from "./look";

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
export const ShapeEye: React.FC<EyeProps> = ({ x, y, R, face, blink, look, behind }) => {
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
  // Dots are a little taller than wide: round dots read as beads, tall ones as eyes.
  const dotRx = R * (kind === "oval" ? 0.085 : 0.08) * size * pupil * (wide ? 0.85 : 1);
  const dotRy = R * (kind === "oval" ? 0.14 : 0.115) * size * pupil * squint * (wide ? 0.85 : 1);
  const whiteRx = R * 0.14 * size * (shape === "shock" ? 1.15 : 1);
  const whiteRy = R * 0.16 * size * (shape === "shock" ? 1.2 : 1) * squint;
  const px = x + face.gaze.x * R * (wide ? 0.05 : 0.035);
  const py = y + face.gaze.y * R * (wide ? 0.05 : 0.035);
  // A lid on a bare dot only nicks its top: a deep cut turns the dot into a flat sliver.
  const lid = wide
    ? clamp(Math.max(face.lid, blink), 0, 1)
    : Math.min(0.32, clamp(Math.max(face.lid, blink), 0, 1));
  const tilt = face.lidTilt * -1 * (wide ? 1 : 0.6);
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

/** A dog-style patch round the near eye: a soft, lopsided blob that leans up and back, not an ellipse. */
export const patchPath = (ex: number, ey: number, R: number): string => {
  const p = (x: number, y: number) => `${f2(ex + x * R)},${f2(ey + y * R)}`;
  return `M${p(-0.2, -0.04)} C${p(-0.22, -0.26)} ${p(-0.02, -0.36)} ${p(0.12, -0.3)} C${p(0.26, -0.24)} ${p(0.27, -0.02)} ${p(0.22, 0.12)} C${p(0.16, 0.26)} ${p(-0.04, 0.27)} ${p(-0.14, 0.18)} C${p(-0.22, 0.1)} ${p(-0.19, 0.04)} ${p(-0.2, -0.04)} Z`;
};
