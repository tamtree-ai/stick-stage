import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLibrary, migrate, parseSkit, SkitError, type Migration } from "../src/engine/core";
import { DOC_KINDS, jsonSchemaFor } from "../src/engine/schemas";
import { library } from "../src/data";

const SRC = path.resolve(import.meta.dirname, "../src");

/** Runtime (non-type) relative imports reachable from an entry file. */
const graph = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = fs.readFileSync(entry, "utf8");
  for (const m of src.matchAll(/^(?:import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)) {
    if (m[1] || !m[2]!.startsWith(".")) continue;
    const base = path.resolve(path.dirname(entry), m[2]!);
    const file = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (file) graph(file, seen);
  }
  return seen;
};

describe("package boundaries", () => {
  it("the core entry (stickstage) reaches no React component", () => {
    const tsx = [...graph(path.join(SRC, "engine/core.ts"))].filter((f) => f.endsWith(".tsx"));
    expect(tsx.map((f) => path.relative(SRC, f))).toEqual([]);
  });
  it("the schema entry reaches no React component", () => {
    expect([...graph(path.join(SRC, "engine/schemas.ts"))].filter((f) => f.endsWith(".tsx"))).toEqual([]);
  });
  it("engine code never imports the node layer", () => {
    const engine = [...graph(path.join(SRC, "engine/remotion.ts")), ...graph(path.join(SRC, "engine/core.ts"))];
    expect(engine.filter((f) => f.includes(`${path.sep}node${path.sep}`))).toEqual([]);
  });
});

describe("migrations", () => {
  const registry = {
    skit: [{ from: 1, to: 2, note: "rename title", up: (d: Record<string, unknown>) => ({ ...d, name: (d.meta as { title: string }).title }) }] satisfies Migration[],
  };
  it("runs the chain up to the current version and reports what it applied", () => {
    const r = migrate("skit", { schemaVersion: 1, meta: { title: "x" } }, registry, 2);
    expect(r.doc).toMatchObject({ schemaVersion: 2, name: "x" });
    expect(r.applied).toEqual(["skit v1→v2: rename title"]);
  });
  it("rejects documents newer than the engine, and gaps in the chain", () => {
    expect(() => migrate("skit", { schemaVersion: 3 }, registry, 2)).toThrow(SkitError);
    expect(() => migrate("pose", { schemaVersion: 1 }, registry, 2)).toThrow("no migration for pose");
  });
  it("parseSkit explains a future schemaVersion", () => {
    try {
      parseSkit({ schemaVersion: 9 });
    } catch (e) {
      expect((e as SkitError).diagnostics[0]!.message).toContain("newer than this engine");
    }
  });
});

describe("registries and JSON Schema", () => {
  it("createLibrary validates and rejects duplicate ids", () => {
    const docs = { characters: Object.values(library.characters), poses: Object.values(library.poses), expressions: Object.values(library.expressions), props: Object.values(library.props) };
    expect(Object.keys(createLibrary(docs).poses)).toContain("shove");
    expect(() => createLibrary({ ...docs, props: [...docs.props, docs.props[0]] })).toThrow("Duplicate prop id");
  });
  it("every document kind has a JSON Schema", () => {
    for (const k of DOC_KINDS) {
      const schema = jsonSchemaFor(k) as { type?: string; anyOf?: { type?: string }[] };
      if (k === "prop") expect(schema.anyOf?.every((branch) => branch.type === "object")).toBe(true);
      else expect(schema).toHaveProperty("type", "object");
    }
    expect(Object.keys((jsonSchemaFor("skit") as { properties: object }).properties)).toContain("scenes");
  });
});
