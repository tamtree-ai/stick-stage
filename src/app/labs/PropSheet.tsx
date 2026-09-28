import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { library } from "../../data";
import { Actor, evalActor } from "../../engine";
import { TEXT_FONT } from "../fonts";

export const propSheetSchema = z.object({
  ids: z.array(z.string()).default([]),
  /** Width of one view (held right, held left, dropped). */
  panel: z.number().default(540),
});

export const propSheetRow = (panel: number) => Math.round(panel * 0.72);

const view = (id: string, panel: number, rowH: number, facing: "left" | "right", dropped: boolean) => {
  const figure = rowH * 0.62;
  const state = evalActor(
    library,
    {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "idle" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      propKeys: dropped
        ? [
            { frame: 0, hand: "R" as const, prop: id },
            { frame: 2, hand: "R" as const, prop: null, drop: true },
          ]
        : [{ frame: 0, hand: "R" as const, prop: id }],
    },
    dropped ? 50 : 10,
    30,
    figure,
  );
  return (
    <svg width={panel} height={rowH} viewBox={`0 0 ${panel} ${rowH}`}>
      <rect width={panel} height={rowH} fill="#f6f3ec" />
      <Actor state={state} x={panel / 2} groundY={rowH * 0.86} facing={facing} frame={dropped ? 50 : 10} fontFamily={TEXT_FONT} />
    </svg>
  );
};

/** One row per prop: Milo facing right, facing left, and the prop dropped. */
export const PropSheet: React.FC<z.infer<typeof propSheetSchema>> = ({ ids, panel }) => {
  const rowH = propSheetRow(panel);
  return (
    <AbsoluteFill style={{ background: "#e7e2d6" }}>
      {ids.map((id, i) => (
        <div key={id} style={{ position: "absolute", top: i * rowH, left: 0, display: "flex", width: panel * 3, height: rowH }}>
          {view(id, panel, rowH, "right", false)}
          {view(id, panel, rowH, "left", false)}
          {view(id, panel, rowH, "right", true)}
          <div style={{ position: "absolute", left: 12, top: 8, fontFamily: TEXT_FONT, fontSize: Math.max(14, panel * 0.04), fontWeight: 700 }}>{library.props[id]?.name ?? id}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
