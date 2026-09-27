import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepSkit, wavProbe, workspace, type Adapters } from "../src/node";

/** 16-bit mono PCM WAV: `tone` ms of a 220 Hz tone, then `silence` ms, repeated per phrase. */
const wav = (phrases: [number, number][], rate = 22050): Buffer => {
  const samples: number[] = [];
  for (const [tone, silence] of phrases) {
    for (let i = 0; i < (tone / 1000) * rate; i++) samples.push(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000));
    for (let i = 0; i < (silence / 1000) * rate; i++) samples.push(0);
  }
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(s, i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
};

/** Adapters with no external tools: "normalizing" copies the (already PCM) file. */
const calls: string[] = [];
const fake: Adapters = {
  normalizer: { toWav: (i, o) => (calls.push("wav"), fs.copyFileSync(i, o)) },
  probe: wavProbe,
  lipSync: { id: "fake-lipsync 1", cues: () => (calls.push("lipsync"), [{ startMs: 0, endMs: 100, shape: "B" }]) },
};

describe("prepare step behind adapters", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-ws-"));
  const ws = workspace(root);
  const dir = ws.skitDir("t");
  fs.mkdirSync(path.join(dir, "voice"), { recursive: true });
  fs.writeFileSync(path.join(dir, "voice/a.wav"), wav([[500, 300], [400, 0]]));
  fs.writeFileSync(path.join(dir, "voice.json"), JSON.stringify({ schemaVersion: 1, lines: [{ id: "a", speaker: "milo", text: "Hello there. Friend.", audio: "voice/a.wav" }] }));

  it("prepares a line with the given adapters, records provenance and serves from public/", () => {
    const r = prepSkit(ws, "t", { adapters: fake });
    const [line] = r.voice.lines;
    expect(r).toMatchObject({ hits: 0, mouthTool: "fake-lipsync 1" });
    expect(line).toMatchObject({ audio: "skits/t/voice/a.wav", source: { words: "estimated", mouth: "rhubarb" }, mouthCues: [{ shape: "B" }] });
    expect(line!.durationMs).toBeGreaterThan(1150);
    // Silence detection puts "Friend." after the pause.
    expect(line!.words.at(-1)!.startMs).toBeGreaterThanOrEqual(750);
  });
  it("a re-run is a full cache hit that runs no tools", () => {
    calls.length = 0;
    expect(prepSkit(ws, "t", { adapters: fake }).hits).toBe(1);
    expect(calls).toEqual([]);
  });
  it("a different lip-sync tool invalidates the cache", () => {
    expect(prepSkit(ws, "t", { adapters: { ...fake, lipSync: { ...fake.lipSync!, id: "fake-lipsync 2" } } }).hits).toBe(0);
  });
  it("without a lip-sync adapter, mouths are estimated with a warning (or it fails when required)", () => {
    const r = prepSkit(ws, "t", { adapters: { ...fake, lipSync: undefined } });
    expect(r.voice.lines[0]!.source.mouth).toBe("estimated");
    expect(r.warnings[0]).toContain("ESTIMATED");
    expect(() => prepSkit(ws, "t", { adapters: { ...fake, lipSync: undefined }, requireLipSync: true })).toThrow("Rhubarb not found");
  });
  it("narrator lines get word timings but no lip-sync", () => {
    const n = ws.skitDir("n");
    fs.mkdirSync(path.join(n, "voice"), { recursive: true });
    fs.copyFileSync(path.join(dir, "voice/a.wav"), path.join(n, "voice/v.wav"));
    fs.copyFileSync(path.join(dir, "voice/a.wav"), path.join(n, "voice/m.wav"));
    const skit = {
      schemaVersion: 2,
      meta: { title: "n" },
      set: "plain-1",
      narrator: { id: "narrator" },
      cast: [{ id: "milo", character: "milo", mark: "center" }],
      beats: [
        { id: "v", speaker: "narrator", line: "Hello there. Friend." },
        { id: "m", speaker: "milo", line: "Hello there. Friend." },
      ],
    };
    fs.writeFileSync(path.join(n, "skit.json"), JSON.stringify(skit));
    const lines = [
      { id: "v", speaker: "narrator", text: "Hello there. Friend.", audio: "voice/v.wav" },
      { id: "m", speaker: "milo", text: "Hello there. Friend.", audio: "voice/m.wav" },
    ];
    fs.writeFileSync(path.join(n, "voice.json"), JSON.stringify({ schemaVersion: 1, lines }));
    calls.length = 0;
    const [v, m] = prepSkit(ws, "n", { adapters: fake }).voice.lines;
    expect(v).toMatchObject({ mouthCues: [], source: { mouth: "none" } });
    expect(v!.words).toHaveLength(3);
    expect(m!.source.mouth).toBe("rhubarb");
    expect(calls.filter((c) => c === "lipsync")).toHaveLength(1);
  });
});
