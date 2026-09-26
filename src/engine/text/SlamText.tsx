import React from "react";
import { easeOutBack } from "../lib/easing";
import { clamp } from "../lib/math";
import { randRange } from "../lib/seed";
import { safeRect, type SafeArea } from "./safeArea";

export type SlamTextProps = {
  text: string;
  frame: number;
  /** Impact frame (text is full size from here). */
  from: number;
  /** Frame it disappears on. */
  to: number;
  width: number;
  height: number;
  safeArea: SafeArea;
  fontFamily: string;
  color?: string;
  /** Vertical center, fraction of frame height. Default sits below the face in every framing. */
  y?: number;
  fontSize?: number;
  seed?: string;
};

const SLAM_FRAMES = 4;
const SHAKE_FRAMES = 6;
const OUT_FRAMES = 3;

/**
 * Full-screen slam text: drops in from 2.3× scale over 4 frames with a small overshoot,
 * shakes on impact, holds, then snaps out.
 */
export const SlamText: React.FC<SlamTextProps> = ({
  text,
  frame,
  from,
  to,
  width,
  height,
  safeArea,
  fontFamily,
  color = "#ffffff",
  y = 0.64,
  fontSize = 190,
  seed = text,
}) => {
  const start = from - SLAM_FRAMES;
  if (frame < start || frame >= to) return null;
  const safe = safeRect(safeArea, width, height);
  const t = frame - start;
  const slam = 2.3 - 1.3 * easeOutBack(t / SLAM_FRAMES, 1.4);
  const out = clamp((to - frame) / OUT_FRAMES, 0, 1);
  const hit = frame - from;
  const amp = hit >= 0 && hit < SHAKE_FRAMES ? 18 * (1 - hit / SHAKE_FRAMES) : 0;
  const dx = amp * randRange(seed, `x${hit}`, -1, 1);
  const dy = amp * randRange(seed, `y${hit}`, -1, 1);
  const opacity = clamp(t / 2, 0, 1) * out;
  return (
    <div
      style={{
        position: "absolute",
        left: safe.x,
        width: safe.w,
        top: y * height,
        transform: `translate(${dx.toFixed(1)}px, calc(-50% + ${dy.toFixed(1)}px)) rotate(-4deg) scale(${(slam * (0.7 + 0.3 * out)).toFixed(3)})`,
        opacity,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        color,
        WebkitTextStroke: `${Math.round(fontSize * 0.13)}px #111114`,
        paintOrder: "stroke fill",
        textShadow: `0 ${Math.round(fontSize * 0.07)}px 0 #111114`,
        letterSpacing: "-0.01em",
      }}
    >
      {text}
    </div>
  );
};
