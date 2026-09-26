/** Contact sheet: every `step`-th frame of a composition tiled into one PNG. */
import { bundle } from "@remotion/bundler";
import { renderFrames, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT } from "./tools";

let bundled: Promise<string> | undefined;
/** One Remotion bundle per process. */
export const serveUrl = (): Promise<string> => (bundled ??= bundle({ entryPoint: path.join(ROOT, "src/app/index.ts") }));

export type SheetOptions = {
  id: string;
  inputProps?: Record<string, unknown>;
  from?: number;
  to?: number;
  step?: number;
  /** Aim for about this many tiles when `step` is omitted. */
  maxTiles?: number;
  cols?: number;
  scale?: number;
  out?: string;
  title?: string;
};

export const renderSheet = async (o: SheetOptions): Promise<string> => {
  const url = await serveUrl();
  const comp = await selectComposition({ serveUrl: url, id: o.id, inputProps: o.inputProps });
  const from = o.from ?? 0;
  const to = Math.min(o.to ?? comp.durationInFrames - 1, comp.durationInFrames - 1);
  const step = Math.max(1, o.step ?? Math.ceil((to - from + 1) / (o.maxTiles ?? 48)));
  const scale = o.scale ?? 0.25;
  const cols = o.cols ?? 6;
  const out = path.resolve(o.out ?? path.join(ROOT, "out", `${o.id}-sheet-${from}-${to}.png`));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-sheet-"));
  await renderFrames({
    serveUrl: url,
    composition: comp,
    inputProps: comp.props,
    frameRange: [from, to],
    everyNthFrame: step,
    imageFormat: "jpeg",
    jpegQuality: 85,
    scale,
    outputDir: dir,
    onStart: () => undefined,
    onFrameUpdate: () => undefined,
  });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpeg")).sort();
  const expected: number[] = [];
  for (let f = from; f <= to; f += step) expected.push(f);
  const tiles = files.map((f, i) => ({
    src: `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}`,
    frame: expected[i] ?? i,
  }));
  const sheetProps = {
    title: o.title ?? `${o.id}  frames ${from}–${to} step ${step}`,
    tiles,
    cols,
    tileWidth: Math.round(comp.width * scale),
    tileHeight: Math.round(comp.height * scale),
  };
  const sheet = await selectComposition({ serveUrl: url, id: "ContactSheet", inputProps: sheetProps });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await renderStill({ serveUrl: url, composition: sheet, inputProps: sheetProps, output: out, imageFormat: "png" });
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
};
