/**
 * pnpm props:lint — schema, ids, aliases, bounds, categories, and a copy-paste guard.
 * Also runs at the end of pnpm test.
 */
import fs from "node:fs";
import path from "node:path";
import { drawnBounds } from "../src/engine/props/bounds";
import { PropSchema, isDrawn, type PropDef } from "../src/engine/props/schema";

export type PropLint = { rule: string; path: string; message: string };

export type PropFile = { path: string; doc: unknown };

const walk = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) return walk(abs);
        return ent.name.endsWith(".json") ? [abs] : [];
      })
    : [];

export const propFiles = (root = path.resolve(import.meta.dirname, "../src/data/props")): PropFile[] =>
  walk(root).map((file) => ({ path: path.relative(path.resolve(import.meta.dirname, ".."), file), doc: JSON.parse(fs.readFileSync(file, "utf8")) }));

const outOf = (n: number) => n < -0.6 || n > 0.6;

/** Lint a set of prop documents. `path` is what the message names. */
export const lintProps = (files: readonly PropFile[]): PropLint[] => {
  const out: PropLint[] = [];
  const parsed: { path: string; def: PropDef }[] = [];
  const ids = new Map<string, string>();
  for (const file of files) {
    const result = PropSchema.safeParse(file.doc);
    if (!result.success) {
      for (const issue of result.error.issues) out.push({ rule: "schema", path: `${file.path}:${issue.path.join(".") || "(root)"}`, message: issue.message });
      continue;
    }
    const def = result.data;
    if (ids.has(def.id)) out.push({ rule: "id", path: file.path, message: `duplicate id "${def.id}" (also ${ids.get(def.id)})` });
    ids.set(def.id, file.path);
    parsed.push({ path: file.path, def });
  }
  const idSet = new Set(parsed.map((p) => p.def.id));
  const byCat = new Map<string, { path: string; def: PropDef }[]>();
  for (const row of parsed) {
    const { def, path: file } = row;
    if (!def.name) out.push({ rule: "name", path: file, message: "name is required" });
    if (!def.category) out.push({ rule: "category", path: file, message: "category is required" });
    const seen = new Set<string>();
    for (const alias of def.aliases) {
      if (alias !== alias.toLowerCase()) out.push({ rule: "alias", path: file, message: `alias "${alias}" is not lowercase` });
      if (idSet.has(alias)) out.push({ rule: "alias", path: file, message: `alias "${alias}" is another prop's id` });
      if (seen.has(alias)) out.push({ rule: "alias", path: file, message: `alias "${alias}" is repeated` });
      seen.add(alias);
    }
    if (isDrawn(def)) {
      const box = drawnBounds(def.parts);
      for (const [k, v] of Object.entries(box)) {
        if (outOf(v)) out.push({ rule: "bounds", path: file, message: `${k} ${v} is outside ±0.6` });
      }
    }
    const list = byCat.get(def.category ?? "") ?? [];
    list.push(row);
    byCat.set(def.category ?? "", list);
  }
  for (const [cat, rows] of byCat) {
    if (cat && rows.length < 3) out.push({ rule: "category", path: cat, message: `category "${cat}" has ${rows.length} props; it needs at least 3` });
    const seen = new Map<string, string>();
    for (const row of rows) {
      if (!isDrawn(row.def)) continue;
      const key = JSON.stringify(row.def.parts.slice(0, 2));
      const prev = seen.get(key);
      if (prev) out.push({ rule: "copy", path: row.path, message: `first two parts match ${prev}` });
      else seen.set(key, row.def.id);
    }
  }
  return out;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.dirname, "props-lint.ts");
if (isMain) {
  const problems = lintProps(propFiles());
  if (problems.length) {
    console.error(problems.map((p) => `${p.rule} ${p.path}: ${p.message}`).join("\n"));
    process.exit(1);
  }
  console.log(`props ok (${propFiles().length})`);
}
