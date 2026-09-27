import { describe, expect, it } from "vitest";
import { library, reactions, sets, sfxLibrary } from "../src/data";
import { compileSkit, resolveAnchor, SkitError, skitLines, parseSkit, type Diagnostic } from "../src/engine";
import { compile, fakeVoice, skitOf } from "./director-fixtures";

const FPS = 30;
const f = (ms: number) => Math.round((ms / 1000) * FPS);

const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};

describe("anchors", () => {
  const [line] = fakeVoice([{ id: "x", text: "Fine. I'm fine. Totally FINE!", durationMs: 3000 }]).lines;
  const ctx = { words: line!.words, durationMs: 3000, minMs: -300, maxMs: 3400 };
  const wordMs = (i: number) => line!.words[i]!.startMs;

  it("resolves repeated words by occurrence (normalized match)", () => {
    expect(resolveAnchor({ word: "fine", occurrence: 1 }, ctx)).toEqual({ ok: true, ms: wordMs(0) });
    expect(resolveAnchor({ word: "fine", occurrence: 2 }, ctx)).toEqual({ ok: true, ms: wordMs(2) });
    expect(resolveAnchor({ word: "fine", occurrence: 3 }, ctx)).toEqual({ ok: true, ms: wordMs(4) });
  });
  it("prefers an exact token over the normalized word", () => {
    expect(resolveAnchor({ word: "FINE!", occurrence: 1 }, ctx)).toEqual({ ok: true, ms: wordMs(4) });
  });
  it("reports how many times a word occurs", () => {
    const r = resolveAnchor({ word: "fine", occurrence: 4 }, ctx);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.expected).toBe("occurrence 1…3");
  });
  it("lists the line's words for a missing word", () => {
    const r = resolveAnchor({ word: "okay", occurrence: 1 }, ctx);
    expect(!r.ok && r.expected).toContain("totally");
  });
  it("ms and fraction anchors, bounded by the beat", () => {
    expect(resolveAnchor({ ms: -200 }, ctx)).toEqual({ ok: true, ms: -200 });
    expect(resolveAnchor({ fraction: 0.5 }, ctx)).toEqual({ ok: true, ms: 1500 });
    expect(resolveAnchor({ ms: 5000 }, ctx).ok).toBe(false);
  });
  it("word anchors fail in a silent beat", () => {
    expect(resolveAnchor({ word: "x", occurrence: 1 }, { words: [], durationMs: 900, minMs: 0, maxMs: 900 }).ok).toBe(false);
  });
});

describe("beat layout", () => {
  const beats = [
    { id: "a", speaker: "milo", line: "One two three." },
    { id: "b", speaker: "june", line: "Four five six.", pauseBeforeMs: 800, holdAfterMs: 500 },
    { id: "c", silent: true, durationMs: 1200 },
    { id: "d", speaker: "milo", line: "Seven eight nine." },
  ];
  const { timeline: tl } = compile(beats);
  const beat = (id: string) => tl.beats.find((b) => b.id === id)!;

  it("lead-in, default gap, pause before and hold after", () => {
    expect(beat("a").from).toBe(f(300));
    expect(beat("b").from).toBe(f(300 + 1000 + 800));
    expect(beat("b").to).toBe(f(300 + 1000 + 800 + 1000 + 500));
    expect(beat("c").from).toBe(f(300 + 1000 + 800 + 1000 + 500 + 250));
    expect(beat("c").to - beat("c").from).toBe(f(1200));
  });
  it("inserts a reaction beat after the (last spoken) punchline", () => {
    expect(beat("d").punchline).toBe(true);
    const r = tl.beats[tl.beats.length - 1]!;
    expect(r).toMatchObject({ id: "d-reaction", kind: "reaction", synthetic: true });
    expect(r.from).toBe(beat("d").to);
    expect(tl.durationInFrames).toBe(f(300 + 1000 + 800 + 1000 + 500 + 250 + 1200 + 250 + 1000 + 1300 + 700));
  });
  it("no reaction beat when the skit has its own, or with reaction: false", () => {
    const own = compile([{ id: "a", speaker: "milo", line: "Hi there you.", punchline: true }, { id: "r", silent: true }]);
    expect(own.timeline.beats.map((b) => b.id)).toEqual(["a", "r"]);
    const none = compile([{ id: "a", speaker: "milo", line: "Hi there you.", reaction: false }]);
    expect(none.timeline.beats.map((b) => b.id)).toEqual(["a"]);
  });
  it("audio clips start with their beats; captions show the script", () => {
    expect(tl.audio.map((a) => a.frame)).toEqual([beat("a").from, beat("b").from, beat("d").from]);
    expect(tl.pages.flatMap((p) => p.tokens.map((t) => t.text.trim())).join(" ")).toBe("One two three. Four five six. Seven eight nine.");
  });
});

