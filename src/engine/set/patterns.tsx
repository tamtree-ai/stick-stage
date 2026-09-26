import React from "react";
import type { Palette } from "./palettes";

/** Shared pattern library; ids are prefixed per set instance to stay unique. */
export const PatternDefs: React.FC<{ prefix: string; palette: Palette; width: number; height: number }> = ({
  prefix,
  palette,
  width,
  height,
}) => (
  <defs>
    <pattern id={`${prefix}-halftone`} width={22} height={22} patternUnits="userSpaceOnUse">
      <circle cx={5.5} cy={5.5} r={3.4} fill={palette.wallB} />
      <circle cx={16.5} cy={16.5} r={3.4} fill={palette.wallB} />
    </pattern>
    <linearGradient id={`${prefix}-fade`} x1={0} y1={0} x2={0} y2={1}>
      <stop offset="0" stopColor="#fff" stopOpacity={1} />
      <stop offset="0.55" stopColor="#fff" stopOpacity={0} />
    </linearGradient>
    <mask id={`${prefix}-fade-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
      <rect width={width} height={height} fill={`url(#${prefix}-fade)`} />
    </mask>
    <pattern id={`${prefix}-stripes`} width={72} height={10} patternUnits="userSpaceOnUse">
      <rect width={30} height={10} fill={palette.wallB} />
    </pattern>
    <pattern id={`${prefix}-dots`} width={46} height={46} patternUnits="userSpaceOnUse">
      <circle cx={12} cy={12} r={4.5} fill={palette.wallB} />
      <circle cx={35} cy={35} r={4.5} fill={palette.wallB} />
    </pattern>
  </defs>
);

export const patternFill = (prefix: string, pattern: string) => `url(#${prefix}-${pattern})`;
