import React, { useId } from "react";
import { f2 } from "../../lib/math";

/**
 * One soft silhouette from several parts: a blur and an alpha threshold (the "gooey" metaball
 * filter) grow a rounded fillet wherever parts meet, so head, body, legs and ears flow into each
 * other like one drawn shape instead of circles laid on top of each other. The parts themselves
 * are painted back on top (`atop`), so their own edges and inner details stay crisp.
 *
 * `r` is the fillet size in figure px. Keep it well under the limb width or thin parts melt.
 */
export const Soft: React.FC<{ r: number; children: React.ReactNode }> = ({ r, children }) => {
  const id = "soft" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <g>
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={f2(r)} result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
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
