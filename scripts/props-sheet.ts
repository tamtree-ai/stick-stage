/**
 * Contact sheet of props: pnpm props:sheet [category]
 * Each prop is held facing right, held facing left, and dropped.
 * Writes public/qa/props-<category>.png at 540px per view and props-<category>-1080.png.
 * With no category, every category is written, plus public/qa/props-all.png.
 */
import fs from "node:fs";
import path from "node:path";
import { catalog } from "../src/data";
import { BACKEND, ROOT } from "./lib/tools";

const category = process.argv.slice(2).find((a) => !a.startsWith("--"));
const groups = new Map<string, string[]>();
for (const prop of catalog.propInfo) {
  const list = groups.get(prop.category) ?? [];
  list.push(prop.id);
  groups.set(prop.category, list);
}

const wanted = category ? [[category, groups.get(category) ?? []] as const] : [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
if (category && !wanted[0]![1].length) {
  console.error(`no props in category "${category}". Categories: ${[...groups.keys()].sort().join(", ")}`);
  process.exit(1);
}

const outDir = path.join(ROOT, "public/qa");
fs.mkdirSync(outDir, { recursive: true });

const render = async (ids: string[], panel: number, file: string) => {
  const out = path.join(outDir, file);
  await BACKEND.renderComposition("PropSheet", { ids, panel }, out);
  console.log(path.relative(ROOT, out));
};

for (const [cat, ids] of wanted) {
  await render(ids, 540, `props-${cat}.png`);
  await render(ids, 1080, `props-${cat}-1080.png`);
}
if (!category) {
  const ids = [...groups.values()].flat();
  await render(ids, 180, "props-all.png");
}
