/** Typeset the VizLab's equations into `public/qa/viz-lab-equations.json` (pnpm viz:lab). */
import fs from "node:fs";
import path from "node:path";
import { VIZ_TEX } from "../src/app/labs/vizPages";
import { typesetCached } from "../src/node/equations";
import { ROOT } from "./lib/tools";

const { equations, hits } = typesetCached(VIZ_TEX, path.join(ROOT, "out", ".typeset-cache"));
const out = path.join(ROOT, "public/qa/viz-lab-equations.json");
fs.writeFileSync(out, JSON.stringify({ schemaVersion: 1, equations }));
console.log(`${Object.keys(equations).length} equations (${hits} cached) → ${path.relative(ROOT, out)}`);
