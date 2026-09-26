import { describe, expect, it } from "vitest";
import {
  alignWords,
  buildCaptionPages,
  estimateWords,
  estimateWordsInSpans,
  evalActor,
  MOUTH_PRESETS,
  speechMouth,
  tokenize,
  VISEMES,
  type MouthCue,
} from "../src/engine";
import { library } from "../src/data";

const TEXT = "I'm fine. Totally fine — don't worry, it's 3 o'clock!";

describe("tokenize", () => {
  it("round-trips the script text (whitespace-normalized)", () => {
    expect(tokenize(TEXT).map((t) => t.text).join(" ")).toBe(TEXT);
    expect(tokenize("  a   b\n c ").map((t) => t.text)).toEqual(["a", "b", "c"]);
  });
  it("attaches punctuation-only tokens to the previous word", () => {
    expect(tokenize(TEXT).map((t) => t.text)).toContain("fine —");
  });
  it("normalizes case, curly apostrophes and punctuation", () => {
    expect(tokenize("Don’t STOP!").map((t) => t.norm)).toEqual(["don't", "stop"]);
  });
});

describe("word timings", () => {
  const ordered = (w: { startMs: number; endMs: number }[]) =>
    w.every((x, i) => x.endMs >= x.startMs && (i === 0 || x.startMs >= w[i - 1]!.endMs));

  it("estimates increasing, non-overlapping timings inside the clip", () => {
    const w = estimateWords(TEXT, 3000);
    expect(w).toHaveLength(tokenize(TEXT).length);
    expect(ordered(w)).toBe(true);
    expect(w[0]!.startMs).toBeGreaterThanOrEqual(0);
    expect(w[w.length - 1]!.endMs).toBeLessThanOrEqual(3000);
  });

  it("uses provider timings for matching words and fills the rest", () => {
    // Provider reads "3" as "three" and splits nothing else.
    const timed = [
      { text: "I'm", startMs: 100 },
      { text: "fine", startMs: 300 },
      { text: "totally", startMs: 800 },
      { text: "fine", startMs: 1200 },
      { text: "don't", startMs: 1700 },
      { text: "worry", startMs: 1900 },
      { text: "it's", startMs: 2300 },
      { text: "three", startMs: 2500 },
      { text: "o'clock", startMs: 2800, endMs: 3200 },
    ];
    const w = alignWords(TEXT, 3400, timed);
    expect(w.map((x) => x.text)).toEqual(tokenize(TEXT).map((t) => t.text));
    expect(w[0]!.startMs).toBe(100);
    expect(w[2]!.startMs).toBe(800);
    expect(w[8]!.startMs).toBe(2800);
    // "3" had no match: it sits between "it's" and "o'clock".
    expect(w[7]!.startMs).toBeGreaterThanOrEqual(w[6]!.endMs);
    expect(w[7]!.endMs).toBeLessThanOrEqual(2800);
    expect(ordered(w)).toBe(true);
  });

  it("places phrases in the audio's spoken spans, breaking at punctuation", () => {
    const spans = [
      { startMs: 0, endMs: 500 },
      { startMs: 900, endMs: 2000 },
      { startMs: 2400, endMs: 3000 },
    ];
    const w = estimateWordsInSpans("Good news! I finally read your script. Honestly!", spans, 3100);
    const at = (t: string) => w.find((x) => x.text === t)!;
    expect(at("news!").endMs).toBeLessThanOrEqual(500);
    expect(at("I").startMs).toBe(900);
    expect(at("script.").endMs).toBeLessThanOrEqual(2000);
    expect(at("Honestly!").startMs).toBe(2400);
    expect(ordered(w)).toBe(true);
  });
});

describe("captions", () => {
  const words = estimateWords("Forty pages. Forty! And the dog never talks!", 3500);
  const other = estimateWords("Right. Sure.", 1200);
  const pages = buildCaptionPages([
    { startMs: 500, words },
    { startMs: 4500, words: other },
  ]);

  it("shows the script exactly, in order", () => {
    const shown = pages.map((p) => p.tokens.map((t) => t.text.trim()).join(" ")).join(" ");
    expect(shown).toBe("Forty pages. Forty! And the dog never talks! Right. Sure.");
  });
  it("never spans two lines and never overlaps", () => {
    expect(pages.some((p) => p.text.includes("talks!") && p.text.includes("Right."))).toBe(false);
    for (let i = 1; i < pages.length; i++) expect(pages[i]!.startMs).toBeGreaterThanOrEqual(pages[i - 1]!.endMs);
  });
  it("keeps pages short", () => {
    for (const p of pages) expect(p.text.length).toBeLessThanOrEqual(26);
  });
});

describe("speech mouths", () => {
  const cues: MouthCue[] = [
    { startMs: 0, endMs: 100, shape: "X" },
    { startMs: 100, endMs: 250, shape: "D" },
    { startMs: 250, endMs: 400, shape: "A" },
  ];
  const smile = MOUTH_PRESETS.smile!;

  it("rest and outside the line keep the expression mouth", () => {
    expect(speechMouth(smile, cues, 50)).toEqual(smile);
    expect(speechMouth(smile, cues, 900)).toEqual(smile);
  });
  it("visemes open the mouth and keep the expression's corner lift", () => {
    const m = speechMouth(smile, cues, 200);
    expect(m.open).toBeGreaterThan(0.3);
    expect(m.curve).toBeCloseTo(smile.curve * 0.7);
    expect(speechMouth(smile, cues, 380).open).toBe(VISEMES.A.open);
  });
  it("evalActor applies speech only while the clip plays, deterministically", () => {
    const tracks = {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "idle" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      speech: [{ startFrame: 30, cues }],
    };
    const at = (f: number) => evalActor(library, tracks, f, 30, 720);
    expect(at(10).face.mouth).toEqual(MOUTH_PRESETS.neutral);
    expect(at(36).face.mouth.open).toBeGreaterThan(0.3); // 200 ms into the clip
    expect(at(36)).toEqual(at(36));
  });
});

describe("phrase-level marks", () => {
  it("spreads each phrase between its first-word mark and the next one", () => {
    const w = alignWords("Good news! I finally read your script.", 2600, [
      { text: "Good", startMs: 0 },
      { text: "I", startMs: 1000 },
    ]);
    expect(w.map((x) => x.text)).toEqual(["Good", "news!", "I", "finally", "read", "your", "script."]);
    expect(w[1]!.startMs).toBeGreaterThan(100);
    expect(w[1]!.endMs).toBeLessThanOrEqual(1000);
    expect(w[2]!.startMs).toBe(1000);
    expect(w[6]!.endMs).toBeGreaterThan(2000);
  });
});
