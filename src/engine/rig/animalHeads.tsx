import React from "react";
import { f2 } from "../lib/math";
import { onHead, type AccessoryDef } from "./accessoryKit";

type Pt = { x: number; y: number };
const pts = (list: Pt[]) => list.map((p) => `${f2(p.x)},${f2(p.y)}`).join(" ");

/**
 * One long ear as sampled outlines, base at the origin pointing up, `sweep` bending the tip
 * back (-x). Returns the outline between two fractions of its length, so the same ear
 * yields the whole ear, its inner and its tip.
 */
const earBand = (len: number, width: number, sweep: number, from: number, to: number, k = 1): Pt[] => {
  const n = 14;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    const hw = width * k * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.55);
    const cx = sweep * len * t * t;
    const y = -t * len;
    left.push({ x: cx - hw, y });
    right.push({ x: cx + hw, y });
  }
  return [...left, ...right.reverse()];
};

const HARE_EAR_INNER = "#f3b7c8";

export const ANIMAL_HEADS: Record<string, AccessoryDef> = {
  "ears-long-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => {
        const ear = (side: number, scaleEar: number) => {
          const w = 0.2 * R * scaleEar;
          const h = 1.4 * R * scaleEar;
          const cx = side * 0.36 * R;
          const baseY = -0.62 * R;
          const top = baseY - h;
          const outer =
            `M ${f2(cx - w)} ${f2(baseY)} ` +
            `Q ${f2(cx - w * 1.05)} ${f2(top + h * 0.2)} ${f2(cx)} ${f2(top)} ` +
            `Q ${f2(cx + w * 1.05)} ${f2(top + h * 0.2)} ${f2(cx + w)} ${f2(baseY)} Z`;
          const inner =
            `M ${f2(cx - w * 0.42)} ${f2(baseY - h * 0.12)} ` +
            `Q ${f2(cx - w * 0.42)} ${f2(top + h * 0.32)} ${f2(cx)} ${f2(top + h * 0.22)} ` +
            `Q ${f2(cx + w * 0.42)} ${f2(top + h * 0.32)} ${f2(cx + w * 0.42)} ${f2(baseY - h * 0.12)} Z`;
          return (
            <g key={side}>
              <path d={outer} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
              <path d={inner} fill={HARE_EAR_INNER} />
            </g>
          );
        };
        return (
          <g>
            {ear(-1, 0.9)}
            {ear(1, 1)}
          </g>
        );
      },
    },
  },
  "ears-hare-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => {
        // Hare, not bunny: longer, swept back, with the black tips a hare's ears have.
        const ear = (deg: number, tilt: number, s: number) => {
          const base = onHead(R, deg, 0.72);
          const len = 1.75 * R * s;
          const w = 0.23 * R * s;
          const sweep = -0.1;
          return (
            <g key={deg} transform={`translate(${f2(base.x)} ${f2(base.y)}) rotate(${f2(tilt)})`}>
              <polygon points={pts(earBand(len, w, sweep, 0, 1))} fill={color} />
              <polygon points={pts(earBand(len, w, sweep, 0.12, 0.72, 0.42))} fill={HARE_EAR_INNER} />
              <polygon points={pts(earBand(len, w, sweep, 0.76, 1))} fill={stroke} />
              <polygon points={pts(earBand(len, w, sweep, 0, 1))} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            </g>
          );
        };
        return (
          <g>
            {ear(-26, -22, 0.92)}
            {ear(4, -8, 1)}
          </g>
        );
      },
    },
  },
  "muzzle-hare-01": {
    slot: "face",
    layers: {
      // Under the face: cheek puffs sit behind the mouth; nose and whiskers frame it.
      front: ({ R, stroke, sw, color, character }) => {
        const fx = character.face.offsetX * R;
        const my = character.face.mouthY * R;
        const cy = my - 0.07 * R;
        const ny = my - 0.25 * R;
        const nx = fx + 0.03 * R;
        const nose =
          `M ${f2(nx - 0.11 * R)} ${f2(ny - 0.04 * R)} ` +
          `Q ${f2(nx)} ${f2(ny - 0.1 * R)} ${f2(nx + 0.11 * R)} ${f2(ny - 0.04 * R)} ` +
          `Q ${f2(nx + 0.05 * R)} ${f2(ny + 0.08 * R)} ${f2(nx)} ${f2(ny + 0.08 * R)} ` +
          `Q ${f2(nx - 0.05 * R)} ${f2(ny + 0.08 * R)} ${f2(nx - 0.11 * R)} ${f2(ny - 0.04 * R)} Z`;
        const whisker = (side: 1 | -1, dy: number, reach: number) => {
          const x0 = fx + side * 0.3 * R;
          const y0 = cy + dy * R;
          const x1 = fx + side * reach * R;
          const y1 = y0 + dy * 1.8 * R - 0.04 * R;
          return `M ${f2(x0)} ${f2(y0)} Q ${f2((x0 + x1) / 2)} ${f2(y0 - 0.05 * R)} ${f2(x1)} ${f2(y1)}`;
        };
        return (
          <g>
            <circle cx={fx - 0.15 * R} cy={cy} r={0.25 * R} fill={color} />
            <circle cx={fx + 0.17 * R} cy={cy} r={0.26 * R} fill={color} />
            <path
              d={[whisker(1, -0.04, 1.05), whisker(1, 0.05, 1.0), whisker(-1, -0.04, 0.72), whisker(-1, 0.05, 0.68)].join(" ")}
              fill="none"
              stroke={stroke}
              strokeWidth={sw * 0.3}
              strokeLinecap="round"
            />
            <path d={nose} fill={HARE_EAR_INNER} stroke={stroke} strokeWidth={sw * 0.55} strokeLinejoin="round" />
          </g>
        );
      },
    },
  },
  "snout-turtle-01": {
    slot: "face",
    layers: {
      front: ({ R, stroke, sw, character }) => {
        // A nostril at the tip of the snout, well forward of the eyes.
        const shape = character.style.headShape;
        const tip = (shape ? shape.dx + shape.sx : 1) * R;
        return (
          <circle cx={tip - 0.2 * R} cy={-0.02 * R} r={sw * 0.3} fill={stroke} />
        );
      },
    },
  },
};
