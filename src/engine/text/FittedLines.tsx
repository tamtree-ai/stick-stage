import React from "react";
import { screenLines } from "../lib/screenText";

export type FittedLinesProps = {
  text: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  fill: string;
  fontFamily: string;
  /** Counter-flip when a parent group is mirrored, so the words stay readable. */
  mirrored?: boolean;
};

/** Up to three short lines, sized to a rectangle. Frame-pure: the string is the only input. */
export const FittedLines: React.FC<FittedLinesProps> = ({ text, cx, cy, width, height, fill, fontFamily, mirrored }) => {
  const lines = screenLines(text);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const fontSize = Math.max(8, Math.min((height / lines.length) * 0.72, (width * 0.92) / (longest * 0.62)));
  const y0 = cy - ((lines.length - 1) * fontSize) / 2;
  return (
    <g transform={mirrored ? `translate(${cx} ${cy}) scale(-1 1) translate(${-cx} ${-cy})` : undefined}>
      {lines.map((line, i) => (
        <text key={i} x={cx} y={y0 + i * fontSize} textAnchor="middle" dominantBaseline="central" fontFamily={fontFamily} fontWeight={800} fontSize={fontSize} fill={fill}>
          {line}
        </text>
      ))}
    </g>
  );
};
