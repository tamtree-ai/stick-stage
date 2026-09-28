import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { castNotes, catalog, library, sets } from "../src/data";
import { draftPrompt, expandBeatGags, fromPremise, GAGS, parseSkit, premiseFromReply, skitFromReply, skitWriterLines, writerWorld, type Action } from "../src/engine";

const world = writerWorld(catalog, castNotes);
const cast = [
  { id: "milo", character: "milo" },
  { id: "june", character: "june" },
];

const stage = (lines: Record<string, unknown>[], extra: Record<string, unknown> = {}) =>
  fromPremise({ schemaVersion: 1, template: "exchange", title: "Fries", set: "living-1", cast, lines, ...extra }, library, sets);

const propMoves = (actions: readonly { do: string }[] | undefined) => (actions ?? []).filter((a) => a.do === "hold" || a.do === "putAway");

describe("staging a line prop", () => {
  it("holds a new prop in the right hand", () => {
    const beat = stage([{ who: "milo", text: "These fries are my whole personality.", prop: "fries" }]).beats![0]!;
    expect(propMoves(beat.actions)).toEqual([{ who: "milo", do: "hold", prop: "fries", hand: "R", at: { ms: 0 } }]);
  });

  it("does not pick the same prop up again", () => {
    const beats = stage([
      { who: "milo", text: "These fries are my whole personality.", prop: "fries" },
      { who: "milo", text: "Still the fries.", prop: "fries", role: "punchline" },
    ]).beats!;
    expect(propMoves(beats[1]!.actions)).toEqual([]);
  });

  it("replaces the prop already in that hand", () => {
    const beats = stage([
      { who: "milo", text: "Fries.", prop: "fries" },
      { who: "milo", text: "A burger instead.", prop: "burger", role: "punchline" },
    ]).beats!;
    expect(propMoves(beats[1]!.actions)).toEqual([{ who: "milo", do: "hold", prop: "burger", hand: "R", at: { ms: 0 } }]);
  });

  it("puts the prop away", () => {
    const beats = stage([
      { who: "milo", text: "Fries.", prop: "fries" },
      { who: "milo", text: "Hands empty.", prop: "none", role: "punchline" },
    ]).beats!;
    expect(propMoves(beats[1]!.actions)).toEqual([{ who: "milo", do: "putAway", hand: "R", at: { ms: 0 } }]);
  });

  it("gives the interview host the left hand and lets the gag's cup win", () => {
    const skit = fromPremise(
      {
        schemaVersion: 1,
        template: "interview",
        title: "Fries",
        set: "street-1",
        cast: [
          { id: "june", character: "june", label: "reporter" },
          { id: "milo", character: "milo" },
        ],
        lines: [
          { who: "june", text: "Want a fry?", prop: "fries" },
          { who: "milo", text: "I brought water.", prop: "water-bottle", gag: "spit-take", role: "punchline" },
        ],
      },
      library,
      sets,
    );
    const parsed = parseSkit(skit);
    const beats = parsed.beats!;
    const host = propMoves(beats[0]!.actions).find((a) => a.do === "hold");
    expect(host).toMatchObject({ who: "june", prop: "fries", hand: "L" });
    const guest = beats[1]!;
    expect(guest.actions[0]).toMatchObject({ do: "hold", prop: "water-bottle", hand: "R" });
    expect(guest.actions.find((a) => a.do === "gag")).toMatchObject({ gag: "spit-take" });
    const expanded = expandBeatGags(guest, GAGS, () => "june").beat.actions.filter((a) => a.do === "hold");
    expect(expanded.at(-1)).toMatchObject({ prop: "cup", hand: "R" });
  });

  it("swaps a two-handed gesture for a point while something is held", () => {
    const beats = stage([
      { who: "milo", text: "Fries in hand.", prop: "fries", role: "setup" },
      { who: "milo", text: "First push.", role: "escalation" },
      { who: "milo", text: "Second push.", role: "escalation" },
      { who: "june", text: "Done.", role: "punchline" },
    ]).beats!;
    expect(beats[1]!.actions!.find((a) => a.do === "pose")).toMatchObject({ pose: "point" });
    expect(beats[2]!.actions!.find((a) => a.do === "pose")).toMatchObject({ pose: "point" });
  });

  it("drops the prop at a scene cut", () => {
    const skit = fromPremise(
      {
        schemaVersion: 1,
        template: "exchange",
        title: "Fries",
        cast,
        scenes: [
          { set: "living-1", lines: [{ who: "milo", text: "Fries here.", prop: "fries" }] },
          { set: "park-1", lines: [{ who: "milo", text: "Nothing in the park." }, { who: "june", text: "Correct.", role: "punchline" }] },
        ],
      },
      library,
      sets,
    );
    expect(propMoves(skit.scenes![1]!.beats[0]!.actions)).toEqual([]);
  });

  it("ignores a prop on a text slam", () => {
    const skit = fromPremise(
      { schemaVersion: 1, template: "text-slam", title: "t", cast: [{ id: "milo", character: "milo" }], lines: [{ text: "FRIES", prop: "fries" }, { text: "NO", prop: "burger" }] },
      library,
      sets,
    );
    expect(skit.beats!.every((b) => !(b.actions ?? []).some((a) => a.do === "hold"))).toBe(true);
  });
});

