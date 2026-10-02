import React from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { z } from "zod";
import {
  compileFigures,
  CreditLine,
  EquationCacheSchema,
  evalActor,
  FigureCueSchema,
  FigureSchema,
  Stage,
  type Diagnostic,
  type Typeset,
} from "../../engine";
import { images, library, safeArea, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import { Label } from "./Label";
import { PAGE_FRAMES, PAGES } from "./vizPages";

export const vizLabSchema = z.object({
  showLabels: z.boolean(),
  /** Set override for every page (a dark ground: `void-1`). */
  set: z.string().optional(),
  /** Cast standing under the figures, for scale. */
  cast: z.array(z.string()).default(["milo", "june"]),
  equations: z.custom<Record<string, Typeset>>().optional(),
});
type Props = z.infer<typeof vizLabSchema>;

export const VIZ_LAB_FRAMES = PAGE_FRAMES * PAGES.length;

/** Typeset equations come from `pnpm viz:lab` (`public/qa/viz-lab-equations.json`). */
export const calculateVizLabMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
  const res = await fetch(staticFile("qa/viz-lab-equations.json"));
  const equations = res.ok ? EquationCacheSchema.parse(await res.json()).equations : {};
  return { props: { ...props, equations } };
};

/** Every v1 figure primitive with its cues, under the cast, page by page. Watch it as video. */
export const VizLab: React.FC<Props> = ({ showLabels, set: setOverride, cast, equations }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const index = Math.min(PAGES.length - 1, Math.floor(frame / PAGE_FRAMES));
  const page = PAGES[index]!;
  const local = frame - index * PAGE_FRAMES;
  const set = sets[setOverride ?? "plain-1"] ?? sets["plain-1"]!;
  const diags: Diagnostic[] = [];
  const { tracks, credits } = compileFigures({
    figures: page.figures.map((f) => FigureSchema.parse(f)),
    cues: page.cues.map((c, i) => ({
      cue: FigureCueSchema.parse(c.cue),
      frame: c.at,
      path: `cues[${i}]`,
    })),
    fps,
    width,
    height,
    lib: { equations: equations ?? {}, images },
    diags,
    pathOf: (i) => `figures[${i}]`,
  });
  const marks = ["left", "right"];
  const actors = cast.slice(0, 2).map((id, i) => ({
    id,
    x: set.marks[marks[i]!] ?? 0.3 + 0.4 * i,
    facing: (i === 0 ? "right" : "left") as "left" | "right",
    state: evalActor(
      library,
      {
        character: id,
        seed: `${id}-viz`,
        poseKeys: [{ frame: 0, pose: "idle" }],
        expressionKeys: [{ frame: 0, expression: "neutral" }],
      },
      local,
      fps,
      set.figureHeightPx,
    ),
  }));
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <Stage
        set={set}
        actors={actors}
        width={width}
        height={height}
        frame={local}
        fontFamily={TEXT_FONT}
        figures={tracks}
        fps={fps}
      />
      {credits.map((c, i) =>
        local >= c.from && local < c.to ? (
          <CreditLine
            key={i}
            text={c.text}
            width={width}
            height={height}
            safeArea={safeArea}
            fontFamily={TEXT_FONT}
          />
        ) : null,
      )}
      {showLabels ? (
        <Label x={40} y={1660} size={28}>
          {`${index + 1}/${PAGES.length} ${set.id}: ${page.note}${diags.length ? `\n${diags.map((d) => `${d.path}: ${d.message}`).join("\n")}` : ""}`}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
