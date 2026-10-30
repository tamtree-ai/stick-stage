/**
 * Explainer documents (`format: "explainer"`): the checks that need the whole doc (spoken numbers
 * against datasets) and YouTube chapters from scenes. Variety rules are QA (`qa/variety.ts`).
 */
import { checkSpokenNumbers } from "./data";
import type { Diagnostic } from "./diagnostics";
import type { SkitDoc } from "./schema";
import type { Program } from "./timeline";

export const isExplainer = (doc: Pick<SkitDoc, "format">): boolean => doc.format === "explainer";

/** Every beat's `numbers` against the datasets. Errors: a wrong number is a wrong video. */
export const explainerChecks = (doc: SkitDoc): Diagnostic[] => {
  const out: Diagnostic[] = [];
  const beats = doc.beats ? doc.beats.map((b, j) => ({ b, at: `beats[${j}]` })) : doc.scenes!.flatMap((sc, i) => sc.beats.map((b, j) => ({ b, at: `scenes[${i}].beats[${j}]` })));
  for (const { b, at } of beats) checkSpokenNumbers(b, doc.datasets, at, out);
  return out;
};

export type Chapter = { title: string; frame: number };

/** YouTube's rules: the first at 0:00, at least three, each at least ten seconds. */
const MIN_CHAPTERS = 3;
const MIN_CHAPTER_S = 10;

/** Chapters from scene `chapter` titles; an "Intro" at 0:00 when the first scene has none. */
export const chaptersOf = (doc: SkitDoc, program: Pick<Program, "scenes" | "fps" | "durationInFrames">, diags: Diagnostic[]): Chapter[] => {
  const titled = (doc.scenes ?? []).flatMap((sc, i) => (sc.chapter ? [{ title: sc.chapter, frame: program.scenes[i]?.from ?? 0, i }] : []));
  if (!titled.length) return [];
  const chapters = titled[0]!.frame > 0 ? [{ title: "Intro", frame: 0, i: -1 }, ...titled] : titled;
  if (chapters.length < MIN_CHAPTERS)
    diags.push({ level: "warning", code: "chapters", path: "scenes", message: `${chapters.length} chapter(s); YouTube shows chapters only from ${MIN_CHAPTERS}`, expected: `"chapter" on at least ${MIN_CHAPTERS} scenes` });
  chapters.forEach((c, k) => {
    const end = chapters[k + 1]?.frame ?? program.durationInFrames;
    if ((end - c.frame) / program.fps < MIN_CHAPTER_S)
      diags.push({ level: "warning", code: "chapters", path: c.i >= 0 ? `scenes[${c.i}].chapter` : "scenes[0]", message: `chapter "${c.title}" runs ${((end - c.frame) / program.fps).toFixed(1)} s (YouTube needs ${MIN_CHAPTER_S} s)` });
  });
  return chapters.map(({ title, frame }) => ({ title, frame }));
};

/** "1:05": a chapter timestamp. */
export const stamp = (frame: number, fps: number): string => {
  const s = Math.floor(frame / fps);
  const hms = s >= 3600 ? [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60] : [Math.floor(s / 60), s % 60];
  return hms.map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, "0"))).join(":");
};
