import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkDraft, missingAssets, nearest, parseSkit, propFromReply, propPrompt, SkitError, storyPrompt, subtitleSpec } from "../src/engine";

const src = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };
const balloon = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../public/skits/lost-balloon/skit.json"), "utf8"));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe("story format", () => {
  it("described places compile into sets that ride on the program", () => {
    const d = checkDraft(balloon, src);
    expect(Object.keys(d.result.program.sets ?? {}).sort()).toEqual(["place-club", "place-garden", "place-park"]);
    expect(d.result.program.scenes.map((s) => s.timeline.set)).toEqual(["place-club", "place-garden", "place-park"]);
    expect(d.result.program.sets!["place-park"]!.kit).toBe("story");
    expect(d.check.ok).toBe(true);
  });

  it("a single-scene skit can be a place too", () => {
    const one = { schemaVersion: 2, meta: { title: "One", aspect: "16:9" }, style: "story", place: { setting: "beach" }, cast: [{ id: "pim", character: "pim", mark: "center" }], beats: [{ id: "a", speaker: "pim", line: "Sand!" }] };
    expect(checkDraft(one, src).result.program.sets!["place-main"]!.palette).toBe("story-beach");
  });

  it("set and place together are refused", () => {
    const bad = clone(balloon);
    bad.scenes[0].set = "story-park";
    expect(() => parseSkit(bad)).toThrow(SkitError);
  });

  it("the story style drops the punchline rules and lowers the captions", () => {
    const comedy = clone(balloon);
    delete comedy.style;
    const findings = (doc: unknown) => checkDraft(doc, src).check.findings.map((f) => f.check);
    expect(findings(balloon)).not.toContain("punchline-reaction");
    expect(findings(comedy)).toContain("punchline-reaction");
    expect(subtitleSpec({ id: "story" }).y).toBeGreaterThan(subtitleSpec({ id: "classic" }).y);
  });
});

describe("missing assets", () => {
  it("a catalog-only story has none", () => {
    expect(missingAssets(parseSkit(balloon), { lib: library, sets })).toEqual([]);
  });

  it("names each gap with the cheapest rung", () => {
    const doc = clone(balloon);
    doc.cast.push({ id: "zed", character: "zebra", mark: "center" });
    doc.cast.splice(3, 1);
    doc.scenes[1].beats[0].actions.push({ who: "tofu", do: "hold", prop: "baloon" }, { who: "tofu", do: "hold", prop: "rocket-ship" }, { who: "tofu", do: "pose", pose: "cartwheel" });
    doc.scenes[1].beats[1].expression = "hapy";
    delete doc.scenes[2].place;
    doc.scenes[2].set = "moon-base";
    const got = Object.fromEntries(missingAssets(parseSkit(doc), { lib: library, sets }).map((m) => [`${m.kind}:${m.id}`, m]));
    expect(got["character:zebra"]!.rung).toBe("spec");
    expect(got["prop:baloon"]).toMatchObject({ rung: "near", suggestion: "balloon" });
    expect(got["prop:rocket-ship"]!.rung).toBe("draw");
    expect(got["pose:cartwheel"]!.rung).toBe("cheat");
    expect(got["expression:hapy"]).toMatchObject({ rung: "near", suggestion: "happy" });
    expect(got["set:moon-base"]!.rung).toBe("place");
  });

  it("nearest prefers aliases and small typos, and gives up on strangers", () => {
    expect(nearest("tellyscope", [{ id: "telescope" }, { id: "torch" }])).toBe("telescope");
    expect(nearest("mug", [{ id: "cup", also: ["mug", "coffee cup"] }])).toBe("cup");
    expect(nearest("submarine", [{ id: "cup" }, { id: "phone" }])).toBeUndefined();
  });
});

describe("story writer prompt", () => {
  it("names the format, the places, the shape cast and how to add a character", () => {
    const { system, prompt } = storyPrompt(library, { idea: "Pim learns to swim", seconds: 45 });
    for (const s of ['"style": "story"', "clubhouse", "apple-tree", "tofu (rabbit", "otto (hippo", '"build": "shape"', "colour tokens"]) expect(system).toContain(s);
    expect(prompt).toContain("Pim learns to swim");
    expect(prompt).toContain("45 seconds");
  });
});

describe("workspace props (the draw rung)", () => {
  const shellDoc = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../public/skits/biscuit-shell/skit.json"), "utf8"));

  it("a story's own drawn prop compiles, rides on the program, and is not reported missing", () => {
    const d = checkDraft(shellDoc, src);
    expect(Object.keys(d.result.program.props ?? {})).toEqual(["seashell"]);
    expect(missingAssets(parseSkit(shellDoc), { lib: library, sets })).toEqual([]);
    expect(d.check.ok).toBe(true);
  });

  it("indoor seats get a sofa", () => {
    const d = checkDraft(shellDoc, src);
    expect(d.result.program.sets!["place-home"]!.layers.some((l) => l.part === "story-sofa" && l.seatFor.includes("left"))).toBe(true);
  });

  it("only drawn props may ride in a story (coded kinds need code)", () => {
    const bad = clone(shellDoc);
    bad.props = [{ schemaVersion: 1, id: "my-phone", kind: "phone", name: "Phone", category: "story", colors: { body: "#333333" } }];
    expect(() => parseSkit(bad)).toThrow(SkitError);
  });

  it("a model's prop drawing is held to the bounds", () => {
    const ok = JSON.stringify(shellDoc.props[0]);
    expect(propFromReply(ok).id).toBe("seashell");
    const far = clone(shellDoc.props[0]);
    far.parts[0] = { shape: "circle", x: 0.9, y: 0, r: 0.1 };
    expect(() => propFromReply(JSON.stringify(far))).toThrow(SkitError);
    expect(propPrompt("a red kite", []).prompt).toContain('"a-red-kite"');
  });
});

describe("speaker-offstage", () => {
  it("catches a line spoken from off stage (a scene that forgot a mark)", () => {
    const doc = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../public/skits/biscuit-shell/skit.json"), "utf8"));
    const share = doc.scenes.find((s: { id: string }) => s.id === "share");
    share.cast = share.cast.map((c: { id: string; mark?: string }) => (c.id === "pim" ? { id: "pim" } : c));
    const found = checkDraft(doc, src).check.findings.filter((f) => f.check === "speaker-offstage");
    expect(found.map((f) => f.message).join()).toContain('"pim" speaks "p2"');
  });
});
