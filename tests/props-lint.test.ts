import { describe, expect, it } from "vitest";
import { lintProps, propFiles, type PropFile } from "../scripts/props-lint";

const rect = (x = -0.02) => ({ shape: "rect", x, y: -0.08, w: 0.04, h: 0.06, fill: "body" });

const doc = (id: string, extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id,
  kind: "drawn",
  name: id,
  category: "food",
  rank: 1,
  tags: [],
  aliases: [`${id}-alias`],
  align: "upright",
  colors: { body: "#ffffff", accent: "#111111" },
  parts: [rect(-0.02), rect(0.01)],
  ...extra,
});

const file = (id: string, extra: Record<string, unknown> = {}): PropFile => ({ path: `${id}.json`, doc: doc(id, extra) });

const rules = (files: PropFile[]) => lintProps(files).map((p) => p.rule);

describe("prop lint", () => {
  it("accepts the shipped catalog", () => {
    expect(lintProps(propFiles())).toEqual([]);
  });

  it("flags a schema error, a duplicate id, a bad alias, bounds, a thin category, and a copy", () => {
    expect(rules([file("a", { kind: "nope" })])).toContain("schema");
    expect(rules([file("a"), file("a")])).toContain("id");
    expect(rules([file("a", { aliases: ["Fries"] })])).toContain("alias");
    expect(rules([file("a", { aliases: ["a-alias", "a-alias"] })])).toContain("alias");
    expect(rules([file("fries"), file("other", { aliases: ["fries"] })])).toContain("alias");
    const spun = file("wide", {
      parts: [{ shape: "rect", x: -0.55, y: -0.55, w: 0.5, h: 0.5, fill: "body", angle: 45 }, rect(0)],
    });
    expect(rules([spun, file("b"), file("c")])).toContain("bounds");
    expect(rules([file("a", { category: "solo" }), file("b", { category: "solo" })])).toContain("category");
    const twin = file("b", { parts: [rect(-0.02), rect(0.01), rect(0.02)] });
    expect(rules([file("a"), twin, file("c", { parts: [rect(0.02), rect(-0.03)] })])).toContain("copy");
  });
});
