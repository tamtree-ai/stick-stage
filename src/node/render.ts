/**
 * Remotion render backend: bundles the consumer's entry point once and renders skits and
 * contact sheets. The consumer registers the compositions (`Skit`, `SkitDebug`, `ContactSheet`
 * by default) with the components from `stickstage/remotion`.
 */
import { bundle } from "@remotion/bundler";
import { renderFrames, renderMedia, renderStill, selectComposition, type CancelSignal } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type RenderControl = {
  onProgress?: (progress: number) => void;
  cancelSignal?: CancelSignal;
  timeoutInMilliseconds?: number;
  /** Parallel browser tabs (Remotion default when omitted). */
  concurrency?: number | string | null;
};

export type SheetOptions = RenderControl & {
  id: string;
  inputProps?: Record<string, unknown>;
  from?: number;
  to?: number;
  step?: number;
  /** Aim for about this many tiles when `step` is omitted. */
  maxTiles?: number;
  cols?: number;
  scale?: number;
  out: string;
  title?: string;
};

export type RenderBackend = {
  serveUrl: () => Promise<string>;
  renderSkit: (skitId: string, out: string, o?: RenderControl & { debug?: boolean; frames?: [number, number] }) => Promise<string>;
  renderSheet: (o: SheetOptions) => Promise<string>;
  /** One frame of a skit as a PNG (layout checks). */
  renderStill: (skitId: string, frame: number, out: string, o?: { debug?: boolean; timeoutInMilliseconds?: number }) => Promise<string>;
};

export const remotionBackend = (opts: {
  entryPoint: string;
  compositions?: { skit?: string; debug?: string; sheet?: string };
  /** Use this Chrome / headless shell instead of Remotion's download. */
  browserExecutable?: string;
  /**
   * Symlink `public/` into the bundle instead of copying it, so skit folders written after the
   * one-time bundle are still served (long-running services). No effect on Windows.
   */
  symlinkPublicDir?: boolean;
}): RenderBackend => {
  const browserExecutable = opts.browserExecutable ?? null;
  const ids = { skit: "Skit", debug: "SkitDebug", sheet: "ContactSheet", ...opts.compositions };
  let bundled: Promise<string> | undefined;
  const serveUrl = () => (bundled ??= bundle({ entryPoint: opts.entryPoint, symlinkPublicDir: opts.symlinkPublicDir ?? false }));

  const renderSkit: RenderBackend["renderSkit"] = async (skitId, out, o = {}) => {
    const url = await serveUrl();
    const inputProps = { skit: skitId, showLabels: !!o.debug };
    const composition = await selectComposition({ serveUrl: url, id: o.debug ? ids.debug : ids.skit, inputProps, browserExecutable });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await renderMedia({
      browserExecutable,
      serveUrl: url,
      composition,
      inputProps,
      codec: "h264",
      outputLocation: out,
      frameRange: o.frames ?? null,
      onProgress: ({ progress }) => o.onProgress?.(progress),
      cancelSignal: o.cancelSignal,
      timeoutInMilliseconds: o.timeoutInMilliseconds,
      concurrency: o.concurrency,
    });
    return out;
  };

  const renderSheet: RenderBackend["renderSheet"] = async (o) => {
    const url = await serveUrl();
    const comp = await selectComposition({ serveUrl: url, id: o.id, inputProps: o.inputProps, browserExecutable });
    const from = o.from ?? 0;
    const to = Math.min(o.to ?? comp.durationInFrames - 1, comp.durationInFrames - 1);
    const step = Math.max(1, o.step ?? Math.ceil((to - from + 1) / (o.maxTiles ?? 48)));
    const scale = o.scale ?? 0.25;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-sheet-"));
    try {
      await renderFrames({
        browserExecutable,
        serveUrl: url,
        composition: comp,
        inputProps: comp.props,
        frameRange: [from, to],
        everyNthFrame: step,
        imageFormat: "jpeg",
        jpegQuality: 85,
        scale,
        outputDir: dir,
        cancelSignal: o.cancelSignal,
        timeoutInMilliseconds: o.timeoutInMilliseconds,
        concurrency: o.concurrency,
        onStart: () => undefined,
        onFrameUpdate: (n) => o.onProgress?.(n / Math.ceil((to - from + 1) / step)),
      });
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpeg")).sort();
      const tiles = files.map((f, i) => ({ src: `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}`, frame: from + i * step }));
      const sheetProps = {
        title: o.title ?? `${o.id}  frames ${from}–${to} step ${step}`,
        tiles,
        cols: o.cols ?? 6,
        tileWidth: Math.round(comp.width * scale),
        tileHeight: Math.round(comp.height * scale),
      };
      const sheet = await selectComposition({ serveUrl: url, id: ids.sheet, inputProps: sheetProps, browserExecutable });
      fs.mkdirSync(path.dirname(o.out), { recursive: true });
      await renderStill({ serveUrl: url, composition: sheet, inputProps: sheetProps, output: o.out, imageFormat: "png", browserExecutable });
      return o.out;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  const still: RenderBackend["renderStill"] = async (skitId, frame, out, o = {}) => {
    const url = await serveUrl();
    const inputProps = { skit: skitId, showLabels: !!o.debug };
    const composition = await selectComposition({ serveUrl: url, id: o.debug ? ids.debug : ids.skit, inputProps, browserExecutable });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await renderStill({ serveUrl: url, composition, inputProps, frame, output: out, imageFormat: "png", browserExecutable, timeoutInMilliseconds: o.timeoutInMilliseconds });
    return out;
  };

  return { serveUrl, renderSkit, renderSheet, renderStill: still };
};
