import React, { useContext, useId } from "react";
import { f2 } from "../lib/math";
import { FINISHES, type Finish } from "./finishKinds";

export { FINISHES, type Finish };

/*
 * The opt-in "illustrated" finish ("flat" draws nothing extra): a cel shadow and a light edge on
 * each figure worked out from its own colours, a printed ink line that is heavier away from the
 * light, and paper, grain and a vignette over the frame. Light comes from the upper left.
 */

/** Shadows lean violet, lights lean warm, like the shape palette ramps. */
const SHADOW_HUE = [0.165, 0.137, 0.314] as const;
const LIGHT_HUE = [1, 0.945, 0.812] as const;
const INK = "#2a2235";

/** A colour matrix that mixes every pixel `t` of the way toward `to`, keeping alpha. */
const toward = (to: readonly [number, number, number], t: number) =>
  [0, 1, 2].map((i) => [0, 1, 2].map((k) => (k === i ? f2(1 - t) : "0")).join(" ") + ` 0 ${f2(to[i]! * t)}`).join("  ") + "  0 0 0 1 0";

/** What a rig reads to shade its own parts. `unit` is stage px per 640 px of figure height. */
export type FinishInfo = { kind: Finish; unit: number };
export const FinishContext = React.createContext<FinishInfo>({ kind: "flat", unit: 1 });
export const useFinish = (): FinishInfo => useContext(FinishContext);

/**
 * The cel filter body: the shadow strip is the shape minus itself nudged toward the light, the
 * light edge is the shape minus itself nudged away; both are the shape's own colours tinted, so
 * the filter works on any figure without knowing its palette. `sx` flips the light for a figure
 * drawn mirrored.
 */
const CelPrimitives: React.FC<{ unit: number; sx: number; k?: number; result?: string }> = ({ unit, sx, k = 1, result }) => {
  const dx = 9 * unit * k * sx;
  const dy = 12 * unit * k;
  const r = 4 * unit * k;
  return (
    <>
      <feOffset in="SourceAlpha" dx={f2(-dx)} dy={f2(-dy)} result="toLight" />
      <feComposite in="SourceAlpha" in2="toLight" operator="out" result="shadowSide" />
      <feColorMatrix in="SourceGraphic" type="matrix" values={toward(SHADOW_HUE, 0.3)} result="dark" />
      <feComposite in="dark" in2="shadowSide" operator="in" result="shadow" />
      <feOffset in="SourceAlpha" dx={f2(r * sx)} dy={f2(r)} result="away" />
      <feComposite in="SourceAlpha" in2="away" operator="out" result="lightSide" />
      <feColorMatrix in="SourceGraphic" type="matrix" values={toward(LIGHT_HUE, 0.3)} result="lite" />
      <feComposite in="lite" in2="lightSide" operator="in" result="light" />
      <feMerge result={result}>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="shadow" />
        <feMergeNode in="light" />
      </feMerge>
    </>
  );
};

/**
 * Shades one part of a figure (a near arm, the head) so it separates from the body behind it.
 * Draws its children unchanged under the flat finish.
 */
export const CelPart: React.FC<{ mirrored?: boolean; k?: number; children: React.ReactNode }> = ({ mirrored = false, k = 0.8, children }) => {
  const fin = useFinish();
  const id = "cel" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (fin.kind === "flat") return <>{children}</>;
  return (
    <g>
      <defs>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <CelPrimitives unit={fin.unit} sx={mirrored ? -1 : 1} k={k} />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  );
};

/** Unit directions the ink line is pushed out in. */
const LINE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]] as const;

/**
 * One figure's finish, in stage space (outside the actor's mirror, so the light is the same for
 * everyone): the cel shade over the whole silhouette, then an ink line, thin toward the light and
 * heavier away from it.
 */
