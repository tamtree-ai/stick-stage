/**
 * Rebuild src/data/safe-area.json from the per-platform measurements: pnpm safearea
 * (the strictest margin on each side across src/data/safe-area-profiles.json).
 */
import fs from "node:fs";
import path from "node:path";
import { strictestSafeArea } from "../src/engine";
import { safeAreaProfiles } from "../src/data";
import { ROOT } from "./lib/tools";

const sa = strictestSafeArea(safeAreaProfiles);
fs.writeFileSync(path.join(ROOT, "src/data/safe-area.json"), JSON.stringify(sa) + "\n");
const unverified = Object.entries(safeAreaProfiles.platforms).filter(([, p]) => !p.verified).map(([k]) => k);
console.log(`safe-area.json: ${JSON.stringify(sa)}${unverified.length ? `\nnot yet verified on real screenshots: ${unverified.join(", ")}` : ""}`);
