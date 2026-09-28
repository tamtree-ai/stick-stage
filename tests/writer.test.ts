import { describe, expect, it } from "vitest";
import { castNotes, catalog, library, sets } from "../src/data";
import { fromPremise, parseSkit, ReplyError, WRITER, draftPrompt, premiseFromReply, revisePrompt, skitFromReply, writerWorld, type Brief } from "../src/engine";

const world = writerWorld(catalog, castNotes);
const brief = (extra: Partial<Brief> = {}): Brief => ({
  topic: "returning a gift",
  aspect: "9:16",
  tone: "dry",
  cast: [
    { id: "milo", character: "milo" },
    { id: "june", character: "june" },
  ],
  allowed_sets: ["cafe-1", "office-1", "park-1"],
  ...extra,
});

const line = (who: string, text: string, expression = "neutral") => ({ who, text, expression });
const scenes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    set: i === 0 ? "cafe-1" : "office-1",
    pov: i === 0 ? "POV: the counter" : undefined,
    lines: [line("milo", `Setup ${i} is already specific.`), line("june", `Turn ${i} pushes it.`, "deadpan"), line("june", `Landing ${i} is the joke.`, i === n - 1 ? "smug" : "annoyed")],
  }));

const reply = (n = 1) =>
  JSON.stringify({
    template: "exchange",
    title: "The receipt",
    description: "A gift comes back.",
    hashtags: ["stickfigure", "gift"],
    scenes: scenes(n).map((s, i) => ({ ...s, lines: s.lines.map((l, j) => (i === n - 1 && j === s.lines.length - 1 ? { ...l, slam: "JOKE" } : l)) })),
  });

describe("writer prompt", () => {
  it("names set ids and not their descriptions, and records w1", () => {
    const { system, prompt } = draftPrompt(brief(), world);
    expect(WRITER).toBe("w1");
    expect(system).toContain("cafe-1");
    expect(system).not.toContain("coffee");
    expect(system).toContain("sincere straight man");
    expect(system).not.toContain('"schemaVersion"');
    expect(prompt).toBe("Topic: returning a gift\nTone: dry");
  });
  it("a character without notes is played straight", () => {
    const { system } = draftPrompt(brief({ cast: [{ id: "milo", character: "milo" }] }), { ...world, notes: {} });
    expect(system).toContain("no notes; play it straight.");
  });
  it("omits a set and a template the brief already fixed", () => {
    const { system } = draftPrompt(brief({ template: "exchange", scenes: 3, sets: ["cafe-1", "office-1"] }), world);
    expect(system).toContain('scene 1 is "cafe-1"');
    expect(system).toContain('scene 2 is "office-1"');
    expect(system).toContain("Exactly 3 scenes");
    expect(system).toContain('template is "exchange"');
    expect(system).not.toContain('"template":');
  });
  it("a change prompt sends lines and not the staging", () => {
    const skit = fromPremise({ schemaVersion: 1, template: "exchange", title: "t", cast: brief().cast, lines: [{ who: "milo", text: "One two three." }, { who: "june", text: "Four five six." }] }, library, sets);
    const { system, prompt } = revisePrompt(parseSkit(skit), "Make the ending meaner.", world);
    expect(system).toContain('"lines"');
    expect(prompt).toContain("Make the ending meaner.");
    expect(prompt).toContain("One two three.");
    expect(prompt).not.toContain("pauseBeforeMs");
    expect(prompt).not.toContain("actions");
  });
});

describe("premise from a draft reply", () => {
  it("fills cast, roles and one scene from the brief", () => {
    const { premise, warnings } = premiseFromReply(reply(), brief({ template: "exchange", set: "cafe-1" }), world);
    expect(warnings.map((w) => w.code)).not.toContain("mood");
    expect(premise).toMatchObject({ schemaVersion: 1, template: "exchange", set: "cafe-1", cast: brief().cast });
    expect(premise.lines?.map((l) => l.role)).toEqual(["setup", "escalation", "punchline"]);
    expect(premise.scenes).toBeUndefined();
    const skit = fromPremise(premise, library, sets);
    expect(skit.beats?.at(-1)).toMatchObject({ punchline: true });
  });
  it("forces the brief's scene count and keeps a fixed set", () => {
    const { premise, warnings } = premiseFromReply(reply(1), brief({ template: "exchange", scenes: 2, sets: ["cafe-1"] }), world);
    expect(warnings.map((w) => w.code)).toContain("scene-count");
    expect(premise.scenes).toHaveLength(2);
    expect(premise.scenes?.[0]?.set).toBe("cafe-1");
    expect(premise.lines).toBeUndefined();
  });
  it("plays an unknown mood as neutral and falls back from an unknown set", () => {
    const raw = JSON.parse(reply()) as { scenes: { set: string; lines: { expression: string }[] }[] };
    raw.scenes[0]!.set = "moon-base";
    raw.scenes[0]!.lines[0]!.expression = "earnest";
    const { premise, warnings } = premiseFromReply(JSON.stringify(raw), brief(), world);
    expect(warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["set-fallback", "mood", "line-count"]));
    expect(premise.lines?.[0]?.expression).toBe("neutral");
    expect(["cafe-1", "office-1", "park-1"]).toContain(premise.set);
  });
  it("a reply that is not JSON asks for one repair", () => {
    expect(() => premiseFromReply("sure, here is the skit", brief(), world)).toThrow(ReplyError);
    try {
      premiseFromReply("nope", brief(), world);
    } catch (e) {
      expect(e).toBeInstanceOf(ReplyError);
      expect((e as ReplyError).prompt).toContain("not JSON");
      expect((e as ReplyError).diagnostics[0]?.code).toBe("reply-json");
    }
  });
});

describe("a change reply applied to a skit", () => {
  const staged = () =>
    parseSkit(
      fromPremise(
        {
          schemaVersion: 1,
          template: "exchange",
          title: "t",
          cast: brief().cast,
          scenes: [
            { set: "office-1", lines: [{ who: "milo", text: "The desk is the setup." }, { who: "june", text: "It gets worse here." }] },
            { set: "park-1", lines: [{ who: "milo", text: "The bench is worse." }, { who: "june", text: "The punchline lands.", slam: "LANDS" }] },
          ],
        },
        library,
        sets,
      ),
    );

  it("keeps the staging of an unchanged line, drops one, and moves the punchline", () => {
    const before = staged();
    const kept = before.scenes![0]!.beats[0]!;
    const { skit, warnings } = skitFromReply(
      JSON.stringify({
        lines: [
          { id: "l1", who: "milo", text: "The desk is the setup.", expression: "neutral" },
          { id: "l4", who: "june", text: "A new last line.", expression: "smug" },
          { id: "l5", who: "milo", text: "Brand new.", expression: "confused" },
        ],
      }),
      before,
      world,
    );
    const scenes = (skit as { scenes: { set: string; beats: { id: string; punchline?: boolean; actions?: unknown[] }[] }[] }).scenes;
    expect(scenes[0]!.beats[0]).toEqual(kept);
    expect(scenes.map((s) => s.set)).toEqual(["office-1", "park-1"]);
    expect(scenes[1]!.beats.map((b) => b.id)).toEqual(["l4", "l5"]);
    expect(scenes[1]!.beats.at(-1)?.punchline).toBe(true);
    expect(scenes[0]!.beats.some((b) => b.punchline)).toBe(false);
    expect(warnings.map((w) => w.code)).toContain("lines-dropped");
  });
});
