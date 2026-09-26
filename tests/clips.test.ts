import { describe, expect, it } from "vitest";
import { parseWhisperJson } from "../src/engine";
import { compile } from "./director-fixtures";

describe("file audio (lip-sync to an existing sound)", () => {
  it("parses whisper.cpp word segments, dropping empty and bracketed ones", () => {
    const json = {
      transcription: [
        { offsets: { from: 0, to: 120 }, text: "" },
        { offsets: { from: 120, to: 400 }, text: " Why" },
        { offsets: { from: 400, to: 520 }, text: " [MUSIC]" },
        { offsets: { from: 520, to: 900 }, text: " here?" },
      ],
    };
    expect(parseWhisperJson(json)).toEqual([
      { text: "Why", startMs: 120, endMs: 400 },
      { text: "here?", startMs: 520, endMs: 900 },
    ]);
  });
  it("beats cut from one file keep the file's own gap instead of the skit gap", () => {
    const clip = (id: string, speaker: string, line: string, startMs: number, endMs: number) => ({
      id,
      speaker,
      line,
      audio: { source: "file" as const, src: "audio/s.wav", startMs, endMs },
    });
    const { timeline: tl } = compile([clip("a", "milo", "One two three.", 0, 1000), clip("b", "june", "Four five six.", 1600, 2600)]);
    const [a, b] = tl.beats;
    // Fixture lines last 1 s: b starts 600 ms (18 frames) after a ends.
    expect(b!.from - a!.to).toBe(18);
  });
});
