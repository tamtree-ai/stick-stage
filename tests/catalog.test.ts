import { describe, expect, it } from "vitest";
import { buildCatalog, catalogVersion, TEMPLATES } from "../src/engine/core";
import { catalog, library, reactions, safeArea, sets, sfxLibrary } from "../src/data";

const src = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };

describe("catalog", () => {
  it("lists what a brief can pick from", () => {
    expect(catalog.characters).toEqual(expect.arrayContaining([{ id: "milo", name: "Milo" }]));
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
