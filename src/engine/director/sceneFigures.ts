/** Scene glue for figures: cue frames, the driver's gesture, gaze targets and framing. */
import { clampCamera } from "../shots/framing";
import type { Rect } from "../text/safeArea";
import { figureAnchor } from "../viz/geometry";
import { compileFigures, figureLookTarget, type CreditEvent, type FigureLib, type TimedCue } from "../viz/compile";
import { evalFigure, type FigureTrack } from "../viz/track";
import type { Diagnostic } from "./diagnostics";
import { anchorFrame, msToFrame, type Layout } from "./layout";
import type { Beat, Skit } from "./schema";
import type { FocusKey } from "./timeline";

/** A cue with `by`: the driver holds the thing out on the cue (the die is rolled, the ball let go). */
export const withDriverGestures = (b: Beat): Beat => {
  const extra = b.figures.flatMap((c) => ("by" in c && c.by ? [{ do: "pose" as const, who: c.by, pose: "hold-out", at: c.at }] : []));
  return extra.length ? { ...b, actions: [...b.actions, ...extra] } : b;
};

export type SceneFigures = {
  tracks: FigureTrack[];
  credits: CreditEvent[];
  focus: FocusKey[];
  figureAt: (ref: string) => { x: number; y: number } | undefined;
  keepInFrame: (from: number, to: number) => Rect[];
};

export const sceneFigures = (skit: Skit, layout: Layout, lib: FigureLib, diags: Diagnostic[]): SceneFigures => {
  const { fps, width, height } = skit.meta;
  const cues: TimedCue[] = [];
  for (const b of layout.beats) {
    if (b.synthetic) continue;
    const where = b.path.join(".").replace(/\.(\d+)/g, "[$1]");
    b.beat.figures.forEach((cue, j) => {
      const path = `${where}.figures[${j}]`;
      const frame = anchorFrame(b, cue.at, `${path}.at`, fps, diags);
      if (frame !== undefined) cues.push({ cue, frame, path });
    });
  }
  const { tracks, credits } = compileFigures({ figures: skit.figures ?? [], cues, fps, width, height, lib, diags, data: skit.datasets, pathOf: (i) => `figures[${i}]` });
  return {
    tracks,
    credits,
    focus: focusKeys(cues, tracks, fps, width, height, diags),
    figureAt: (ref) => figureLookTarget(tracks, ref, width, height),
    keepInFrame: (from, to) => {
      const mid = Math.round((from + to) / 2);
      return tracks.filter((t) => [from, mid, Math.max(from, to - 1)].some((f) => evalFigure(t, f, fps).visible)).map((t) => t.rect);
    },
  };
};

/** Beats where a figure changes: the director goes wide so the diagram has the frame. */
export const figureBeat = (b: Beat): boolean => b.role === "demo" || b.figures.some((c) => c.do === "show" || c.do === "state");

const FOCUS_MS = 900;

/** Focus cues → camera keys: the figure (or its anchor) centred, zoomed to fill the frame. */
const focusKeys = (cues: readonly TimedCue[], tracks: readonly FigureTrack[], fps: number, width: number, height: number, diags: Diagnostic[]): FocusKey[] =>
  cues
    .flatMap(({ cue, frame, path }): FocusKey[] => {
      if (cue.do !== "focus") return [];
      const durationFrames = msToFrame(cue.durationMs ?? FOCUS_MS, fps);
      if (cue.id === "none") return [{ frame: Math.max(0, frame), durationFrames }];
      const t = tracks.find((x) => x.id === cue.id);
      if (!t) return [];
      const pt = figureAnchor(t, cue.part, width / 1080);
      if (!pt) {
        diags.push({ level: "error", code: "figure-anchor", path: `${path}.part`, message: `"${cue.id}" has no anchor "${cue.part}"`, expected: "center, top, bottom, left, right, or a kind's own anchor" });
        return [];
      }
      const fill = Math.min(width / (t.rect.w * 1.15), height / (t.rect.h * 1.15));
      const scale = cue.zoom ?? Math.min(3, Math.max(1.15, cue.part ? fill * 1.6 : fill));
      return [{ frame: Math.max(0, frame), durationFrames, camera: clampCamera({ scale, cx: pt.x, cy: pt.y }, width, height) }];
    })
    .sort((a, b) => a.frame - b.frame);