describe("schema and library errors are actionable", () => {
  const base = skitOf([{ id: "a", speaker: "milo", line: "Hello there friend." }]);
  const withBeat = (patch: object, beatPatch: object = {}) => () =>
    compileSkit({ ...base, skit: { ...base.skit, ...patch, beats: [{ ...base.skit.beats![0], ...beatPatch }] }, lib: library, sets, sfx: sfxLibrary, reactions });

  it("bad enum: path, expected values and an example", () => {
    const [e] = errorsOf(withBeat({}, { shot: { framing: "closeup", on: "milo" } }));
    expect(e!.path).toBe("beats[0].shot.framing");
    expect(e!.expected).toContain('"extreme"');
    expect(e!.example).toContain('"framing": "close"');
  });
  it("unknown action kind and unknown fields", () => {
    const [a] = errorsOf(withBeat({}, { actions: [{ who: "milo", do: "dance" }] }));
    expect(a!.path).toBe("beats[0].actions[0].do");
    const [b] = errorsOf(withBeat({}, { speakr: "milo" }));
    expect(b!.message).toContain('"speakr"');
  });
  it("unknown library ids suggest the closest one", () => {
    const [e] = errorsOf(withBeat({}, { actions: [{ who: "milo", do: "pose", pose: "shurg" }] }));
    expect(e!.path).toBe("beats[0].actions[0].pose");
    expect(e!.message).toContain('did you mean "shrug"');
    expect(e!.expected).toContain("arms-crossed");
    const [s] = errorsOf(withBeat({}, { sfx: [{ id: "record-scrtch" }] }));
    expect(s!.message).toContain('"record-scratch"');
  });
  it("cast references, face framings, duplicates", () => {
    expect(errorsOf(withBeat({}, { speaker: "bob" }))[0]!.path).toBe("beats[0].speaker");
    expect(errorsOf(withBeat({}, { shot: { framing: "close" } }))[0]!.path).toBe("beats[0].shot.on");
    const dup = () => compile([{ id: "a", speaker: "milo", line: "Hi." }, { id: "a", speaker: "june", line: "Yo." }]);
    expect(errorsOf(dup)[0]!.message).toContain('duplicate beat id "a"');
  });
  it("missing or stale voice, bad anchors, silent beats with lines", () => {
    const noVoice = () => compileSkit({ skit: base.skit, lib: library, sets, sfx: sfxLibrary, reactions });
    expect(errorsOf(noVoice)[0]!.message).toContain('no voice for beat "a"');
    expect(errorsOf(withBeat({}, { line: "Hello there, friend!" }))[0]!.message).toContain("line changed");
    expect(errorsOf(withBeat({}, { actions: [{ who: "milo", do: "pose", pose: "shrug", at: { word: "bye" } }] }))[0]!.path).toBe("beats[0].actions[0].at");
    expect(errorsOf(() => compile([{ id: "s", silent: true, line: "Hm." }]))[0]!.path).toBe("beats[0].line");
    expect(errorsOf(withBeat({}, { id: "clip", audio: { source: "file", src: "x.mp3" } }))[0]!.message).toContain("isn't prepared");
  });
});

