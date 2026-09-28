import type { Program } from "./timeline";

export type SegmentKind = "body" | "transition";

export type SegmentPlan = {
  id: string;
  kind: SegmentKind;
  /** Inclusive frame range of the full program. */
  frames: [number, number];
  /** Scenes this segment depends on. A one-line edit invalidates that scene and its neighbour transitions. */
  scenes: string[];
  hash: string;
};

const fnv = (s: string): string => {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193 + 2);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
};

const stable = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v) ?? "null";
};

/**
 * Non-overlapping segments of a program. A transition's hash covers both neighbouring scenes,
 * so editing one scene re-renders that body and the transitions that touch it.
 */
export const planSegments = (program: Program, engineHash: string, audioHashes: Readonly<Record<string, string>> = {}): SegmentPlan[] => {
  const scenes = program.scenes;
  const unhooked = program.hook ? program.durationInFrames - program.hook.prefixFrames + program.hook.transitionFrames : program.durationInFrames;
  const out: SegmentPlan[] = [];
  const hashOf = (scenesIds: string[], kind: string, frames: [number, number]) =>
    fnv(stable({ kind, frames, engineHash, audioHashes, scenes: scenesIds.map((id) => scenes.find((s) => s.id === id)?.timeline) }));

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]!;
    const next = scenes[i + 1];
    const trans = next?.transitionIn?.durationFrames ?? 0;
    const start = sc.from;
    const end = next ? next.from : unhooked;
    const bodyEnd = Math.max(start, end - trans);
    if (bodyEnd > start) {
      const frames: [number, number] = [start, bodyEnd - 1];
      out.push({ id: `${sc.id}:body`, kind: "body", frames, scenes: [sc.id], hash: hashOf([sc.id], "body", frames) });
    }
    if (next && trans > 0) {
      const frames: [number, number] = [bodyEnd, end - 1];
      if (frames[1] >= frames[0])
        out.push({ id: `${sc.id}:${next.id}`, kind: "transition", frames, scenes: [sc.id, next.id], hash: hashOf([sc.id, next.id], "transition", frames) });
    }
  }
  if (out.length === 0) {
    const frames: [number, number] = [0, Math.max(0, program.durationInFrames - 1)];
    out.push({ id: "all", kind: "body", frames, scenes: scenes.map((s) => s.id), hash: hashOf(scenes.map((s) => s.id), "body", frames) });
  }
  return out;
};

/** How many frames change when `sceneId` changes: that body plus the transitions that touch it. */
export const framesTouched = (plan: readonly SegmentPlan[], sceneId: string): number =>
  plan.filter((s) => s.scenes.includes(sceneId)).reduce((n, s) => n + (s.frames[1] - s.frames[0] + 1), 0);
