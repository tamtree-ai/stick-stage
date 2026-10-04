import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Actor, evalActor, SetLayers } from "../../engine";
import { EXTRA_POSE_IDS, POSE_IDS, sets } from "../../data";
import { buildProp, labLibrary } from "./build";

export const poseLabSchema = z.object({
  character: z.string(),
  expression: z.string(),
  build: buildProp,
  /** Only these poses (default: all), in a grid of `cols` columns. */
  poses: z.array(z.string()).optional(),
  cols: z.number().int().min(1).max(6).optional(),
});

const ALL_POSES = [...POSE_IDS, ...EXTRA_POSE_IDS];

/** Static grid of every pose for one character — the quickest way to tune pose numbers. */
export const PoseLab: React.FC<z.infer<typeof poseLabSchema>> = ({ character, expression, build, poses = ALL_POSES, cols: COLS = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ROWS = Math.ceil(poses.length / COLS);
  const W = 1080;
  const H = 1920;
  const cellW = W / COLS;
  const cellH = H / ROWS;
  const set = sets["plain-1"]!;
  const fig = 760;
  // Toon figures carry hair and shoes beyond the stick outline: a little smaller to fit the cells.
  const s = (build === "toon" ? 0.4 : 0.46) * Math.min(cellW / 270, cellH / 384);
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <g opacity={0.6}>
          <SetLayers set={set} width={W} height={H} layer="background" />
        </g>
        {poses.map((pose, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const state = evalActor(
            labLibrary(build),
            { character, poseKeys: [{ frame: 0, pose }], expressionKeys: [{ frame: 0, expression }], idle: 0 },
            frame,
            fps,
            fig,
          );
          const gx = col * cellW + cellW / 2;
          const gy = row * cellH + cellH * 0.9;
          return (
            <g key={pose}>
              <line x1={col * cellW + 20} x2={(col + 1) * cellW - 20} y1={gy} y2={gy} stroke="#9aa" strokeWidth={2} />
              <g transform={`translate(${gx} ${gy}) scale(${s})`}>
                <Actor state={state} x={0} groundY={0} facing="right" frame={frame} />
              </g>
              <text x={col * cellW + 16} y={row * cellH + 40} fontFamily="Menlo, monospace" fontSize={24} fontWeight={700} fill="#1b1b1f">
                {pose}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
