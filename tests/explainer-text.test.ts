import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { cardLayout, checkSkit, compileSkit, listLayout, parseSkit, SkitError, skitLines, textBand, inside, type Diagnostic, type SkitInput } from "../src/engine";
import { compile, fakeVoice } from "./director-fixtures";

const narrator = { id: "narrator" };
const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};

type Scene = NonNullable<SkitInput["scenes"]>[number];
const run = (scenes: Scene[]) => {
  const skit: SkitInput = { schemaVersion: 2, meta: { title: "explainer" }, narrator, cast: [{ id: "milo", character: "milo", mark: "center" }], scenes };
  const voice = fakeVoice(skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 400 * l.text.split(/\s+/).length })));
  return compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
};
const closer: Scene = { id: "end", set: "office-1", beats: [{ id: "z", speaker: "milo", line: "Mine.", punchline: true }] };

describe("title card", () => {
  const card: Scene = {
    id: "term",
    set: "classroom-1",
    card: { kicker: "Psychologists call this the", title: "Endowment Effect", at: [{ word: "Endowment" }, { word: "Effect" }] },
    beats: [{ id: "t1", speaker: "narrator", line: "Psychologists call this the Endowment Effect." }],
  };
  it("stacks the title, reveals a line per anchor, empties the stage and holds to the scene end", () => {
    const r = run([card, closer]);
    const tl = r.scenes[0]!.timeline;
    expect(tl.cast).toEqual([]);
    expect(tl.card!.lines).toEqual(["Endowment", "Effect"]);
    expect(tl.card!.at[1]!).toBeGreaterThan(tl.card!.at[0]!);
    expect(tl.card!.to).toBe(tl.durationInFrames);
    expect(checkSkit({ result: r, lib: library, sets, safeArea }).findings.filter((f) => f.check === "overlay-fit")).toEqual([]);
  });
  it("one anchor staggers the lines; a wrong anchor count is an error", () => {
    const one = run([{ ...card, card: { ...card.card!, at: { word: "Endowment" } } }, closer]).scenes[0]!.timeline.card!;
    expect(one.at[1]! - one.at[0]!).toBe(5);
    const bad = errorsOf(() => run([{ ...card, card: { ...card.card!, at: [{ word: "call" }, { word: "the" }, { word: "Effect" }] } }, closer]));
    expect(bad.map((d) => [d.code, d.path])).toEqual([["card-lines", "scenes[0].card.at"]]);
  });
  it("layout: big stacked words inside the band above the subtitles; \\n forces breaks", () => {
    const l = cardLayout("Endowment Effect", "Psychologists call this the", 1080, 1920, safeArea);
    expect(l.fits).toBe(true);
    expect(l.fontSize).toBeGreaterThanOrEqual(130);
    expect(inside(l.rect, textBand(1080, 1920, safeArea), 1)).toBe(true);
    expect(cardLayout("Our\nbad idea", undefined, 1080, 1920, safeArea).lines).toEqual(["Our", "bad idea"]);
  });
});

describe("list reveal", () => {
  const items = ["Our project.", "Our process.", "Our spreadsheet.", "Our terrible old workflow."];
  const line = "Our project. Our process. Our spreadsheet. Even our terrible old workflow.";
  // Exact tokens first: "Our" ×3, then the lower-case "our".
  const at = [...[1, 2, 3].map((occurrence) => ({ word: "Our", occurrence })), { word: "our", occurrence: 1 }];
  it("each item pops in on its anchor; the list holds until the next cut", () => {
    const r = compile([{ id: "a", speaker: "narrator", line, text: [{ type: "list", items, at }] }, { id: "b", speaker: "milo", line: "Mine.", punchline: true }], { narrator });
    const [l] = r.timeline.lists;
    expect(l!.items).toEqual(items);
    expect(new Set(l!.at).size).toBe(4);
    expect([...l!.at].sort((x, y) => x - y)).toEqual(l!.at);
    const nextCut = r.timeline.shots.find((s) => s.frame > l!.at[0]!)?.frame ?? r.timeline.durationInFrames;
    expect(l!.to).toBe(nextCut);
    expect(checkSkit({ result: r, lib: library, sets, safeArea }).findings.filter((f) => f.level === "error")).toEqual([]);
  });
  it("four items fit above the subtitles; `at` needs one anchor per item", () => {
    const l = listLayout(items, 1080, 1920, safeArea);
    expect(l.fits).toBe(true);
    for (const r of l.rects) expect(inside(r, textBand(1080, 1920, safeArea), 1)).toBe(true);
    const bad = errorsOf(() => compile([{ id: "a", speaker: "narrator", line, text: [{ type: "list", items, at: at.slice(0, 2) }] }], { narrator }));
    expect(bad[0]!.path).toBe("beats[0].text[0].at");
  });
});
