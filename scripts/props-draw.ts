/**
 * Writes the 100 drawn props from scripts/prop-art into src/data/props/<category>/.
 * The JSON files are what the engine loads. Re-running this overwrites them.
 */
import fs from "node:fs";
import path from "node:path";
import { PropSchema } from "../src/engine/props/schema";
import { DRINKS } from "./prop-art/drinks";
import { FOOD } from "./prop-art/food";
import { HOME, MONEY, PARTY, SPORT, TRAVEL } from "./prop-art/life";
import { KITCHEN, OFFICE, TECH } from "./prop-art/work";

const ROOT = path.resolve(import.meta.dirname, "..");

const arts = [...FOOD, ...DRINKS, ...KITCHEN, ...OFFICE, ...TECH, ...HOME, ...MONEY, ...SPORT, ...PARTY, ...TRAVEL];
const dir = path.join(ROOT, "src/data/props");

if (arts.length !== 100) {
  console.error(`expected 100 drawn props, got ${arts.length}`);
  process.exit(1);
}

const ids = new Set<string>();
for (const art of arts) {
  if (ids.has(art.id)) {
    console.error(`duplicate id ${art.id}`);
    process.exit(1);
  }
  ids.add(art.id);
  const doc = {
    schemaVersion: 1 as const,
    id: art.id,
    kind: "drawn" as const,
    name: art.name,
    category: art.category,
    rank: art.rank,
    tags: art.tags,
    aliases: art.aliases,
    align: art.align,
    ...(art.size ? { size: art.size } : {}),
    colors: art.colors,
    parts: art.parts,
  };
  const parsed = PropSchema.safeParse(doc);
  if (!parsed.success) {
    console.error(`${art.id}\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    process.exit(1);
  }
  const folder = path.join(dir, art.category);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `${art.id}.json`), JSON.stringify(doc) + "\n");
}
console.log(`wrote ${arts.length} drawn props`);
