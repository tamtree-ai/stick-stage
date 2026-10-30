/**
 * Scene figures + timed cues → `FigureTrack`s. Merges states and cues, checks each result against
 * its kind's params, resolves callout targets, typeset equations and image files.
 */
import { bindData, creditOf, type Datasets } from "../director/data";
import type { Diagnostic } from "../director/diagnostics";
import { msToFrame } from "../director/layout";
import { creditLine, type ImageDef } from "./images";
import { resolveMapViews } from "./map";
import { slotRect } from "./slots";
import { figureAnchor, figureUnit } from "./geometry";
import { FIGURE_PARAMS, type FigureKind } from "./params";
import type { Figure, FigureCue, Reveal } from "./schema";
import { mergeParams, type FigureKey, type FigureTrack, type Params } from "./track";
import type { Typeset } from "./typeset";

export type FigureLib = {
  /** TeX → typeset SVG (from prep's `generated/equations.json`). */
  equations?: Readonly<Record<string, Typeset>>;
  images?: Readonly<Record<string, ImageDef>>;
};

/** A cue with its resolved frame and JSON path. */
export type TimedCue = { cue: FigureCue; frame: number; path: string };

export type CreditEvent = { text: string; from: number; to: number };

const REVEAL_MS: Record<Reveal, number> = { draw: 900, fade: 400, pop: 350, none: 0 };
const DEFAULT_TWEEN_MS = 700;

const splitLabel = (patch: Params): { label?: string; params: Params } => {
  const { label, ...params } = patch;
  return { label: typeof label === "string" ? label : undefined, params };
};

const issuesToDiags = (
  issues: { path: PropertyKey[]; message: string }[],
  at: string,
): Diagnostic[] =>
  issues.map((i) => ({
    level: "error",
    code: "figure-params",
    path: [at, ...i.path.map(String)].join(".").replace(/\.(\d+)/g, "[$1]"),
    message: i.message,
  }));

