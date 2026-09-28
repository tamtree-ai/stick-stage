import { describe, expect, it } from "vitest";
import { catalog, library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { buildCatalog, catalogVersion, propBounds } from "../src/engine";
import { PropSchema } from "../src/engine/props/schema";

const src = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };

const drawn = (extra: Record<string, unknown>) =>
  PropSchema.safeParse({
    schemaVersion: 1,
    id: "sample",
    kind: "drawn",
    name: "Sample",
    category: "food",
    align: "upright",
    colors: { body: "#e0463c", accent: "#f4c542" },
    parts: [{ shape: "rect", x: -0.02, y: -0.08, w: 0.04, h: 0.06, fill: "body" }],
    ...extra,
  });

describe("drawn props", () => {
  it("parses a drawn prop and keeps a coded one", () => {
    expect(drawn({}).success).toBe(true);
    expect(library.props.phone?.kind).toBe("phone");
    expect(library.props.fries?.kind).toBe("drawn");
  });

  it("a bad path command names its path", () => {
    const r = drawn({ parts: [{ shape: "path", d: "M 0 0 S 0.1 0.1 0.2 0.2", fill: "body" }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path.join(".")).toBe("parts.0.d");
  });

  it("too many parts names its path", () => {
    const parts = Array.from({ length: 25 }, () => ({ shape: "circle", x: 0, y: -0.05, r: 0.01, fill: "body" }));
    const r = drawn({ parts });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "parts")).toBe(true);
  });

  it("a coordinate outside ±0.6 names its path", () => {
    const r = drawn({ parts: [{ shape: "rect", x: 0.7, y: 0, w: 0.01, h: 0.01, fill: "body" }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path.join(".")).toContain("x");
  });

  it("bounds of fries match the carton and the tallest fry", () => {
    const fries = library.props.fries!;
    expect(fries.kind).toBe("drawn");
    // Carton x −0.03…0.03 and y to 0.03. Middle fry rect starts at y −0.082. The angled fries stay inside that box.
    expect(propBounds(fries)).toEqual({ x0: -0.03, x1: 0.03, y0: -0.082, y1: 0.03 });
  });
});

describe("prop catalog", () => {
  it("propInfo is sorted by rank and covers every prop", () => {
    expect(catalog.propInfo.map((p) => p.id).sort()).toEqual(Object.keys(library.props).sort());
    expect(catalog.props).toEqual(Object.keys(library.props));
    for (let i = 1; i < catalog.propInfo.length; i++) {
      const prev = catalog.propInfo[i - 1]!;
      const cur = catalog.propInfo[i]!;
      expect(prev.rank < cur.rank || (prev.rank === cur.rank && prev.id <= cur.id)).toBe(true);
    }
    expect(catalog.propInfo.find((p) => p.id === "fries")).toMatchObject({ name: "Fries", category: "food" });
  });

  it("the catalog hash moves when one part of one prop moves", () => {
    const fries = library.props.fries!;
    if (fries.kind !== "drawn") throw new Error("fries should be drawn");
    const [first, ...rest] = fries.parts;
    if (!first || first.shape !== "rect") throw new Error("fries starts with a rect");
    const lib = { ...library, props: { ...library.props, fries: { ...fries, parts: [{ ...first, x: first.x + 0.001 }, ...rest] } } };
    expect(catalogVersion({ ...src, lib })).not.toBe(catalog.version);
    expect(buildCatalog({ ...src, lib }).propInfo.find((p) => p.id === "fries")?.id).toBe("fries");
  });
});
