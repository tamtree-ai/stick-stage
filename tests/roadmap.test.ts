import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, series, sets, sfxLibrary } from "../src/data";
import { applyLanguage, characterDistance, checkDraft, compileSkit, fontFor, framesTouched, parseBrief, parseSkit, placeholderVoice, planSegments, skitLines, speechMotion, tokenize, tooAlike, type SkitInput } from "../src/engine";
import { compile, skitOf } from "./director-fixtures";

const src = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };
const line = (id: string, speaker: string, text: string, extra: Record<string, unknown> = {}) => ({ id, speaker, line: text, expression: "neutral", ...extra });
const cast = (r: ReturnType<typeof compile>, id: string) => r.timeline.cast.find((c) => c.id === id);

describe("speech motion", () => {
  const beats = [
    line("a", "milo", "You really thought that was the plan?"),
    line("b", "june", "First the cup, then the bit."),
    line("c", "milo", "Nope."),
    line("d", "june", "That is the whole joke.", { punchline: true }),
  ];

  it("moves a speaker who has no authored pose, and stays still when speech motion is off", () => {
    const on = compile(beats);
    const off = compile(beats, { speechMotion: "off" });
    expect(cast(on, "milo")?.poseKeys.some((k) => k.pose === "hold-out")).toBe(true);
    expect(cast(off, "milo")?.poseKeys.some((k) => k.pose === "hold-out")).toBe(false);
    expect(cast(on, "milo")?.nodKeys.length).toBeGreaterThan(0);
    expect(cast(on, "june")?.poseKeys.some((k) => k.pose === "shrug")).toBe(true);
  });

  it("lets an authored pose win", () => {
    const held = compile([line("a", "milo", "You really thought that was the plan?", { actions: [{ who: "milo", do: "pose", pose: "arms-crossed" }] })]);
    const poses = cast(held, "milo")?.poseKeys.map((k) => k.pose) ?? [];
    expect(poses).toContain("arms-crossed");
    expect(poses).not.toContain("hold-out");
  });

  it("keeps a low-energy character's hands still", () => {
    const motion = speechMotion(
      { id: "a", speaker: "moss", text: "You really thought that was the plan?", audio: "a.wav", durationMs: 1200, words: [{ text: "thought", startMs: 80, endMs: 400 }], mouthCues: [], source: { words: "estimated", mouth: "estimated" } },
      { energy: 0.22 },
    );
    expect(motion.gesture).toBeUndefined();
    expect(motion.nods.length).toBeGreaterThan(0);
  });
});

describe("named gags", () => {
  it("expands a double-take into poses the library already has", () => {
    const r = compile([line("a", "milo", "The plant is named Kevin.", { actions: [{ who: "june", do: "gag", gag: "double-take" }] })]);
    expect(cast(r, "june")?.poseKeys.length).toBeGreaterThan(0);
    expect(r.warnings.map((w) => w.code)).not.toContain("unknown-gag");
  });
});

describe("directing styles", () => {
  const beats = [line("a", "milo", "Setup line about the meeting."), line("b", "june", "The punchline lands here.", { punchline: true })];

  it("opens a sitcom wide and a classic skit on two", () => {
    expect(compile(beats).timeline.shots[0]?.framing).toBe("two");
    expect(compile(beats, { style: "sitcom" }).timeline.shots[0]?.framing).toBe("wide");
    expect(compile(beats, { style: "sitcom" }).timeline.sfx.some((s) => s.id === "laugh")).toBe(true);
  });

  it("inherits a series style and badges the cover", () => {
    const { skit, voice } = skitOf(beats, { meta: { title: "ep", series: { id: "milo-june", season: 1, episode: 3 } } });
    const r = compileSkit({ skit, voice, ...src, series });
    expect(r.program.cover?.badge).toBe("S1 · E3");
  });
});

describe("cold open", () => {
  it("prepends a teaser", () => {
    const beats = [line("a", "milo", "Setup line about the meeting."), line("b", "june", "The punchline lands here.", { punchline: true })];
    const r = compile(beats, { coldOpen: "teaser" });
    expect(r.program.hook?.kind).toBe("teaser");
    expect(r.program.hook!.prefixFrames).toBeGreaterThan(20);
  });
});

