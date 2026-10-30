/**
 * Anti-template rules for explainers (`format: "explainer"`). YouTube's inauthentic-content rule
 * names videos that look made from a template, so variety is enforced, not hoped for.
 *
 * Per video (errors): enough distinct figure kinds for the length, no kind leading more than three
 * spoken beats in a row, a visual change at least every 8 s, something moving in the first 3 s.
 * Across videos (warnings): a fingerprint of the video, scored against the caller's history
 * (StickStage is stateless; Tamtree passes the last videos' fingerprints in render options).
 */
import type { Program } from "../director/timeline";
import type { Finding } from "./types";

export const VARIETY_CHECKS = ["variety-kinds", "variety-run", "variety-change", "variety-hook", "sameness"];

export const MAX_STILL_S = 8;
export const HOOK_S = 3;
export const MAX_RUN = 3;
/** Six distinct kinds per eight minutes (pro rata, at least two). */
export const kindsNeeded = (seconds: number): number => Math.min(6, Math.max(2, Math.round((6 * seconds) / 480)));
/** At or above this score a video reads as a copy of an earlier one. */
export const SAMENESS = 0.8;

type Event = { frame: number; kind?: string; what: string };

/** Everything that changes the picture, program-absolute, in order. */
const visualEvents = (p: Program): Event[] =>
  p.scenes
    .flatMap((sc) => {
      const tl = sc.timeline;
      const at = (f: number) => sc.from + f;
      return [
        { frame: sc.from, what: `scene ${sc.id}` },
        // A cut to the same camera (castless scenes) changes nothing.
        ...tl.shots.filter((s, i) => i > 0 && JSON.stringify(s.camera) !== JSON.stringify(tl.shots[i - 1]!.camera)).map((s) => ({ frame: at(s.frame), what: "cut" })),
        ...(tl.focus ?? []).map((k) => ({ frame: at(k.frame), what: "focus" })),
        ...tl.slams.map((s) => ({ frame: at(s.from), what: "slam" })),
        ...tl.lists.flatMap((l) => l.at.map((f) => ({ frame: at(f), what: "list" }))),
        ...(tl.card ? tl.card.at.map((f) => ({ frame: at(f), what: "card" })) : []),
        ...(tl.figures ?? []).flatMap((f) => [
          ...f.spans.flatMap((s) => [{ frame: at(s.show.frame), kind: f.kind, what: `${f.id} shows` }, ...(s.hide ? [{ frame: at(s.hide.frame), what: `${f.id} hides` }] : [])]),
          ...f.keys.map((k) => ({ frame: at(k.frame), kind: f.kind, what: `${f.id} changes` })),
        ]),
      ];
    })
    .sort((a, b) => a.frame - b.frame);

export const varietyChecks = (p: Program): Finding[] => {
  if (p.format !== "explainer") return [];
  const out: Finding[] = [];
  const fps = p.fps;
  const seconds = p.durationInFrames / fps;
  const events = visualEvents(p);
  const kinds = new Set(events.flatMap((e) => (e.kind ? [e.kind] : [])));
  const need = kindsNeeded(seconds);
  if (kinds.size < need)
    out.push({ check: "variety-kinds", level: "error", message: `${kinds.size} figure kind(s) (${[...kinds].join(", ") || "none"}) in ${Math.round(seconds)} s; use at least ${need}` });

  // The kind leading each spoken beat: the last figure shown or changed by the beat's end.
  const figureEvents = events.filter((e) => e.kind);
  const beats = p.scenes.flatMap((sc) => sc.timeline.beats.filter((b) => b.kind === "line").map((b) => ({ id: b.id, end: sc.from + b.to })));
  let run = 0;
  let prev: string | undefined;
  for (const b of beats) {
    const lead = [...figureEvents].reverse().find((e) => e.frame <= b.end)?.kind;
    run = lead && lead === prev ? run + 1 : 1;
    prev = lead;
    if (lead && run === MAX_RUN + 1)
      out.push({ check: "variety-run", level: "error", frame: b.end, message: `"${lead}" leads ${run} beats in a row (to "${b.id}"); switch kind every ${MAX_RUN} beats at most` });
  }

  const marks = [0, ...events.map((e) => e.frame), p.durationInFrames];
  for (let i = 1; i < marks.length; i++)
    if ((marks[i]! - marks[i - 1]!) / fps > MAX_STILL_S)
      out.push({ check: "variety-change", level: "error", frame: marks[i - 1], message: `${((marks[i]! - marks[i - 1]!) / fps).toFixed(1)} s with nothing new on screen (max ${MAX_STILL_S} s): show, change or focus a figure` });

  if (!events.some((e) => e.what !== "cut" && !e.what.startsWith("scene ") && e.frame <= HOOK_S * fps))
    out.push({ check: "variety-hook", level: "error", frame: 0, message: `nothing moves in the first ${HOOK_S} s; open on a figure, a card or a slam` });
  return out;
};

