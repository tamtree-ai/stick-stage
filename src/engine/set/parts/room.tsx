import React from "react";
import { darken, lighten } from "../../lib/color";
import { randRange } from "../../lib/seed";
import { patternFill } from "../patterns";
import { SET_LINE, type PartComponent } from "./types";

export const Wall: PartComponent = ({ part, palette, W, groundY, fig, prefix }) => {
  const pattern = part.pattern ?? "halftone";
  const base = fig * 0.05;
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.wallA} />
      {pattern !== "none" ? (
        <rect
          width={W}
          height={groundY}
          fill={patternFill(prefix, pattern)}
          mask={pattern === "halftone" ? `url(#${prefix}-fade-mask)` : undefined}
          opacity={pattern === "halftone" ? 0.9 : 0.55}
        />
      ) : null}
      <rect y={groundY - base} width={W} height={base} fill={palette.shade} />
      <line x1={0} x2={W} y1={groundY - base} y2={groundY - base} stroke={darken(palette.shade, 0.1)} strokeWidth={SET_LINE} />
    </g>
  );
};

/** Plain kit backdrop: flat wall with a soft halftone spot behind the stage center. */
export const PlainWall: PartComponent = ({ part, palette, W, groundY, prefix }) => {
  const cx = (part.x ?? 0.5) * W;
  const cy = groundY * 0.55;
  return (
    <g>
      <rect width={W} height={groundY} fill={palette.wallA} />
      <clipPath id={`${prefix}-spot`}>
        <circle cx={cx} cy={cy} r={W * 0.42 * part.size} />
      </clipPath>
      <rect width={W} height={groundY} fill={patternFill(prefix, part.pattern ?? "halftone")} clipPath={`url(#${prefix}-spot)`} opacity={0.7} />
      <circle cx={cx} cy={cy} r={W * 0.3 * part.size} fill={lighten(palette.wallA, 0.35)} />
    </g>
  );
};

export const Floor: PartComponent = ({ palette, W, H, groundY, fig, seed }) => {
  const lines = [0.18, 0.42, 0.75].map((f, i) => groundY + (H - groundY) * (f + randRange(seed, `line${i}`, -0.04, 0.04)));
  return (
    <g>
      <rect y={groundY} width={W} height={H - groundY} fill={palette.floor} />
      <rect y={groundY} width={W} height={fig * 0.018} fill={darken(palette.floor, 0.08)} />
      {lines.map((y, i) => (
        <line key={i} x1={0} x2={W} y1={y} y2={y} stroke={darken(palette.floor, 0.06)} strokeWidth={SET_LINE} />
      ))}
    </g>
  );
};