export const compileFigures = (args: {
  figures: readonly Figure[];
  cues: readonly TimedCue[];
  fps: number;
  width: number;
  height: number;
  lib: FigureLib;
  diags: Diagnostic[];
  /** The skit's datasets, for `"@id.column"` params. */
  data?: Datasets;
  /** JSON path of figure i ("figures[0]" or "scenes[1].figures[0]"). */
  pathOf: (i: number) => string;
}): { tracks: FigureTrack[]; credits: CreditEvent[] } => {
  const { fps, width, height, lib, diags } = args;
  const tracks: FigureTrack[] = [];
  const ids = args.figures.map((f) => f.id);
  ids.forEach(
    (id, i) =>
      ids.indexOf(id) !== i &&
      diags.push({
        level: "error",
        code: "duplicate-id",
        path: `${args.pathOf(i)}.id`,
        message: `duplicate figure id "${id}"`,
      }),
  );
  const checkParams = (kind: string, raw: Params, at: string): Params | undefined => {
    const r = FIGURE_PARAMS[kind as FigureKind].safeParse(raw);
    if (r.success) return r.data as Params;
    diags.push(...issuesToDiags(r.error.issues, at));
    return undefined;
  };

  args.figures.forEach((figIn, i) => {
    const at = args.pathOf(i);
    // Data references become numbers first, so states, cues and the param check see plain values.
    const used = new Set<string>();
    const bind = (p: Params, where: string) => bindData(p, args.data, where, diags, used);
    const fig = {
      ...figIn,
      params: bind(figIn.params, `${at}.params`),
      states: figIn.states && Object.fromEntries(Object.entries(figIn.states).map(([k, v]) => [k, bind(v, `${at}.states.${k}`)])),
    };
    const states = fig.states ?? {};
    if (fig.state !== undefined && !(fig.state in states))
      diags.push({
        level: "error",
        code: "figure-state",
        path: `${at}.state`,
        message: `no state "${fig.state}"`,
        expected: Object.keys(states).join(", ") || `"states": { "${fig.state}": { … } }`,
      });
    const start = splitLabel(fig.state ? (states[fig.state] ?? {}) : {});
    let raw = mergeParams(fig.params, start.params);
    const base = checkParams(
      fig.kind,
      raw,
      fig.state ? `${at}.states.${fig.state}` : `${at}.params`,
    );
    for (const [name, patch] of Object.entries(states))
      if (name !== fig.state)
        checkParams(
          fig.kind,
          mergeParams(fig.params, splitLabel(patch).params),
          `${at}.states.${name}`,
        );
    if (!base) return;
    const box = fig.slot ? slotRect(fig.slot, width, height) : fig.at;
    const rect = {
      x: (box.x - box.w / 2) * width,
      y: (box.y - box.h / 2) * height,
      w: box.w * width,
      h: box.h * height,
    };
    const track: FigureTrack = {
      id: fig.id,
      kind: fig.kind,
      rect,
      layer: fig.layer,
      base,
      ...((start.label ?? fig.label) ? { label: start.label ?? fig.label } : {}),
      panel: fig.panel,
      ...(fig.tag ? { tag: fig.tag } : {}),
      spans: [],
      keys: [],
    };
    const revealFrames = (style: Reveal, ms?: number) => {
      if (ms !== undefined) return msToFrame(ms, fps);
      const n =
        fig.kind === "equation" && track.typeset ? Math.max(1, track.typeset.parts.length) : 1;
      return msToFrame(
        REVEAL_MS[style] * (fig.kind === "equation" ? Math.min(3, 0.35 * n + 0.3) : 1),
        fps,
      );
    };
    if (fig.kind === "equation") {
      const tex = base.tex as string;
      const ts = lib.equations?.[tex];
      // No cache at all (an in-process check): a warning; a cache without this TeX (a render): an error.
      if (!ts)
        diags.push({
          level: lib.equations ? "error" : "warning",
          code: "equation-unprepared",
          path: `${at}.params.tex`,
          message: `the equation "${tex}" isn't typeset`,
          expected: "run `pnpm prep <skit>` (MathJax typesets equations into generated/equations.json)",
        });
      else track.typeset = ts;
      for (const [name, patch] of Object.entries(states))
        if (typeof patch.tex === "string" && patch.tex !== tex)
          diags.push({
            level: "warning",
            code: "equation-tex-state",
            path: `${at}.states.${name}.tex`,
            message: "a state changes the TeX; only the first TeX is drawn",
            expected: "a second equation figure, shown on a cue",
          });
    }
    if (fig.kind === "image") {
      const img = lib.images?.[base.image as string];
      if (!img)
        diags.push({
          level: "error",
          code: "unknown-image",
          path: `${at}.params.image`,
          message: `no image "${String(base.image)}" in images.json`,
          expected:
            Object.keys(lib.images ?? {}).join(", ") ||
            "add it to src/data/images.json (with its credit and licence)",
        });
      else
        track.image = {
          src: img.file,
          credit: creditLine(img),
          width: img.width,
          height: img.height,
          impression: img.impression,
        };
    }
    if (!fig.hidden)
      track.spans.push({ show: { frame: 0, durationFrames: revealFrames(fig.reveal), style: fig.reveal } });

    const mine = args.cues.filter((c) => c.cue.id === fig.id).sort((a, b) => a.frame - b.frame);
    for (const { cue, frame, path } of mine) {
      const f = Math.max(0, frame);
      if (cue.do === "focus") continue; // the camera's (`director/sceneFigures.ts`)
      if (cue.do === "show") {
        const last = track.spans.at(-1);
        if (last && last.show.frame < f && !last.hide)
          diags.push({
            level: "warning",
            code: "figure-shown",
            path,
            message: `"${fig.id}" is already on screen`,
          });
        const style = cue.style ?? fig.reveal;
        const show = { frame: f, durationFrames: revealFrames(style, cue.durationMs), style };
        // Shown again after a hide: a new span. Shown while on screen: restart the reveal.
        if (last && !last.hide) last.show = show;
        else track.spans.push({ show });
        continue;
      }
      if (cue.do === "hide") {
        const last = track.spans.at(-1);
        if (last && !last.hide)
          last.hide = { frame: f, durationFrames: msToFrame(cue.durationMs ?? 300, fps) };
        continue;
      }
      let patch: Params;
      let style: FigureKey["style"] = "morph";
      let keyLabel: string | undefined;
      if (cue.do === "state") {
        const st = states[cue.state];
        if (!st) {
          diags.push({
            level: "error",
            code: "figure-state",
            path: `${path}.state`,
            message: `figure "${fig.id}" has no state "${cue.state}"`,
            expected: Object.keys(states).join(", ") || "add it under the figure's states",
          });
          continue;
        }
        const s = splitLabel(st);
        patch = s.params;
        keyLabel = s.label;
        style = cue.style;
      } else patch = bind(cue.params, `${path}.params`);
      raw = mergeParams(raw, patch);
      const params = checkParams(
        fig.kind,
        raw,
        cue.do === "set" ? `${path}.params` : `${at}.states.${cue.do === "state" ? cue.state : ""}`,
      );
      if (!params) continue;
      track.keys.push({
        frame: f,
        durationFrames: msToFrame(
          cue.durationMs ??
            (style === "cut" ? 0 : style === "strike" ? REVEAL_MS.draw : DEFAULT_TWEEN_MS),
          fps,
        ),
        params,
        style,
        ...(keyLabel ? { label: keyLabel } : {}),
      });
    }
    if (used.size) track.sources = [...used];
    tracks.push(track);
  });
  resolveMapViews(tracks, diags, (id) => args.pathOf(args.figures.findIndex((f) => f.id === id)));

  for (const c of args.cues)
    if (!ids.includes(c.cue.id) && !(c.cue.do === "focus" && c.cue.id === "none"))
      diags.push({
        level: "error",
        code: "unknown-figure",
        path: `${c.path}.id`,
        message: `no figure "${c.cue.id}" in this scene`,
        expected: ids.join(", ") || `a "figures" list on the scene`,
      });

  // Callouts that point at another figure's anchor ("orbit.perihelion").
  const unit = figureUnit(width, height);
  for (const t of tracks) {
    if (t.kind !== "callout" || typeof t.base.target !== "string") continue;
    const [fid, anchor] = (t.base.target as string).split(".");
    const target = tracks.find((x) => x.id === fid);
    const pt = target ? figureAnchor(target, anchor, unit) : undefined;
    const i = args.figures.findIndex((f) => f.id === t.id);
    if (!pt) {
      diags.push({
        level: "error",
        code: "figure-anchor",
        path: `${args.pathOf(i)}.params.target`,
        message: `no anchor "${String(t.base.target)}"`,
        expected: `"<figureId>" or "<figureId>.<anchor>" (center, top, bottom, left, right, star, perihelion, aphelion, origin, or an equation's term class)`,
      });
      continue;
    }
    const resolved: [number, number] = [pt.x / width, pt.y / height];
    t.base = { ...t.base, target: resolved };
    t.keys = t.keys.map((k) => ({ ...k, params: { ...k.params, target: resolved } }));
  }

  const credits: CreditEvent[] = tracks.flatMap((t) => {
    const texts = [...(t.image ? [t.image.credit] : []), ...(t.sources ?? []).flatMap((id) => (args.data?.[id] ? [creditOf(args.data[id])] : []))];
    return texts.flatMap((text) => t.spans.map((s) => ({
      text,
      from: s.show.frame,
      to: s.hide ? s.hide.frame + s.hide.durationFrames : Number.MAX_SAFE_INTEGER,
    })));
  });
  return { tracks, credits };
};

/** A figure anchor for gaze and gestures: `"figure:orbit.perihelion"` → frame fractions. */
export const figureLookTarget = (
  tracks: readonly FigureTrack[],
  ref: string,
  width: number,
  height: number,
): { x: number; y: number } | undefined => {
  const m = /^figure:([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?$/.exec(ref);
  if (!m) return undefined;
  const t = tracks.find((x) => x.id === m[1]);
  const pt = t ? figureAnchor(t, m[2], figureUnit(width, height)) : undefined;
  return pt ? { x: pt.x / width, y: pt.y / height } : undefined;
};
