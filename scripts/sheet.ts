/**
 * Contact sheet: pnpm sheet <composition> <from> <to> <step> [--cols=6] [--scale=0.25] [--out=path]
 * Renders every `step`-th frame of a composition and tiles them into one PNG.
 */
import { bundle } from "@remotion/bundler";
import { renderFrames, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? "true"];
  }),
);
const [id, fromS, toS, stepS] = args.filter((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: pnpm sheet <composition> <from> <to> <step> [--cols=6] [--scale=0.25] [--out=path]");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/app/index.ts") });
const comp = await selectComposition({ serveUrl, id });
const from = Number(fromS ?? 0);
const to = Math.min(Number(toS ?? comp.durationInFrames - 1), comp.durationInFrames - 1);
const step = Math.max(1, Number(stepS ?? 2));
const scale = Number(flags.scale ?? 0.25);
const cols = Number(flags.cols ?? 6);
const out = path.resolve(flags.out ?? path.join(root, "out", `${id}-sheet-${from}-${to}.png`));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-sheet-"));
const frames: number[] = [];
await renderFrames({
  serveUrl,
  composition: comp,
  inputProps: comp.props,
  frameRange: [from, to],
  everyNthFrame: step,
  imageFormat: "jpeg",
  jpegQuality: 85,
  scale,
  outputDir: dir,
  onStart: () => undefined,
  onFrameUpdate: (_n, frame) => frames.push(frame),
});

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpeg")).sort();
const expected: number[] = [];
for (let f = from; f <= to; f += step) expected.push(f);
const tiles = files.map((f, i) => ({
  src: `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}`,
  frame: expected[i] ?? i,
}));

const sheetProps = {
  title: `${id}  frames ${from}–${to} step ${step}`,
  tiles,
  cols,
  tileWidth: Math.round(comp.width * scale),
  tileHeight: Math.round(comp.height * scale),
};
const sheet = await selectComposition({ serveUrl, id: "ContactSheet", inputProps: sheetProps });
fs.mkdirSync(path.dirname(out), { recursive: true });
await renderStill({ serveUrl, composition: sheet, inputProps: sheetProps, output: out, imageFormat: "png" });
fs.rmSync(dir, { recursive: true, force: true });
console.log(out);