describe("actions → tracks", () => {
  it("poses lead their anchor; overlapping poses warn and the later wins", () => {
    const r = compile([
      { id: "a", speaker: "milo", line: "Look at this thing.", actions: [
        { who: "milo", do: "pose", pose: "point", at: { word: "this" } },
        { who: "milo", do: "pose", pose: "shrug", at: { word: "this" } },
      ] },
    ]);
    const milo = r.timeline.cast.find((c) => c.id === "milo")!;
    const keys = milo.poseKeys.filter((k) => k.pose !== "idle");
    expect(keys.map((k) => k.pose)).toEqual(["point", "shrug"]);
    expect(keys[0]!.frame).toBe(keys[1]!.frame);
    expect(r.warnings.some((w) => w.message.includes('"shrug" wins'))).toBe(true);
  });
  it("listeners look at the speaker and react on the last word", () => {
    const r = compile([
      { id: "a", speaker: "milo", line: "I love this job.", expression: "happy" },
      { id: "b", speaker: "june", line: "You work here?", expression: "smug" },
    ]);
    const june = r.timeline.cast.find((c) => c.id === "june")!;
    const a = r.timeline.beats[0]!;
    expect(june.gazeKeys[0]!.x).toBeGreaterThan(0); // facing milo: forward
    expect(june.expressionKeys.some((k) => k.expression === reactions.listen.happy && k.frame > a.from && k.frame < a.to)).toBe(true);
  });
  it("a dropped prop stays put when its owner slides away", () => {
    const r = compile([
      { id: "a", speaker: "milo", line: "Oops, my phone.", actions: [
        { who: "milo", do: "hold", prop: "phone", at: { ms: 0 } },
        { who: "milo", do: "drop", at: { word: "my" } },
        { who: "milo", do: "slideTo", mark: "center", at: { fraction: 1 } },
      ] },
    ]);
    const tl = r.timeline;
    const set = sets[tl.set]!;
    const at = (frame: number) => {
      const milo = stageActorsAt(library, tl.cast, set, frame, FPS, tl.width).find((x) => x.id === "milo")!;
      const d = milo.state.props.dropped[0]!;
      return milo.x * tl.width + (milo.facing === "left" ? -1 : 1) * d.x;
    };
    const end = tl.beats[0]!.to + 20;
    expect(Math.abs(at(end) - at(tl.beats[0]!.from + 25))).toBeLessThan(1);
  });
});

import { stageActorsAt } from "../src/engine";

describe("default shot policy", () => {
  const exchange = [
    { id: "a", speaker: "milo", line: "Did you eat my lunch?", expression: "annoyed" },
    { id: "b", speaker: "june", line: "Define eat.", expression: "neutral" },
    { id: "c", speaker: "milo", line: "Chewing. Swallowing.", expression: "neutral" },
    { id: "d", speaker: "june", line: "Then no.", expression: "neutral" },
  ];
  it("opens on two, plain lines stay there, punchline punches in on its last word", () => {
    const { timeline: tl } = compile(exchange);
    expect(tl.shots[0]).toMatchObject({ frame: 0, framing: "two" });
    const d = tl.beats.find((b) => b.id === "d")!;
    expect(tl.shots.filter((s) => s.frame < d.from)).toHaveLength(1);
    expect(tl.punchIns).toHaveLength(1);
    expect(tl.punchIns[0]!.on).toBe("june");
    expect(tl.punchIns[0]!.frame).toBeGreaterThan(d.from);
    // …then the reaction close-up on the listener (never a punch-in *and* a close on the punchline).
    const r = tl.beats.find((b) => b.kind === "reaction")!;
    const cut = tl.shots.find((s) => s.frame >= r.from)!;
    expect(cut).toMatchObject({ on: "milo", frame: r.from + 1 });
    expect(["close", "extreme"]).toContain(cut.framing);
  });
  it("a strong punchline emotion shows in the two-shot first, then cuts to the face", () => {
    const beats = [...exchange.slice(0, 3), { ...exchange[3]!, line: "Then no, I did not eat it.", expression: "angry" }];
    const { timeline: tl } = compile(beats);
    const d = tl.beats.find((b) => b.id === "d")!;
    const cut = tl.shots.find((s) => s.frame >= d.from)!;
    expect(cut).toMatchObject({ framing: "close", on: "june", frame: d.from + 10 });
    expect(tl.punchIns).toHaveLength(0);
  });
  it("a punchline too short for the close-up to hold 1 s gets the punch-in instead", () => {
    const { timeline: tl } = compile([...exchange.slice(0, 3), { ...exchange[3]!, expression: "angry" }]);
    const d = tl.beats.find((b) => b.id === "d")!;
    expect(tl.punchIns.map((p) => p.on)).toEqual(["june"]);
    expect(tl.shots.filter((s) => s.frame >= d.from && s.frame < d.to)).toEqual([]);
  });
  it("close-up budget: no second emotion close-up within 3 s (the punchline pair excepted)", () => {
    const { timeline: tl } = compile([
      { id: "a", speaker: "milo", line: "Guess what I did.", expression: "happy" },
      { id: "s1", silent: true, actions: [{ who: "june", do: "expression", expression: "shocked" }] },
      { id: "s2", silent: true, actions: [{ who: "milo", do: "expression", expression: "crying" }] },
      { id: "b", speaker: "june", line: "Oh no.", expression: "sad" },
    ]);
    const faces = tl.shots.filter((s) => s.framing !== "two" && s.reason.includes("reaction emotion"));
    expect(faces).toHaveLength(1);
    expect(faces[0]).toMatchObject({ framing: "extreme", on: "june" });
  });
  it("a close-up holds ≥ 1 s before the cut back to two", () => {
    const { timeline: tl } = compile([
      { id: "a", speaker: "milo", line: "I quit.", expression: "neutral" },
      { id: "s", silent: true, durationMs: 400, actions: [{ who: "june", do: "expression", expression: "shocked" }] },
      { id: "b", speaker: "june", line: "You can't quit, you're the intern.", expression: "annoyed" },
      { id: "c", speaker: "milo", line: "Watch me.", expression: "smug" },
    ]);
    const face = tl.shots.find((s) => s.framing === "extreme")!;
    const back = tl.shots.find((s) => s.frame > face.frame && s.framing === "two")!;
    expect(back.frame - face.frame).toBeGreaterThanOrEqual(30);
  });
  it("explicit shots override the policy", () => {
    const { timeline: tl } = compile([
      { id: "a", speaker: "milo", line: "Hi there.", shot: { framing: "wide" } },
      { id: "b", speaker: "june", line: "Hello you.", shot: { framing: "medium", on: "june", at: { word: "you" } } },
    ]);
    expect(tl.shots.map((s) => s.framing)).toEqual(["two", "wide", "medium", "close"]);
  });
});

