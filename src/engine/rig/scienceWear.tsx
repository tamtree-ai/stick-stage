/** Accessories for the science cast: a lab coat, wild upswept hair, rectangular glasses, a flat cap. */
import React from "react";
import { darken } from "../lib/color";
import { f2 } from "../lib/math";
import { onHead, torsoFrame, torsoWidthPx, type AccessoryDef } from "./accessoryKit";

const pts = (xs: [number, number][]) => xs.map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");

export const SCIENCE_WEAR: Record<string, AccessoryDef> = {
  /** A long open lab coat: the back panel behind the torso, the front panels over its sides. */
  "labcoat-01": {
    slot: "body",
    layers: {
      body: ({ stroke, sw, color, character, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const { len: T, angle } = torsoFrame(hip, neck);
        const w = Math.max(torsoWidthPx(character, H), H * 0.1);
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <polygon points={pts([[-w * 0.6, -T * 0.96], [w * 0.6, -T * 0.96], [w * 0.8, T * 0.42], [-w * 0.8, T * 0.42]])} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          </g>
        );
      },
      belly: ({ stroke, sw, color, character, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const { len: T, angle } = torsoFrame(hip, neck);
        const w = Math.max(torsoWidthPx(character, H), H * 0.1);
        const side = (s: 1 | -1) => pts([[s * w * 0.6, -T * 0.96], [s * w * 0.14, -T * 0.58], [s * w * 0.14, T * 0.42], [s * w * 0.8, T * 0.42]]);
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <polygon points={side(-1)} fill={color} stroke={stroke} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <polygon points={side(1)} fill={color} stroke={stroke} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <rect x={w * 0.3} y={-T * 0.2} width={w * 0.34} height={T * 0.16} rx={sw * 0.3} fill="none" stroke={darken(color, 0.3)} strokeWidth={sw * 0.45} />
          </g>
        );
      },
    },
  },
  /** Wild, upswept hair: tall uneven tufts over the crown. */
  "wild-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => {
        const out: string[] = [];
        const n = 9;
        for (let i = 0; i <= n; i++) {
          const deg = -110 + (200 * i) / n;
          const base = onHead(R, deg, 0.92);
          out.push(`${f2(base.x)},${f2(base.y)}`);
          if (i < n) {
            const tip = onHead(R, deg + 200 / n / 2 + 6, 1.42 + ((i * 7) % 3) * 0.1);
            out.push(`${f2(tip.x)},${f2(tip.y)}`);
          }
        }
        return <polygon points={out.join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      },
    },
  },
  /** Small rectangular glasses. */
  "glasses-rect": {
    slot: "eyewear",
    layers: {
      eyewear: ({ R, stroke, sw, character }) => {
        const f = character.face;
        const fx = f.offsetX * R;
        const ey = f.eyeY * R;
        const dx = (f.eyeSpacing / 2) * R;
        const w = 0.42 * R;
        const h = 0.3 * R;
        return (
          <g fill="none" stroke={stroke} strokeWidth={sw * 0.6} strokeLinejoin="round">
            <rect x={fx - dx - w / 2} y={ey - h / 2} width={w * 0.94} height={h} rx={R * 0.05} />
            <rect x={fx + dx - w / 2} y={ey - h / 2} width={w} height={h} rx={R * 0.05} />
            <line x1={fx - dx + w * 0.44} x2={fx + dx - w / 2} y1={ey - h * 0.15} y2={ey - h * 0.15} />
          </g>
        );
      },
    },
  },
  /** A flat cap with a short brim toward the facing side. */
  "flatcap-01": {
    slot: "headwear",
    layers: {
      front: ({ R, stroke, sw, color }) => {
        const a = onHead(R, -100, 1.02);
        const b = onHead(R, 72, 1.02);
        const d = `M ${f2(a.x)} ${f2(a.y)} A ${f2(R * 1.02)} ${f2(R * 1.02)} 0 0 1 ${f2(b.x)} ${f2(b.y)} Q ${f2(R * 1.35)} ${f2(-R * 0.25)} ${f2(R * 1.25)} ${f2(-R * 0.36)} Q ${f2(R * 0.2)} ${f2(-R * 0.62)} ${f2(a.x)} ${f2(a.y)} Z`;
        return (
          <g>
            <path d={`M ${f2(a.x)} ${f2(a.y)} Q ${f2(-R * 0.1)} ${f2(-R * 1.42)} ${f2(R * 0.85)} ${f2(-R * 0.82)}`} fill={color} stroke={stroke} strokeWidth={sw} />
            <path d={d} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          </g>
        );
      },
    },
  },
};
