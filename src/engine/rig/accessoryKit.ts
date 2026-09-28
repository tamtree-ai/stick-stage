import type React from "react";
import type { Vec2 } from "../lib/math";
import type { Accessory, Character } from "./schema";

/**
 * Where an accessory layer draws. Head layers are head-local: `back` behind the head,
 * `front` over the head but under the face, `eyewear` over the face. Torso layers are
 * figure space: `body` behind the torso, `belly` over it.
 */
export type AccessoryLayer = "back" | "front" | "eyewear" | "body" | "belly";

/** Torso segment in figure space. Only the torso layers use it. */
export type BodyAnchor = { hip: Vec2; neck: Vec2; heightPx: number };

export type AccessoryDraw = (a: {
  R: number;
  stroke: string;
  sw: number;
  color: string;
  character: Character;
  hip?: Vec2;
  neck?: Vec2;
  heightPx?: number;
}) => React.ReactNode;

export type AccessoryDef = { slot: Accessory["slot"]; layers: Partial<Record<AccessoryLayer, AccessoryDraw>> };

/** Arc point on the head circle at angle `deg` (0 = top, + = toward facing). */
export const onHead = (R: number, deg: number, k = 1) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a) * R * k, y: -Math.cos(a) * R * k };
};

/** Torso frame: origin at the hip, rotated so the torso points up (-y), facing +x. */
export const torsoFrame = (hip: Vec2, neck: Vec2) => {
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  return {
    len: Math.hypot(dx, dy) || 1,
    angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
  };
};

/** Bean torso width in px (0 for a line torso). */
export const torsoWidthPx = (c: Character, heightPx: number): number =>
  c.style.torso.style === "bean" ? c.style.torso.width * heightPx : 0;
