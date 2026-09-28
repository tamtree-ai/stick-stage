/**
 * The two frames a skit can be. `9:16` is a short (1080×1920). `16:9` is a widescreen
 * video (1920×1080). Characters and sets belong to one of them.
 */

export const ASPECTS = ["9:16", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const FRAME: Record<Aspect, { width: number; height: number }> = { "9:16": { width: 1080, height: 1920 }, "16:9": { width: 1920, height: 1080 } };

export const ASPECT_LABEL: Record<Aspect, string> = { "9:16": "Short", "16:9": "Widescreen" };

/** Which shipped frame these pixels are, if they are one of the two. */
export const aspectOfFrame = (width: number, height: number): Aspect | undefined => ASPECTS.find((id) => FRAME[id].width === width && FRAME[id].height === height);

export type FrameMeta = { aspect?: Aspect; width?: number; height?: number };

export type FrameCheck = { ok: true; aspect: Aspect; width: number; height: number } | { ok: false; path: "aspect" | "width"; message: string };

/** `aspect` wins when size is omitted. A size must be one of the two frames, and must agree with `aspect`. */
export const frameOfMeta = (meta: FrameMeta): FrameCheck => {
  const hasW = meta.width !== undefined;
  const hasH = meta.height !== undefined;
  if (hasW !== hasH) return { ok: false, path: "width", message: "set width and height together, or set aspect and leave both out" };
  const fromSize = hasW && hasH ? aspectOfFrame(meta.width!, meta.height!) : undefined;
  const pair = `${FRAME["9:16"].width}×${FRAME["9:16"].height} (9:16) or ${FRAME["16:9"].width}×${FRAME["16:9"].height} (16:9)`;
  if (hasW && hasH && !fromSize) return { ok: false, path: "width", message: `only two frames: ${pair}` };
  if (meta.aspect && fromSize && meta.aspect !== fromSize) {
    const f = FRAME[meta.aspect];
    return { ok: false, path: "aspect", message: `aspect "${meta.aspect}" is ${f.width}×${f.height}, not ${meta.width}×${meta.height}` };
  }
  const aspect = meta.aspect ?? fromSize ?? "9:16";
  const frame = FRAME[aspect];
  return { ok: true, aspect, width: frame.width, height: frame.height };
};