describe("the writer names a prop", () => {
  const reply = (prop: string) =>
    JSON.stringify({
      title: "The fries",
      scenes: [
        {
          lines: [
            { who: "milo", text: "These fries are my whole personality.", expression: "neutral", prop },
            { who: "june", text: "That is a lot of salt.", expression: "deadpan" },
            { who: "june", text: "Drink some water.", expression: "smug", slam: "WATER" },
          ],
        },
      ],
    });

  it("resolves an alias and drops an unknown prop with a warning", () => {
    const hit = premiseFromReply(reply("chips"), { topic: "fries", aspect: "9:16", cast, template: "exchange", set: "living-1" }, world);
    expect(hit.premise.lines?.[0]?.prop).toBe("fries");
    expect(hit.warnings.map((w) => w.code)).not.toContain("prop");
    const miss = premiseFromReply(reply("kebab"), { topic: "fries", aspect: "9:16", cast, template: "exchange", set: "living-1" }, world);
    expect(miss.premise.lines?.[0]?.prop).toBeUndefined();
    expect(miss.warnings.find((w) => w.code === "prop")?.message).toMatch(/kebab/);
    const water = premiseFromReply(reply("water"), { topic: "fries", aspect: "9:16", cast, template: "exchange", set: "living-1" }, world);
    expect(water.premise.lines?.[0]?.prop).toBe("water-bottle");
  });

  it("lists props by category and names the ones the brief asked for", () => {
    const { system, prompt } = draftPrompt({ topic: "fries and water", aspect: "9:16", cast, props: ["fries", "water-bottle"] }, world);
    expect(system).toContain("prop: optional");
    expect(system).toMatch(/food:.*\bfries\b/);
    expect(system).toMatch(/drinks:.*\bwater-bottle\b/);
    expect(system).toContain('"prop": "cup"');
    expect(system).toContain("shots, camera, poses or timing");
    expect(prompt).toContain("The client wants these on screen: fries, water-bottle.");
  });

  it("round-trips a line prop through a change", () => {
    const before = parseSkit(stage([{ who: "milo", text: "These fries are my whole personality.", prop: "fries" }, { who: "june", text: "Bold.", role: "punchline" }]));
    const lines = skitWriterLines(before);
    expect(lines[0]?.prop).toBe("fries");
    const kept = skitFromReply(JSON.stringify({ lines }), before, world).skit as { beats: { actions: Action[] }[] };
    expect(kept.beats[0]!.actions).toEqual(before.beats![0]!.actions);
    const swapped = skitFromReply(JSON.stringify({ lines: [{ ...lines[0], prop: "burger" }, lines[1]] }), before, world).skit as { beats: { actions: Action[] }[] };
    expect(propMoves(swapped.beats[0]!.actions)).toEqual([{ who: "milo", do: "hold", prop: "burger", hand: "R", at: { ms: 0 } }]);
  });
});

describe("props-lab", () => {
  it("stages fries in one hand and a water bottle in the other", () => {
    const premise = JSON.parse(fs.readFileSync(new URL("../public/skits/props-lab/premise.json", import.meta.url), "utf8"));
    const skit = fromPremise(premise, library, sets);
    const held = (skit.beats ?? []).flatMap((b) => propMoves(b.actions));
    expect(held).toEqual([
      { who: "milo", do: "hold", prop: "fries", hand: "R", at: { ms: 0 } },
      { who: "june", do: "hold", prop: "water-bottle", hand: "R", at: { ms: 0 } },
    ]);
  });
});
