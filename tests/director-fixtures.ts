import { library, reactions, sets, sfxLibrary } from "../src/data";
import { compileSkit, estimateMouthCues, estimateWords, type PreparedVoice, type SkitInput } from "../src/engine";

/** Prepared voice for test lines without audio: estimated words and mouths. */
export const fakeVoice = (lines: { id: string; text: string; durationMs: number; speaker?: string }[]): PreparedVoice => ({
  schemaVersion: 1,
  lines: lines.map((l) => {
    const words = estimateWords(l.text, l.durationMs);
    return { ...l, audio: `skits/test/voice/${l.id}.wav`, words, mouthCues: estimateMouthCues(words), source: { words: "estimated", mouth: "estimated" } };
  }),
});

type BeatIn = NonNullable<SkitInput["beats"]>[number];

/** A two-person skit in plain-1 plus a voice for every spoken beat (1 s per 3 words). */
export const skitOf = (beats: BeatIn[], extra: Partial<SkitInput> = {}) => {
  const skit: SkitInput = {
    schemaVersion: 1,
    meta: { title: "test" },
    set: "plain-1",
    cast: [
      { id: "milo", character: "milo", mark: "left" },
      { id: "june", character: "june", mark: "right" },
    ],
    beats,
    ...extra,
  };
  const voice = fakeVoice(
    beats.flatMap((b) => (b.line ? [{ id: b.id, text: b.line, durationMs: Math.max(600, (b.line.split(/\s+/).length / 3) * 1000) }] : [])),
  );
  return { skit, voice };
};

export const compile = (beats: BeatIn[], extra: Partial<SkitInput> = {}) => {
  const { skit, voice } = skitOf(beats, extra);
  return compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions });
};
