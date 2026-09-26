import React, { useId } from "react";
import { f2 } from "../lib/math";
import type { EyeShape } from "./schema";
import type { FaceState } from "./expressions";

export type EyeProps = {
  cx: number;
  cy: number;
  /** Head radius in px. */
  R: number;
  /** "L" = back eye (screen-left in canonical view), "R" = front eye. */
  side: "L" | "R";
  shape: Exclude<EyeShape, "base">;
  face: FaceState;
  blink: number;
  stroke: string;
  sw: number;
  skin: string;
};

const SCLERA = "#ffffff";
const WATER = "#9fd8f5";

type Dims = { rx: number; ry: number; pupil: number };

const dims = (shape: EyeProps["shape"], R: number): Dims => {
  switch (shape) {
    case "shock":
      return { rx: 0.25 * R, ry: 0.32 * R, pupil: 0.26 };
    case "teary":
      return { rx: 0.23 * R, ry: 0.29 * R, pupil: 0.62 };
    case "dot":
      return { rx: 0.075 * R, ry: 0.095 * R, pupil: 1 };
    default:
      return { rx: 0.21 * R, ry: 0.27 * R, pupil: 0.52 };
  }
};

/** A lid polygon covering everything above (or below) a tilted line through the eye. */
const lidPolygon = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  amount: number,
  tiltDeg: number,
  from: "top" | "bottom",
): string => {
  const y = from === "top" ? cy - ry + 2 * ry * amount : cy + ry - 2 * ry * amount;
  const slope = Math.tan((tiltDeg * Math.PI) / 180);
  const x0 = cx - rx * 1.6;
  const x1 = cx + rx * 1.6;
  const y0 = y - slope * (x0 - cx);
  const y1 = y - slope * (x1 - cx);
  const edge = from === "top" ? cy - ry * 3 : cy + ry * 3;
  return `${f2(x0)},${f2(y0)} ${f2(x1)},${f2(y1)} ${f2(x1)},${f2(edge)} ${f2(x0)},${f2(edge)}`;
};

export const Eye: React.FC<EyeProps> = (p) => {
  const clipId = "eye" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { cx, cy, R, face, stroke, sw } = p;
  const lineW = sw * 0.72;
  // Inner end of each eye: toward the face center.
  const inward = p.side === "L" ? 1 : -1;

  if (p.shape === "closed-happy" || p.shape === "closed") {
    const rx = 0.17 * R;
    const up = p.shape === "closed-happy" ? -1 : 1;
    const d = `M ${f2(cx - rx)} ${f2(cy + up * -0.05 * R)} Q ${f2(cx)} ${f2(cy + up * 0.2 * R)} ${f2(cx + rx)} ${f2(cy + up * -0.05 * R)}`;
    return <path d={d} fill="none" stroke={stroke} strokeWidth={lineW} strokeLinecap="round" />;
  }

  if (p.shape === "squint") {
    const rx = 0.14 * R;
    const ry = 0.12 * R;
    const tip = cx + inward * rx;
    const back = cx - inward * rx;
    const d = `M ${f2(back)} ${f2(cy - ry)} L ${f2(tip)} ${f2(cy)} L ${f2(back)} ${f2(cy + ry)}`;
    return (
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={lineW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  const { rx: baseRx, ry, pupil } = dims(p.shape, R);
  const rx = baseRx * (p.side === "L" ? 0.94 : 1);
  const lid = Math.min(1, Math.max(face.lid, p.blink));
  const lidTilt = -face.lidTilt * inward;

  if (p.shape === "dot") {
    const gx = face.gaze.x * rx * 0.6;
    const gy = face.gaze.y * ry * 0.4;
    return (
      <g>
        <clipPath id={clipId}>
          <ellipse cx={cx + gx} cy={cy + gy} rx={rx} ry={ry} />
        </clipPath>
        <ellipse cx={cx + gx} cy={cy + gy} rx={rx * face.pupil} ry={ry * face.pupil} fill={stroke} />
        {lid > 0.02 || face.lower > 0.02 ? (
          <g clipPath={`url(#${clipId})`}>
            {lid > 0.02 ? (
              <polygon points={lidPolygon(cx + gx, cy + gy, rx, ry, lid, lidTilt, "top")} fill={p.skin} />
            ) : null}
            {face.lower > 0.02 ? (
              <polygon points={lidPolygon(cx + gx, cy + gy, rx, ry, face.lower * 0.6, -lidTilt, "bottom")} fill={p.skin} />
            ) : null}
          </g>
        ) : null}
        {lid > 0.2 ? (
          <line
            x1={cx + gx - rx * 1.5}
            x2={cx + gx + rx * 1.5}
            y1={cy + gy - ry + 2 * ry * lid + rx * 1.5 * Math.tan((lidTilt * Math.PI) / 180)}
            y2={cy + gy - ry + 2 * ry * lid - rx * 1.5 * Math.tan((lidTilt * Math.PI) / 180)}
            stroke={stroke}
            strokeWidth={lineW * 0.8}
            strokeLinecap="round"
          />
        ) : null}
      </g>
    );
  }

  const pr = rx * pupil * face.pupil;
  const reachX = Math.max(0, rx - pr) * 0.75;
  const reachY = Math.max(0, ry - pr) * 0.6;
  const px = cx + face.gaze.x * reachX;
  const py = cy + face.gaze.y * reachY;
  const outline = lineW * 0.8;

  return (
    <g>
      <clipPath id={clipId}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={SCLERA} />
      <g clipPath={`url(#${clipId})`}>
        {p.shape === "teary" ? (
          <ellipse cx={cx} cy={cy + ry * 0.95} rx={rx * 1.1} ry={ry * 0.45} fill={WATER} />
        ) : null}
        <circle cx={px} cy={py} r={pr} fill={stroke} />
        <circle cx={px + pr * 0.35} cy={py - pr * 0.4} r={pr * 0.3} fill={SCLERA} />
        {p.shape === "teary" ? (
          <circle cx={px - pr * 0.35} cy={py + pr * 0.35} r={pr * 0.16} fill={SCLERA} />
        ) : null}
        {lid > 0.02 ? (
          <polygon points={lidPolygon(cx, cy, rx, ry, lid, lidTilt, "top")} fill={p.skin} stroke={stroke} strokeWidth={outline} />
        ) : null}
        {face.lower > 0.02 ? (
          <polygon points={lidPolygon(cx, cy, rx, ry, face.lower * 0.55, -lidTilt, "bottom")} fill={p.skin} stroke={stroke} strokeWidth={outline} />
        ) : null}
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth={outline} />
    </g>
  );
};