describe("determinism and data", () => {
  it("same input → identical timeline", () => {
    const beats = [{ id: "a", speaker: "milo", line: "Same every time." }];
    expect(JSON.stringify(compile(beats).timeline)).toBe(JSON.stringify(compile(beats).timeline));
  });
  it("skitLines lists spoken beats for the voice source", () => {
    const { skit } = skitOf([{ id: "a", speaker: "milo", line: "Hi.", delivery: "flat" }, { id: "s", silent: true }]);
    expect(skitLines(parseSkit(skit))).toEqual([{ id: "a", speaker: "milo", character: "milo", text: "Hi.", delivery: "flat" }]);
  });
  it("every sound has a license and a known expression table", () => {
    expect(sfxLibrary.sounds.length).toBeGreaterThanOrEqual(10);
    for (const s of sfxLibrary.sounds) expect(s.license.length).toBeGreaterThan(0);
    for (const e of [...Object.values(reactions.listen), ...Object.values(reactions.punchline)]) expect(library.expressions[e]).toBeDefined();
  });
});

describe("diagnostic codes", () => {
  it("every diagnostic carries a stable machine-readable code", () => {
    const codes = (beats: Parameters<typeof skitOf>[0], drop?: string) => {
      const { skit, voice } = skitOf(beats);
      try {
        compileSkit({ skit, voice: { ...voice, lines: voice.lines.filter((l) => l.id !== drop) }, lib: library, sets, sfx: sfxLibrary, reactions });
      } catch (e) {
        return (e as SkitError).diagnostics.map((d) => d.code);
      }
      return [];
    };
    expect(codes([{ id: "a", speaker: "milo", line: "Hi there.", actions: [{ who: "milo", do: "pose", pose: "shurg" }] }])).toEqual(["unknown-pose"]);
    expect(codes([{ id: "b", speaker: "june", line: "No voice here." }], "b")).toEqual(["voice-missing"]);
    try {
      parseSkit({ schemaVersion: 2, meta: { title: "x" }, set: "plain-1", cast: [], beats: [] });
    } catch (e) {
      expect((e as SkitError).diagnostics.every((d) => d.code.startsWith("schema/"))).toBe(true);
    }
  });
});

