import React, { useId } from "react";
import { f2 } from "../../lib/math";

/**
 * One soft silhouette from several parts: a blur of their shapes and an alpha threshold (the
 * "gooey" metaball filter) grow a rounded fillet wherever parts meet, so head, body, legs and ears
 * flow into each other like one drawn shape instead of circles laid on top of each other.
 *
 * The fillet is filled flat in `color` (the body colour) and the parts are painted over it
 * unchanged, so their own edges stay crisp and no blurred mix of colours shows at a seam. The
 * threshold sits just above half alpha, so along a straight edge the fillet stays hidden inside
 * the part; it only shows in the concave corners where parts meet.
 *
 * `r` is the fillet size in figure px. Keep it well under the limb width or thin parts melt.
 */
export const Soft: React.FC<{ r: number; color: string; children: React.ReactNode }> = ({ r, color, children }) => {
  const id = "soft" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <g>
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={f2(r)} result="b" />
          <feColorMatrix in="b" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 30 -16" result="goo" />
          <feFlood floodColor={color} result="c" />
          <feComposite in="c" in2="goo" operator="in" result="fillet" />
          <feMerge>
            <feMergeNode in="fillet" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  );
};

/** A soft contact shadow on the ground under a figure (y = 0 is the ground in figure space). */
export const GroundShadow: React.FC<{ cx: number; rx: number }> = ({ cx, rx }) => (
  <ellipse cx={cx} cy={0} rx={rx} ry={rx * 0.16} fill="#2a1f3a" opacity={0.13} />
);
