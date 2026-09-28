import React from "react";
import { darken, mix } from "../lib/color";
import { f2 } from "../lib/math";
import { torsoFrame, torsoWidthPx, type AccessoryDef } from "./accessoryKit";
import { ANIMAL_HEADS } from "./animalHeads";

/** Shell geometry in the torso frame (hip at origin, torso up -y, facing +x). */
const shellShape = (T: number, H: number) => ({
  cx: -0.06 * H,
  cy: -T * 0.62,
  A: 0.17 * H,
  B: T * 0.5 + 0.1 * H,
});

export const ANIMAL_BODY: Record<string, AccessoryDef> = {
  "shell-01": {
    slot: "body",
    layers: {
      // A domed carapace on the back: pale rim of marginal scutes, a ring of costal scutes
      // and a central vertebral scute. It bulges behind the body and shows as a lip in front.
      body: ({ stroke, sw, color, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const { len: T, angle } = torsoFrame(hip, neck);
        const { cx, cy, A, B } = shellShape(T, H);
        const on = (deg: number, k: number) => {
          const a = (deg * Math.PI) / 180;
          return { x: cx + Math.cos(a) * A * k, y: cy + Math.sin(a) * B * k };
        };
        const seg = (deg: number, k0: number, k1: number) => {
          const p = on(deg, k0);
          const q = on(deg, k1);
          return `M ${f2(p.x)} ${f2(p.y)} L ${f2(q.x)} ${f2(q.y)}`;
        };
        const rim = mix(color, "#d8c47a", 0.45);
        const RIM = 0.8;
        const CORE = 0.44;
        const HEX = [150, 210, 270, 330, 30, 90];
        const spokes = HEX.map((d) => seg(d, CORE, RIM));
        const hex = HEX.map((d) => on(d, CORE)).map((p) => `${f2(p.x)},${f2(p.y)}`).join(" ");
        const ticks = Array.from({ length: 16 }, (_, i) => seg(i * 22.5 + 11, RIM, 1));
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <ellipse cx={cx} cy={cy} rx={A} ry={B} fill={rim} stroke={stroke} strokeWidth={sw} />
            <ellipse cx={cx} cy={cy} rx={A * RIM} ry={B * RIM} fill={color} />
            <polygon points={hex} fill={mix(color, "#ffffff", 0.14)} />
            <g fill="none" stroke={stroke} strokeWidth={sw * 0.5} strokeLinecap="round">
              <ellipse cx={cx} cy={cy} rx={A * RIM} ry={B * RIM} />
              <polygon points={hex} strokeLinejoin="round" />
              <path d={[...spokes, ...ticks].join(" ")} />
            </g>
            <ellipse cx={cx} cy={cy} rx={A} ry={B} fill="none" stroke={stroke} strokeWidth={sw} />
          </g>
        );
      },
      // The plastron is the bean torso itself; draw its seams over it.
      belly: ({ stroke, sw, character, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const w = torsoWidthPx(character, H);
        if (!w) return null;
        const { len: T, angle } = torsoFrame(hip, neck);
        const seam = (y: number) =>
          `M ${f2(-w * 0.34)} ${f2(y)} Q ${f2(0)} ${f2(y + T * 0.06)} ${f2(w * 0.34)} ${f2(y)}`;
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <path
              d={[seam(-T * 0.72), seam(-T * 0.44), seam(-T * 0.16), `M 0 ${f2(-T * 0.88)} L 0 ${f2(-T * 0.02)}`].join(" ")}
              fill="none"
              stroke={darken(character.style.torso.style === "bean" ? character.style.torso.fill : stroke, 0.45)}
              strokeWidth={sw * 0.4}
              strokeLinecap="round"
            />
          </g>
        );
      },
    },
  },
  "tail-puff-01": {
    slot: "body",
    layers: {
      body: ({ stroke, sw, color, character, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const { angle } = torsoFrame(hip, neck);
        const r = H * 0.038;
        const w = torsoWidthPx(character, H);
        // On a bean torso the puff tucks against the lower back; on a line torso it floats off the hip.
        const x = w ? -(w / 2 + r * 0.45) : -H * 0.075;
        const y = w ? -H * 0.015 : H * 0.02;
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <circle cx={x} cy={y} r={r} fill={color} stroke={stroke} strokeWidth={sw * 0.65} />
          </g>
        );
      },
    },
  },
  "belly-01": {
    slot: "body",
    layers: {
      // A pale fur patch on the front of a bean torso.
      belly: ({ color, character, hip, neck, heightPx: H }) => {
        if (!hip || !neck || H == null) return null;
        const w = torsoWidthPx(character, H);
        if (!w) return null;
        const { len: T, angle } = torsoFrame(hip, neck);
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <ellipse cx={w * 0.14} cy={-T * 0.46} rx={w * 0.26} ry={T * 0.36} fill={color} />
          </g>
        );
      },
    },
  },
};

export const ANIMAL_PARTS: Record<string, AccessoryDef> = { ...ANIMAL_HEADS, ...ANIMAL_BODY };
