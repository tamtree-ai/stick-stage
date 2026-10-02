import { describe, expect, it } from "vitest";
import { castNotes, catalog, library, sets } from "../src/data";
import { DraftReplySchema, fromPremise, parseBrief, parseSkit, premiseFromReply, ReviseReplySchema, skitFromReply, writerWorld } from "../src/engine";
import { writerReplyJsonSchema } from "../src/engine/schemas";

const world = writerWorld(catalog, castNotes);
const brief = parseBrief({ topic: "group chats", cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }], set: "living-1" }, world);

const draft = DraftReplySchema.parse({
  title: "Read receipts",
  template: "exchange",
  description: "Some people just leave you on read.",
  hashtags: ["stickfigure"],
  scenes: [
    {
      pov: "POV: the group chat goes quiet",
      lines: Array.from({ length: 12 }, (_, i) => ({ who: i % 2 ? "june" : "milo", text: `Line number ${i + 1}.`, expression: "neutral", ...(i === 11 ? { slam: "SEEN" } : {}) })),
    },
  ],
});

describe("WriterReply", () => {
  it("a draft reply that passes the schema is one premiseFromReply can stage", () => {
    const { premise, warnings } = premiseFromReply(JSON.stringify(draft), brief, world);
    expect(warnings.filter((w) => w.code !== "line-count")).toEqual([]);
    expect(premise).toMatchObject({ title: "Read receipts", set: "living-1" });
  });

  it("a revise reply that passes the schema is one skitFromReply can read", () => {
    const { premise } = premiseFromReply(JSON.stringify(draft), brief, world);
    const doc = parseSkit(fromPremise(premise, library, sets));
    const beats = doc.beats!.filter((b) => b.line && !b.silent);
    const reply = ReviseReplySchema.parse({ lines: beats.map((b, i) => ({ id: b.id, who: b.speaker!, text: i === beats.length - 1 ? "Seen. At 3 a.m." : b.line! })) });
    const { skit } = skitFromReply(JSON.stringify(reply), doc, world);
    expect(parseSkit(skit).beats!.filter((b) => b.line).at(-1)!.line).toBe("Seen. At 3 a.m.");
  });

  it("refuses the shapes the prompts don't ask for", () => {
    expect(DraftReplySchema.safeParse({ title: "x", scenes: [] }).success).toBe(false);
    expect(ReviseReplySchema.safeParse({ lines: [{ who: "milo", text: "no id" }] }).success).toBe(false);
  });

  it("exports as JSON Schema for other callers", () => {
    const s = writerReplyJsonSchema();
    expect(JSON.stringify(s)).toContain('"scenes"');
    expect(s).toHaveProperty("anyOf");
  });
});