describe("languages", () => {
  it("dubs lines and slams, and segments Japanese", () => {
    const { skit } = skitOf(
      [line("a", "milo", "The cup is empty."), line("b", "june", "That was the joke.", { text: [{ type: "slam", value: "EMPTY" }], punchline: true })],
      {
        meta: { title: "cups", language: "en" },
        i18n: {
          es: { lines: { a: "La taza está vacía.", b: "Ese era el chiste." }, slams: { b: "VACIA" } },
          ja: { lines: { a: "コップは空です。", b: "それがオチです。" }, slams: { b: "空" } },
        },
      },
    );
    const es = checkDraft(skit, src, { lang: "es" });
    expect(es.result.doc.beats?.[0]?.line).toContain("taza");
    expect(es.result.timeline.slams.some((s) => s.text.includes("VACIA"))).toBe(true);
    const jaDoc = applyLanguage(parseSkit(skit), "ja");
    const ja = compileSkit({ skit, voice: placeholderVoice(skitLines(jaDoc), "ja"), ...src, lang: "ja" });
    expect(ja.doc.beats?.[0]?.line).toContain("コップ");
    expect(ja.timeline.language).toBe("ja");
    expect(tokenize("コップは空です。", "ja").length).toBeGreaterThan(1);
    expect(fontFor("ja").family).toBe("Noto Sans JP");
    expect(fontFor("ar").direction).toBe("rtl");
    expect(fontFor("es").direction).toBe("ltr");
  });
});

describe("workspace characters", () => {
  it("keeps Milo and June distinct and flags a clone", () => {
    const milo = library.characters.milo!;
    const june = library.characters.june!;
    expect(tooAlike(characterDistance(milo, june))).toBe(false);
    expect(tooAlike(characterDistance(milo, { ...milo, id: "milo-2" }))).toBe(true);
  });

  it("lets a brief cast a character that is not in the catalog", () => {
    const ada = { ...library.characters.milo!, id: "ada", displayName: "Ada" };
    const world = { characters: Object.keys(library.characters), sets: Object.keys(sets), templates: [], expressions: ["neutral"], props: [], notes: {} };
    const brief = parseBrief({ topic: "A meeting that runs long", cast: [{ id: "ada", character: "ada" }], characters: [ada] }, world);
    expect(brief.cast[0]?.character).toBe("ada");
    expect(() => parseBrief({ topic: "A meeting that runs long", cast: [{ id: "z", character: "nope" }] }, world)).toThrow(/nope/);
  });
});

describe("camera cuts and scene cache", () => {
  it("exposes cuts beside the check", () => {
    const { skit } = skitOf([line("a", "milo", "Setup line about the meeting."), line("b", "june", "The punchline lands here.", { punchline: true })]);
    const d = checkDraft(skit, src);
    expect(d.cuts[0]?.reason).toMatch(/two|wide/);
    expect(d.cuts.length).toBeGreaterThan(0);
  });

  it("uses a prepared voice for timing when one is passed", () => {
    const { skit } = skitOf([line("a", "milo", "Setup line about the meeting."), line("b", "june", "The punchline lands here.", { punchline: true })]);
    const estimated = checkDraft(skit, src);
    const voice = placeholderVoice(estimated.lines);
    voice.lines[0]!.durationMs = 8000;
    const voiced = checkDraft(skit, src, { voice });
    expect(voiced.estimatedDurationSec).toBeGreaterThan(estimated.estimatedDurationSec);
  });

  it("re-renders less than half the frames when the last scene of four changes", () => {
    const scene = (id: string, text: string) => ({
      id,
      beats: [line(`${id}a`, "milo", text), line(`${id}b`, "june", "And then they both look at the cup.")],
    });
    const skit: SkitInput = {
      schemaVersion: 2,
      meta: { title: "four" },
      set: "plain-1",
      cast: [
        { id: "milo", character: "milo", mark: "left" },
        { id: "june", character: "june", mark: "right" },
      ],
      scenes: [scene("s1", "Scene one starts the bit."), scene("s2", "Scene two keeps it going."), scene("s3", "Scene three turns it."), scene("s4", "Scene four is the last room.")],
    };
    const doc = parseSkit(skit);
    const r = compileSkit({ skit, voice: placeholderVoice(skitLines(doc)), ...src });
    const plan = planSegments(r.program, "engine", {});
    const total = plan.reduce((n, s) => n + (s.frames[1] - s.frames[0] + 1), 0);
    expect(framesTouched(plan, "s4")).toBeLessThan(total / 2);
  });
});