/** What a video looks like, for comparing it against earlier ones. Stored by the caller. */
export type Fingerprint = {
  /** Figure kinds in the order they first appear (repeats collapsed). */
  kinds: string[];
  /** Where figures sit: rounded boxes as "x,y,w,h" fractions. */
  layout: string[];
  /** Sets (backdrop and palette) per scene. */
  sets: string[];
  /** Kinds shown in the first 30 s. */
  opening: string[];
  /** The cover's title. */
  cover?: string;
};

export const fingerprint = (p: Program): Fingerprint => {
  const shown = p.scenes
    .flatMap((sc) => (sc.timeline.figures ?? []).flatMap((f) => (f.spans[0] ? [{ frame: sc.from + f.spans[0].show.frame, f, w: sc.timeline.width, h: sc.timeline.height }] : [])))
    .sort((a, b) => a.frame - b.frame);
  const kinds = shown.map((s) => s.f.kind).filter((k, i, a) => k !== a[i - 1]);
  const r = (v: number) => Math.round(v * 10) / 10;
  const layout = [...new Set(shown.map(({ f, w, h }) => [f.rect.x / w, f.rect.y / h, f.rect.w / w, f.rect.h / h].map(r).join(",")))].sort();
  const sets = p.scenes.map((sc) => sc.timeline.set).filter((s, i, a) => s !== a[i - 1]);
  const opening = shown.filter((s) => s.frame < 30 * p.fps).map((s) => s.f.kind);
  return { kinds, layout, sets, opening, ...(p.cover ? { cover: p.cover.title } : {}) };
};

const lcs = (a: readonly string[], b: readonly string[]): number => {
  const row = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j]!;
      row[j] = x === b[j - 1] ? diag + 1 : Math.max(row[j]!, row[j - 1]!);
      diag = up;
    }
  }
  return row[b.length]!;
};
const seq = (a: readonly string[], b: readonly string[]) => (a.length || b.length ? lcs(a, b) / Math.max(a.length, b.length) : 1);
const jaccard = (a: readonly string[], b: readonly string[]) => {
  const A = new Set(a);
  const B = new Set(b);
  const both = [...A].filter((x) => B.has(x)).length;
  return A.size + B.size ? both / (A.size + B.size - both) : 1;
};

/** 0…1: how alike two videos look, and the parts that match. */
export const sameness = (a: Fingerprint, b: Fingerprint): { score: number; why: string[] } => {
  const parts = { "figure order": seq(a.kinds, b.kinds), layout: jaccard(a.layout, b.layout), sets: jaccard(a.sets, b.sets), opening: seq(a.opening, b.opening) };
  const score = 0.45 * parts["figure order"] + 0.2 * parts.layout + 0.15 * parts.sets + 0.2 * parts.opening;
  return { score, why: Object.entries(parts).filter(([, v]) => v >= 0.8).map(([k]) => k) };
};

/** Warnings against earlier videos (most recent first): the closest one, and an opening reused from the last five. */
export const samenessChecks = (fp: Fingerprint, history: readonly Fingerprint[]): Finding[] => {
  if (!history.length) return [];
  const out: Finding[] = [];
  const scored = history.map((h, i) => ({ i, ...sameness(fp, h) })).sort((x, y) => y.score - x.score);
  const top = scored[0]!;
  if (top.score >= SAMENESS)
    out.push({ check: "sameness", level: "warning", message: `looks like history[${top.i}] (score ${top.score.toFixed(2)}; same ${top.why.join(", ") || "overall shape"}); change the figure order, layout or set` });
  const reused = history.slice(0, 5).findIndex((h) => h.opening.length > 0 && h.opening.join(">") === fp.opening.join(">"));
  if (reused >= 0) out.push({ check: "sameness", level: "warning", frame: 0, message: `the first 30 s use the same figures as history[${reused}] (${fp.opening.join(" → ")}); open differently` });
  return out;
};
