import { describe, expect, it } from "vitest";
import { buildCatalog, catalogVersion, checkDraft, SkitError, TEMPLATES } from "../src/engine/core";
import { validate } from "../src/server/validate";
import { fineParts } from "./server-fixtures";
import { catalog, library, reactions, safeArea, sets, sfxLibrary } from "../src/data";

const src = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };

describe("catalog", () => {
  it("lists what a brief can pick from", () => {
    expect(catalog.characters).toEqual(expect.arrayContaining([{ id: "milo", name: "Milo", aspect: "9:16" }]));
    expect(catalog.aspects.map((a) => a.id)).toEqual(["9:16", "16:9"]);
    expect(catalog.templates.map((t) => t.id)).toEqual([...TEMPLATES]);
    expect(catalog.sets.every((s) => s.description && s.tags.length)).toBe(true);
    expect(catalog.expressions).toContain("deadpan");
  });
  it("version is a content hash: stable, key-order independent, and moves when content does", () => {
    expect(catalogVersion(src)).toBe(catalog.version);
    const reordered = { ...src, sets: Object.fromEntries(Object.entries(sets).reverse()) };
    expect(catalogVersion(reordered)).toBe(catalog.version);
    const firstSet = Object.values(sets)[0]!;
    const changed = { ...src, sets: { ...sets, [firstSet.id]: { ...firstSet, description: "changed" } } };
    expect(catalogVersion(changed)).not.toBe(catalog.version);
    expect(buildCatalog(changed).version).toBe(catalogVersion(changed));
  });
});

describe("checkDraft", () => {
  it("gives the same verdict as POST /validate, in-process", () => {
    const { skit } = fineParts();
    const d = checkDraft(skit, src);
    const v = validate({ ...src, ws: undefined as never }, { skit });
    expect(d.ok).toBe(v.ok);
    expect(d.estimatedDurationSec).toBe(v.estimatedDurationSec);
    expect(d.lines.map((l) => l.id)).toEqual(v.lines.map((l) => l.id));
    expect(d.check.findings).toEqual(v.check.findings);
    expect(d.result.program.durationInFrames).toBeGreaterThan(0);
  });
  it("throws SkitError with diagnostics on an unknown set", () => {
    expect(() => checkDraft({ ...fineParts().skit, set: "no-such-set" }, src)).toThrow(SkitError);
  });
});
