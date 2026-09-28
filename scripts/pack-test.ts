/**
 * Packed-tarball consumer test (the OSS V0 gate): pnpm lib:pack-test [--keep]
 *   build → pnpm pack → a clean fixture project outside the repo installs the tarball (offline,
 *   from the pnpm store) → type-checks against the shipped declarations → imports only
 *   documented paths (private paths must fail) → compiles + self-checks a skit with its own
 *   data → registers its own composition and renders a still through `stickstage/node`.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT } from "./lib/tools";

const run = (cmd: string, args: string[], cwd: string) => execFileSync(cmd, args, { cwd, stdio: "inherit" });
const pkgDir = path.join(ROOT, "packages/stickstage");
const deps = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const v = (name: string) => deps.dependencies[name] ?? deps.devDependencies[name];

run(path.join(ROOT, "node_modules/.bin/tsx"), ["scripts/build-lib.ts"], ROOT);
const packDir = path.join(ROOT, "out/pack");
fs.rmSync(packDir, { recursive: true, force: true });
run("pnpm", ["pack", "--pack-destination", packDir], pkgDir);
const tgz = path.join(packDir, fs.readdirSync(packDir).find((f) => f.endsWith(".tgz"))!);

const fx = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-consumer-"));
const w = (rel: string, body: string) => {
  fs.mkdirSync(path.dirname(path.join(fx, rel)), { recursive: true });
  fs.writeFileSync(path.join(fx, rel), body);
};
w(
  "package.json",
  JSON.stringify(
    {
      name: "stickstage-consumer",
      private: true,
      type: "module",
      dependencies: Object.fromEntries(
        [["stickstage", `file:${tgz}`], ...["remotion", "@remotion/bundler", "@remotion/renderer", "@remotion/captions", "@remotion/transitions", "react", "react-dom", "zod"].map((n) => [n, v(n)])],
      ),
      devDependencies: { typescript: v("typescript"), "@types/react": v("@types/react"), "@types/node": v("@types/node") },
    },
    null,
    2,
  ),
);
fs.copyFileSync(path.join(ROOT, "pnpm-workspace.yaml"), path.join(fx, "pnpm-workspace.yaml"));
w(
  "tsconfig.json",
  JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, skipLibCheck: true, noEmit: true, resolveJsonModule: true, types: ["node"], lib: ["DOM", "ES2022"] }, include: ["src"] }),
);

// The consumer's own data (copied from this repo's library) and one skit.
const data = path.join(ROOT, "src/data");
const kinds = ["characters", "poses", "expressions", "props", "sets"] as const;
const imports: string[] = [];
const lists: Record<string, string[]> = {};
const jsonFiles = (dir: string, rel = ""): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const next = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) return jsonFiles(path.join(dir, ent.name), next);
    return ent.name.endsWith(".json") ? [next] : [];
  });
for (const k of kinds) {
  lists[k] = [];
  for (const f of jsonFiles(path.join(data, k))) {
    const name = `${k}_${f.replace(/\W/g, "_")}`;
    fs.mkdirSync(path.dirname(path.join(fx, "src/data", k, f)), { recursive: true });
    fs.copyFileSync(path.join(data, k, f), path.join(fx, "src/data", k, f));
    imports.push(`import ${name} from "./data/${k}/${f}";`);
    lists[k].push(name);
  }
}
for (const f of ["safe-area.json", "reactions.json", "sfx.json"]) fs.copyFileSync(path.join(data, f), path.join(fx, "src/data", f));
w(
  "src/registries.ts",
  `${imports.join("\n")}
import safeAreaJson from "./data/safe-area.json";
import reactionsJson from "./data/reactions.json";
import sfxJson from "./data/sfx.json";
import { createLibrary, createSets } from "stickstage";
import { ReactionTableSchema, SafeAreaSchema, SfxManifestSchema } from "stickstage/schema";
export const lib = createLibrary({ characters: [${lists.characters}], poses: [${lists.poses}], expressions: [${lists.expressions}], props: [${lists.props}] });
export const sets = createSets([${lists.sets}]);
export const safeArea = SafeAreaSchema.parse(safeAreaJson);
export const reactions = ReactionTableSchema.parse(reactionsJson);
export const sfx = SfxManifestSchema.parse(sfxJson);
`,
);
const skit = {
  schemaVersion: 2,
  meta: { title: "Consumer demo" },
  set: "plain-1",
  cast: [
    { id: "a", character: "milo", mark: "left", label: "A" },
    { id: "b", character: "june", mark: "right" },
  ],
  overlay: { pov: "POV: installed from a tarball" },
  beats: [
    { id: "s1", silent: true, durationMs: 900, actions: [{ who: "a", do: "pose", pose: "point" }] },
    { id: "s2", silent: true, durationMs: 1200, punchline: true, reaction: false, actions: [{ who: "b", do: "expression", expression: "shocked" }], text: [{ type: "slam", value: "WOW." }] },
  ],
};
w("public/skits/demo/skit.json", JSON.stringify(skit, null, 2));
w(
  "src/Root.tsx",
  `import React from "react";
import { Composition, staticFile } from "remotion";
import { StickStageComposition, calculateStickStageMetadata, skitCompositionSchema, ContactSheet, contactSheetSchema, calculateContactSheetMetadata, type SkitCompositionProps } from "stickstage/remotion";
import { lib, reactions, safeArea, sets, sfx } from "./registries";

const load = async (f: string): Promise<unknown | undefined> => {
  const r = await fetch(staticFile(f));
  return r.ok ? r.json() : undefined;
};
const SkitComp: React.FC<SkitCompositionProps> = ({ program, showLabels }) =>
  program ? <StickStageComposition program={program} sets={sets} lib={lib} safeArea={safeArea} fontFamily="sans-serif" showLabels={showLabels} /> : null;

export const Root: React.FC = () => (
  <>
    <Composition id="Skit" component={SkitComp} schema={skitCompositionSchema} defaultProps={{ skit: "demo", showLabels: false }}
      calculateMetadata={calculateStickStageMetadata({ load, lib, sets, sfx, reactions })} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="SkitDebug" component={SkitComp} schema={skitCompositionSchema} defaultProps={{ skit: "demo", showLabels: true }}
      calculateMetadata={calculateStickStageMetadata({ load, lib, sets, sfx, reactions })} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="ContactSheet" component={ContactSheet} schema={contactSheetSchema} defaultProps={{ title: "", tiles: [], cols: 1, tileWidth: 10, tileHeight: 10 }}
      calculateMetadata={calculateContactSheetMetadata} durationInFrames={1} fps={30} width={10} height={10} />
  </>
);
`,
);
w("src/index.ts", `import { registerRoot } from "remotion";\nimport { Root } from "./Root";\nregisterRoot(Root);\n`);
w(
  "check.mjs",
  `import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { compileSkit, checkSkit, createLibrary, createSets, formatReport } from "stickstage";
import { jsonSchemaFor, SkitSchema, SafeAreaSchema, ReactionTableSchema, SfxManifestSchema, migrate } from "stickstage/schema";
import { workspace, remotionBackend } from "stickstage/node";

// Private paths are not importable.
for (const p of ["stickstage/dist/index.js", "stickstage/dist/types/engine/core.d.ts", "stickstage/src/engine/core"]) {
  await assert.rejects(import(p), (e) => e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED", p);
}
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const dir = (k) => {
  const out = [];
  const walk = (rel) => {
    for (const ent of fs.readdirSync(rel, { withFileTypes: true })) {
      const abs = rel + "/" + ent.name;
      if (ent.isDirectory()) walk(abs);
      else if (ent.name.endsWith(".json")) out.push(read(abs));
    }
  };
  walk("src/data/" + k);
  return out;
};
const lib = createLibrary({ characters: dir("characters"), poses: dir("poses"), expressions: dir("expressions"), props: dir("props") });
const sets = createSets(dir("sets"));
const skit = read("public/skits/demo/skit.json");
assert.equal(SkitSchema.safeParse(skit).success, true);
assert.equal(migrate("skit", skit).applied.length, 0);
assert.equal(jsonSchemaFor("skit").type, "object");
const result = compileSkit({ skit, lib, sets, sfx: SfxManifestSchema.parse(read("src/data/sfx.json")), reactions: ReactionTableSchema.parse(read("src/data/reactions.json")) });
const report = checkSkit({ result, lib, sets, safeArea: SafeAreaSchema.parse(read("src/data/safe-area.json")) });
console.log(formatReport(report, result.program.fps));
assert.equal(report.ok, true);

const ws = workspace(process.cwd());
assert.equal(ws.publicPath(ws.skitDir("demo")), "skits/demo");
const backend = remotionBackend({ entryPoint: path.resolve("src/index.ts"), browserExecutable: process.env.BROWSER || undefined });
const out = await backend.renderStill("demo", 40, path.resolve("out/demo.png"));
assert.ok(fs.statSync(out).size > 10000);
console.log("CONSUMER OK", out);
`,
);

run("pnpm", ["install", "--offline", "--config.confirmModulesPurge=false"], fx);
run(path.join(fx, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], fx);
const chrome = path.join(ROOT, "node_modules/.remotion/chrome-headless-shell");
const bin = fs.existsSync(chrome) ? execFileSync("find", [chrome, "-name", "chrome-headless-shell", "-type", "f"], { encoding: "utf8" }).split("\n")[0] : "";
execFileSync("node", ["check.mjs"], { cwd: fx, stdio: "inherit", env: { ...process.env, BROWSER: bin } });
const png = path.join(ROOT, "out/pack/consumer-demo.png");
fs.copyFileSync(path.join(fx, "out/demo.png"), png);
if (!process.argv.includes("--keep")) fs.rmSync(fx, { recursive: true, force: true });
console.log(`pack test passed: ${path.relative(ROOT, tgz)} (${(fs.statSync(tgz).size / 1024).toFixed(0)} KB); still: ${path.relative(ROOT, png)}${process.argv.includes("--keep") ? `; fixture kept at ${fx}` : ""}`);
