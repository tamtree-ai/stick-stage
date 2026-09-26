import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";
import { safeRect } from "../../engine";
import { safeArea, safeAreaProfiles } from "../../data";
import { TEXT_FONT } from "../fonts";

export const safeAreaLabSchema = z.object({
  /** A platform screenshot under public/ (e.g. "safe-area/tiktok.png"), scaled to 1080×1920. Optional. */
  screenshot: z.string().optional(),
  /** Which profile to outline strongly (the others are faint). */
  platform: z.string().optional(),
});

const COLORS = ["#ff2d7a", "#00c2ff", "#ffb000", "#7bd34f"];

/**
 * Safe-area check: a real platform screenshot (feed UI visible) under the measured profiles and
 * the effective (strictest) safe area. Where the UI crosses a dashed line, measure and update
 * src/data/safe-area-profiles.json, then `pnpm safearea`.
 */
export const SafeAreaLab: React.FC<z.infer<typeof safeAreaLabSchema>> = ({ screenshot, platform }) => {
  const W = 1080;
  const H = 1920;
  const eff = safeRect(safeArea, W, H);
  return (
    <AbsoluteFill style={{ background: "#2a2a30", fontFamily: TEXT_FONT }}>
      {screenshot ? <Img src={staticFile(screenshot)} style={{ width: W, height: H, objectFit: "cover" }} /> : null}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {Object.entries(safeAreaProfiles.platforms).map(([id, p], i) => {
          const r = safeRect({ schemaVersion: 1, ...p }, W, H);
          const strong = !platform || platform === id;
          return (
            <g key={id} opacity={strong ? 1 : 0.35}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={5} strokeDasharray="22 12" />
              <text x={r.x + 12} y={r.y + 40 + i * 40} fill={COLORS[i % COLORS.length]} fontSize={34} fontWeight={800}>
                {id}
                {p.verified ? "" : " (unverified)"}
              </text>
            </g>
          );
        })}
        <rect x={eff.x} y={eff.y} width={eff.w} height={eff.h} fill="none" stroke="#ffffff" strokeWidth={3} />
      </svg>
    </AbsoluteFill>
  );
};
