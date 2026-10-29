import type { Diagnostic } from "./diagnostics";
import { msToFrame, type LaidBeat } from "./layout";
import type { Skit } from "./schema";
import type { SafeArea } from "../text/safeArea";
import type { VerdictEvent } from "./timeline";
import { VERDICT } from "../text/layout";

export { VerdictSchema, type Verdict } from "./verdictSchema";

/**
 * The "Who's wrong?" meter, compiled: frame-keyed values, the intro stamp and the comment ask.
 * Schema in `verdictSchema.ts`.
 */

/** The last value a run of beats leaves the meter on (multi-scene: the next scene starts there). */
export const verdictAfter = (start: number, beats: readonly { verdict?: number }[]): number =>
  beats.reduce((v, b) => b.verdict ?? v, start);

/** The meter as frame-keyed values, the intro stamp and the comment ask. */
export const verdictEvent = (skit: Skit, laid: readonly LaidBeat[], fps: number, durationInFrames: number, diags: Diagnostic[]): VerdictEvent | undefined => {
  const v = skit.overlay.verdict;
  if (!v) {
    skit.beats.forEach((b, i) => {
      if (b.verdict !== undefined)
        diags.push({ level: "warning", code: "verdict-unused", path: `beats[${i}].verdict`, message: "this beat moves a verdict meter the skit doesn't have", expected: `"overlay": { "verdict": {} }` });
    });
    return undefined;
  }
  const castIds = skit.cast.map((c) => c.id);
  const sides = v.sides ?? (castIds.length >= 2 ? [castIds[0]!, castIds[1]!] : undefined);
  if (!sides) {
    diags.push({ level: "error", code: "verdict-sides", path: "overlay.verdict.sides", message: "a verdict needs two sides", expected: "two cast ids" });
    return undefined;
  }
  sides.forEach((id, i) => {
    if (!castIds.includes(id))
      diags.push({ level: "error", code: "verdict-sides", path: `overlay.verdict.sides[${i}]`, message: `"${id}" is not in this scene's cast`, expected: castIds.join(", ") });
  });
  if (sides[0] === sides[1]) diags.push({ level: "error", code: "verdict-sides", path: "overlay.verdict.sides", message: "both sides are the same person" });
  const names = v.names ?? [sides[0].toUpperCase(), sides[1].toUpperCase()];
  const keys = [{ frame: 0, value: v.start }];
  for (const b of laid) {
    if (b.synthetic || b.beat.verdict === undefined) continue;
    // The meter tips as the point lands: the end of the line, or the end of a silent beat.
    const ms = b.line ? b.zeroMs + b.line.durationMs : b.endMs;
    keys.push({ frame: Math.min(durationInFrames - 1, msToFrame(ms, fps)), value: b.beat.verdict });
  }
  const punch = laid.find((b) => b.punchline && !b.synthetic);
  const askFrom = punch ? msToFrame(punch.line ? punch.zeroMs + punch.line.durationMs : punch.endMs, fps) : undefined;
  if (askFrom !== undefined && durationInFrames - askFrom < msToFrame(VERDICT.askMinMs, fps))
    diags.push({ level: "warning", code: "verdict-ask-short", path: "timing.tailMs", message: `the comment ask is up for only ${((durationInFrames - askFrom) / fps).toFixed(1)} s`, expected: `≥ ${VERDICT.askMinMs / 1000} s after the punchline: a reaction beat, "holdAfterMs" or a longer tail` });
  return {
    question: v.question,
    sides: [
      { id: sides[0], name: names[0] },
      { id: sides[1], name: names[1] },
    ],
    keys,
    intro: v.intro,
    ...(askFrom !== undefined ? { ask: v.ask ?? `Comment: ${names[0]} or ${names[1]}?`, askFrom } : {}),
  };
};

/** Face shots frame below the meter: the top safe margin grows by the meter's band. */
export const verdictSafeArea = (sa: SafeArea, skit: Skit): SafeArea => (skit.overlay.verdict ? { ...sa, top: sa.top + VERDICT.band } : sa);

/** The meter owns the top of the frame: a POV or hook card under it is dropped, with a warning. */
export const verdictTopCard = (skit: Skit, diags: Diagnostic[]): string | undefined => {
  const card = skit.overlay.pov ?? skit.overlay.hook;
  if (!skit.overlay.verdict) return card;
  if (card) diags.push({ level: "warning", code: "verdict-top", path: skit.overlay.pov ? "overlay.pov" : "overlay.hook", message: "the verdict meter takes the top of the frame; this card is not drawn", expected: "put the setup in the first line instead" });
  return undefined;
};
