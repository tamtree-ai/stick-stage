import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, migrate, parseSkit, postText, programSrt, SkitError, skitLines, type CheckReport, type Diagnostic, type SkitInput } from "../src/engine";
import { validate } from "../src/server/validate";
import { compile, fakeVoice, skitOf } from "./director-fixtures";
import { PROJECT } from "./server-fixtures";

type BeatIn = NonNullable<SkitInput["beats"]>[number];
const narrator = { id: "narrator", voice: { provider: "google", voiceId: "en-US-Studio-Q", say: "Fred" } };
const withNarrator = (beats: BeatIn[], extra: Partial<SkitInput> = {}) => compile(beats, { narrator, ...extra });
const check = (r: ReturnType<typeof compile>): CheckReport => checkSkit({ result: r, lib: library, sets, safeArea });
const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};

const story: BeatIn[] = [
  { id: "a", speaker: "milo", line: "This dashboard is useless." },
  { id: "b", speaker: "june", line: "Sarah wants to change it." },
  { id: "c", speaker: "narrator", line: "And suddenly it is his dashboard.", focus: "milo", punchline: true },
];

describe("narrator (voice-over)", () => {
  it("v1 skits migrate to v2 unchanged", () => {
    const { skit } = skitOf([{ id: "a", speaker: "milo", line: "Hi." }]);
    const r = migrate("skit", { ...skit, schemaVersion: 1 });
    expect(r.doc).toEqual({ ...skit, schemaVersion: 2 });
    expect(r.applied).toHaveLength(1);
  });
  it("voice-over lines go to the voice source flagged as narrator", () => {
    const { skit } = skitOf(story, { narrator });
    const lines = skitLines(parseSkit(skit));
    expect(lines.find((l) => l.id === "c")).toMatchObject({ speaker: "narrator", character: "narrator", narrator: true });
    expect(lines.find((l) => l.id === "a")!.narrator).toBeUndefined();
  });
  it("nobody mouths the narrator and nobody turns to it", () => {
    const r = withNarrator(story);
    const c = r.timeline.beats.find((b) => b.id === "c")!;
    expect(c.narrator).toBe(true);
    for (const m of r.timeline.cast) expect(m.speech.some((s) => s.startFrame >= c.from)).toBe(false);
    const june = r.timeline.cast.find((m) => m.id === "june")!;
    expect(june.gazeKeys.some((k) => k.frame >= c.from - 2 && k.frame < c.to)).toBe(false);
  });
  it("a voice-over punchline punches in on focus, and focus gives the reaction", () => {
    const r = withNarrator(story);
    const c = r.timeline.beats.find((b) => b.id === "c")!;
    expect(r.timeline.punchIns.some((p) => p.on === "milo" && p.frame >= c.from && p.frame <= c.to)).toBe(true);
    const reaction = r.timeline.beats.find((b) => b.kind === "reaction")!;
    expect(r.timeline.shots.some((s) => s.frame >= reaction.from && s.on === "milo")).toBe(true);
    expect(check(r).findings.filter((f) => f.level === "error")).toEqual([]);
  });
  it("without focus the punchline needs a slam and a reaction (or reaction: false)", () => {
    const bare = story.map((b) => (b.id === "c" ? { ...b, focus: undefined } : b));
    const ids = check(withNarrator(bare)).findings.filter((f) => f.level === "error").map((f) => f.check);
    expect(ids).toEqual(expect.arrayContaining(["punchline-camera", "punchline-reaction"]));
    const slammed = bare.map((b) => (b.id === "c" ? { ...b, reaction: false as const, text: [{ type: "slam" as const, value: "HIS.", at: { word: "his" } }] } : b));
    expect(check(withNarrator(slammed)).findings.filter((f) => f.level === "error")).toEqual([]);
  });
  it("an emotion acted under the voice-over gets its close-up", () => {
    const beats: BeatIn[] = [
      { id: "a", speaker: "narrator", line: "Then the company announces a new team structure.", actions: [{ who: "milo", do: "expression", expression: "shocked", at: { word: "structure" } }] },
      { id: "b", speaker: "milo", line: "My project.", punchline: true },
    ];
    const r = withNarrator(beats);
    expect(r.timeline.shots.some((s) => s.on === "milo" && s.reason.startsWith("voice-over emotion"))).toBe(true);
    expect(check(r).findings.filter((f) => f.check === "emotion-closeups" && f.level === "error")).toEqual([]);
  });
  it("no voice-over close-up the scene ends too soon to hold", () => {
    const beats: BeatIn[] = [
      { id: "a", speaker: "milo", line: "Hello there.", punchline: true, reaction: false },
      { id: "b", speaker: "narrator", line: "He was very pleased with himself.", actions: [{ who: "milo", do: "expression", expression: "shocked", at: { word: "himself." } }] },
    ];
    const r = withNarrator(beats, { timing: { leadInMs: 300, gapMs: 250, tailMs: 200 } });
    expect(r.timeline.shots.some((s) => s.reason.startsWith("voice-over emotion"))).toBe(false);
    const f = check(r).findings.filter((x) => x.check === "emotion-closeups");
    expect(f.map((x) => x.level)).toEqual(["info"]);
    // With room to hold, the same moment gets its close-up.
    const roomy = withNarrator(beats, { timing: { leadInMs: 300, gapMs: 250, tailMs: 2000 } });
    expect(roomy.timeline.shots.some((s) => s.reason.startsWith("voice-over emotion"))).toBe(true);
  });
  it("diagnostics: undeclared narrator, id clash, focus misuse, narrator expression", () => {
    const [undeclared] = errorsOf(() => compile(story));
    expect(undeclared!.path).toBe("beats[2].speaker");
    expect(undeclared!.example).toContain('"narrator"');
    expect(errorsOf(() => parseSkit(skitOf(story, { narrator: { id: "milo" } }).skit))[0]!.path).toBe("narrator.id");
    const focusOnCast = story.map((b) => (b.id === "a" ? { ...b, focus: "june" } : b));
    expect(errorsOf(() => withNarrator(focusOnCast)).map((d) => d.code)).toContain("focus-not-narration");
    const face = story.map((b) => (b.id === "c" ? { ...b, expression: "happy" } : b));
    expect(errorsOf(() => withNarrator(face)).map((d) => d.code)).toContain("narrator-expression");
  });
  it("captions: narrator pages are flagged and styled; post text and SRT name the narrator", () => {
    const r = withNarrator(story, { narrator: { ...narrator, captionStyle: "boxed" } });
    expect(r.timeline.narratorCaption).toBe("boxed");
    const pages = r.timeline.pages;
    expect(pages.filter((p) => p.narrator).map((p) => p.text.trim()).join(" ")).toBe("And suddenly it is his dashboard.");
    expect(pages.filter((p) => !p.narrator).every((p) => !p.text.includes("suddenly"))).toBe(true);
    const srt = programSrt(r.program);
    expect(srt).toContain("Narrator: And");
    expect(srt.match(/Narrator:/g)).toHaveLength(1);
    expect(postText(r.doc, library)).toContain("Narrator: And suddenly it is his dashboard.");
  });
  it("narrator-dominant: warns when voice-over is most of the talking; explainers target 30–60 s", () => {
    const heavy: BeatIn[] = [
      { id: "a", speaker: "narrator", line: "Once something becomes ours we tend to value it more than it is worth.", focus: "milo" },
      { id: "b", speaker: "milo", line: "Mine." },
      { id: "c", speaker: "narrator", line: "Psychologists call this the endowment effect and it is everywhere.", focus: "milo", punchline: true },
    ];
    const r = check(withNarrator(heavy));
    expect(r.findings.some((f) => f.check === "narrator-dominant" && f.level === "warning")).toBe(true);
    expect(r.findings.find((f) => f.check === "length")!.message).toContain("explainers target 30–60 s");
    expect(check(withNarrator(story)).findings.some((f) => f.check === "narrator-dominant")).toBe(false);
  });
  it("POST /validate gives narrator lines the narrator's voice hint", () => {
    const { skit } = skitOf(story, { narrator });
    const res = validate(PROJECT, { skit });
    expect(res.lines.find((l) => l.id === "c")!.voice).toEqual({ provider: "google", voiceId: "en-US-Studio-Q", settings: {} });
    expect(res.lines.find((l) => l.id === "a")!.voice).toEqual(validate(PROJECT, { skit: skitOf([story[0]!]).skit }).lines[0]!.voice);
  });
  it("a narrator-only scene with nobody on stage compiles", () => {
    const skit: SkitInput = {
      schemaVersion: 2,
      meta: { title: "vo" },
      narrator,
      cast: [{ id: "milo", character: "milo", mark: "center" }],
      scenes: [
        { id: "a", set: "plain-1", cast: [], beats: [{ id: "a1", speaker: "narrator", line: "Nobody here." }] },
        { id: "b", set: "office-1", beats: [{ id: "b1", speaker: "milo", line: "I'm here.", punchline: true }] },
      ],
    };
    const voice = fakeVoice(skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 1000 })));
    const r = compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
    expect(r.scenes[0]!.timeline.cast).toEqual([]);
    expect(checkSkit({ result: r, lib: library, sets, safeArea }).findings.filter((f) => f.level === "error")).toEqual([]);
  });
});
