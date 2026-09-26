/**
 * Build the `stickstage` package (packages/stickstage/dist): pnpm lib:build
 *   JS: one ESM bundle per entry (shared chunks split out), every dependency external.
 *   Types: tsc declarations for src/engine and src/node.
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tools";

const out = path.join(ROOT, "packages/stickstage/dist");
fs.rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: {
    index: path.join(ROOT, "src/engine/core.ts"),
    schema: path.join(ROOT, "src/engine/schemas.ts"),
    remotion: path.join(ROOT, "src/engine/remotion.ts"),
    node: path.join(ROOT, "src/node/index.ts"),
  },
  outdir: out,
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  packages: "external",
  chunkNames: "chunks/[name]-[hash]",
  logLevel: "warning",
});
execFileSync(path.join(ROOT, "node_modules/.bin/tsc"), ["-p", "tsconfig.build.json"], { stdio: "inherit", cwd: ROOT });
const files = fs.readdirSync(out).filter((f) => f.endsWith(".js"));
console.log(`built ${path.relative(ROOT, out)}: ${files.join(", ")} + chunks + types`);