export const FigureFinishFilter: React.FC<{ id: string; unit: number }> = ({ id, unit }) => (
  <defs>
    <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
      <CelPrimitives unit={unit} sx={1} k={1.2} result="celled" />
      {/* The line is the silhouette nudged out in eight directions (cheap offsets; dilate is slow in Chrome), longer away from the light. */}
      {LINE_DIRS.map(([x, y], i) => {
        const away = x + y > 0 ? 2.2 : 1;
        return <feOffset key={i} in="SourceAlpha" dx={f2(x * 1.8 * away * unit)} dy={f2(y * 1.8 * away * unit)} result={`o${i}`} />;
      })}
      <feMerge result="lineShape">
        {LINE_DIRS.map((_, i) => (
          <feMergeNode key={i} in={`o${i}`} />
        ))}
      </feMerge>
      <feFlood floodColor={INK} />
      <feComposite in2="lineShape" operator="in" result="line" />
      <feMerge>
        <feMergeNode in="line" />
        <feMergeNode in="celled" />
      </feMerge>
    </filter>
  </defs>
);

/** Noise → specks: `dark` keeps the low half as ink-coloured alpha, light keeps the high half as white, so the pair averages out and never washes the frame. */
const speck = (dark: boolean, k: number) =>
  dark ? `0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0 0.3  ${-k} 0 0 0 ${f2(k * 0.5)}` : `0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  ${k} 0 0 0 ${f2(-k * 0.5)}`;

/** Noise filter: grain (fine) or paper (broad mottling), as dark or light specks. */
const Noise: React.FC<{ id: string; freq: string; octaves: number; seed: number; dark: boolean; k: number }> = ({ id, freq, octaves, seed, dark, k }) => (
  <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={octaves} seed={seed} stitchTiles="stitch" />
    <feColorMatrix type="matrix" values={speck(dark, k)} />
  </filter>
);

/**
 * The stage light, over the set and under the cast: a warm glow from the upper left (where the
 * cel shading says the light is) and a cool fall-off toward the ground.
 */
export const FinishLight: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`glow${uid}`} cx="0.12" cy="0.05" r="0.85">
          <stop offset="0" stopColor="#fff1cf" stopOpacity={0.38} />
          <stop offset="0.45" stopColor="#f9c74f" stopOpacity={0.14} />
          <stop offset="1" stopColor="#f9c74f" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`fall${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#2a2350" stopOpacity={0} />
          <stop offset="1" stopColor="#2a2350" stopOpacity={0.16} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#glow${uid})`} />
      <rect width={width} height={height} fill={`url(#fall${uid})`} />
    </g>
  );
};

/**
 * Paper, grain and a vignette over the whole frame (screen space, after the camera). The noise is
 * seeded and static, so every frame is the same pure function of its inputs.
 */
export const FinishOverlay: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scale = Math.min(width, height) / 1080;
  const grain = f2(0.85 / scale);
  const paper = `${f2(0.009 / scale)} ${f2(0.016 / scale)}`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`vig${uid}`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.62" stopColor="#2a2350" stopOpacity={0} />
          <stop offset="1" stopColor="#2a2350" stopOpacity={0.24} />
        </radialGradient>
        <Noise id={`gd${uid}`} freq={grain} octaves={2} seed={7} dark k={0.36} />
        <Noise id={`gl${uid}`} freq={grain} octaves={2} seed={7} dark={false} k={0.3} />
        <Noise id={`pd${uid}`} freq={paper} octaves={3} seed={3} dark k={0.1} />
        <Noise id={`pl${uid}`} freq={paper} octaves={3} seed={3} dark={false} k={0.08} />
      </defs>
      <rect width={width} height={height} filter={`url(#pd${uid})`} />
      <rect width={width} height={height} filter={`url(#pl${uid})`} />
      <rect width={width} height={height} filter={`url(#gd${uid})`} />
      <rect width={width} height={height} filter={`url(#gl${uid})`} />
      <rect width={width} height={height} fill={`url(#vig${uid})`} />
    </g>
  );
};
