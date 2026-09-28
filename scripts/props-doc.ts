/**
 * Writes the prop table in docs/skits.md from the catalog. pnpm props:doc
 */
import fs from "node:fs";
import path from "node:path";
import { catalog } from "../src/data";
import { ROOT } from "./lib/tools";

const start = "<!-- props:doc start -->";
const end = "<!-- props:doc end -->";
const file = path.join(ROOT, "docs/skits.md");
const doc = fs.readFileSync(file, "utf8");
if (!doc.includes(start) || !doc.includes(end)) {
  console.error("docs/skits.md is missing the props:doc markers");
  process.exit(1);
}
const rows = catalog.propInfo.map((p) => `| ${p.id} | ${p.name} | ${p.category} | ${p.aliases.join(", ") || "—"} |`);
const table = `${start}\n| id | name | category | aliases |\n|---|---|---|---|\n${rows.join("\n")}\n${end}`;
const next = doc.replace(new RegExp(`${start}[\\s\\S]*?${end}`), table);
fs.writeFileSync(file, next);
console.log(`wrote ${catalog.propInfo.length} props into docs/skits.md`);
