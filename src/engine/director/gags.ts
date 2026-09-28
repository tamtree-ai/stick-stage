import { z } from "zod";
import doubleTake from "../../data/gags/double-take.json";
import faint from "../../data/gags/faint.json";
import freezeFrame from "../../data/gags/freeze-frame.json";
import lookToCamera from "../../data/gags/look-to-camera.json";
import slowClap from "../../data/gags/slow-clap.json";
import spitTake from "../../data/gags/spit-take.json";
import walkOut from "../../data/gags/walk-out.json";
import { SYMBOLS } from "../face/schema";
import type { Action, Beat, SfxCue } from "./schema";

const StepSchema = z.discriminatedUnion("do", [
  z.strictObject({ do: z.literal("look"), to: z.enum(["speaker", "camera", "away"]), atMs: z.number() }),
  z.strictObject({ do: z.literal("expression"), expression: z.string().min(1), atMs: z.number() }),
  z.strictObject({ do: z.literal("pose"), pose: z.string().min(1), atMs: z.number(), durationFrames: z.number().int().min(1).max(30).optional() }),
  z.strictObject({ do: z.literal("symbol"), symbol: z.enum(SYMBOLS), atMs: z.number() }),
  z.strictObject({ do: z.literal("sfx"), id: z.string().min(1), atMs: z.number() }),
  z.strictObject({ do: z.literal("holdProp"), prop: z.string().min(1), atMs: z.number() }),
  z.strictObject({ do: z.literal("fall"), atMs: z.number() }),
  z.strictObject({ do: z.literal("turn"), atMs: z.number() }),
  z.strictObject({ do: z.literal("walkOut"), atMs: z.number() }),
  z.strictObject({ do: z.literal("punchIn"), atMs: z.number() }),
  z.strictObject({ do: z.literal("holdMs"), ms: z.number().min(0) }),
  z.strictObject({ do: z.literal("freeze"), text: z.string().min(1).max(40), atMs: z.number() }),
]);

export const GagSchema = z.strictObject({
  id: z.string().min(1),
  /** The prop a step holds (the spit-take's cup). Checked against the library. */
  prop: z.string().min(1).optional(),
  steps: z.array(StepSchema).min(1),
});
export type GagDef = z.infer<typeof GagSchema>;

/** The shipped gag library. A new gag is a JSON file plus a line here. */
export const GAGS: GagDef[] = [doubleTake, lookToCamera, spitTake, faint, slowClap, walkOut, freezeFrame].map((g) => GagSchema.parse(g));

export const GAG_IDS = GAGS.map((g) => g.id);

const atMs = (ms: number) => ({ ms });

export type ExpandedGag = { actions: Action[]; sfx: SfxCue[]; holdMs: number; punchInMs?: number; freeze?: { text: string; atMs: number } };

/**
 * Expand one named gag into actions and sounds. `speaker` is who a look lands on
 * (the line's speaker, else the other person).
 */
export const expandGag = (gag: GagDef, who: string, speaker: string | undefined, side: "left" | "right"): ExpandedGag => {
  const lookAt = speaker && speaker !== who ? speaker : speaker ?? who;
  const actions: Action[] = [];
  const sfx: SfxCue[] = [];
  let holdMs = 0;
  let punchInMs: number | undefined;
  let freeze: ExpandedGag["freeze"];
  for (const step of gag.steps) {
    switch (step.do) {
      case "look":
        actions.push({
          do: "look",
          who,
          to: step.to === "speaker" ? lookAt : step.to === "camera" ? "camera" : { x: side === "left" ? 0.08 : 0.92, y: 0.42 },
          at: atMs(step.atMs),
        });
        break;
      case "expression":
        actions.push({ do: "expression", who, expression: step.expression, at: atMs(step.atMs) });
        break;
      case "pose":
        actions.push({ do: "pose", who, pose: step.pose, at: atMs(step.atMs), ...(step.durationFrames ? { durationFrames: step.durationFrames } : {}) });
        break;
      case "symbol":
        actions.push({ do: "symbol", who, symbol: step.symbol, at: atMs(step.atMs) });
        break;
      case "sfx":
        sfx.push({ id: step.id, at: atMs(step.atMs), volume: 1 });
        break;
      case "holdProp":
        actions.push({ do: "hold", who, prop: step.prop, hand: "R", at: atMs(step.atMs) });
        break;
      case "fall":
        actions.push({ do: "fall", who, at: atMs(step.atMs) });
        break;
      case "turn":
        actions.push({ do: "turn", who, at: atMs(step.atMs) });
        break;
      case "walkOut":
        actions.push({ do: "walkTo", who, mark: side === "left" ? "off-left" : "off-right", at: atMs(step.atMs), speed: "walk" });
        break;
      case "punchIn":
        punchInMs = step.atMs;
        break;
      case "holdMs":
        holdMs = Math.max(holdMs, step.ms);
        break;
      case "freeze":
        freeze = { text: step.text, atMs: step.atMs };
        break;
    }
  }
  return { actions, sfx, holdMs, ...(punchInMs !== undefined ? { punchInMs } : {}), ...(freeze ? { freeze } : {}) };
};

const msOf = (anchor: SfxCue["at"]): number => (anchor && "ms" in anchor ? anchor.ms : 0);

/** Replace `gag` actions on a beat. Unknown names are returned for a diagnostic. */
export const expandBeatGags = (beat: Beat, gags: readonly GagDef[], otherThan: (who: string) => string | undefined): { beat: Beat; unknown: string[] } => {
  const byId = new Map(gags.map((g) => [g.id, g]));
  const unknown: string[] = [];
  const actions: Action[] = [];
  const sfx = [...beat.sfx];
  let hold = beat.holdAfterMs ?? 0;
  let duration = beat.durationMs;
  let shot = beat.shot;
  let text = [...beat.text];
  for (const a of beat.actions) {
    if (a.do !== "gag") {
      actions.push(a);
      continue;
    }
    const gag = byId.get(a.gag);
    if (!gag) {
      unknown.push(a.gag);
      continue;
    }
    const shift = a.at && "ms" in a.at ? a.at.ms : 0;
    const exp = expandGag(gag, a.who, otherThan(a.who) ?? beat.speaker, a.side ?? "right");
    for (const act of exp.actions) actions.push({ ...act, at: atMs(shift + msOf(act.at)) });
    for (const s of exp.sfx) sfx.push({ ...s, at: atMs(shift + msOf(s.at)) });
    if (exp.holdMs) {
      hold = Math.max(hold, exp.holdMs);
      if (beat.silent) duration = Math.max(duration ?? 0, exp.holdMs);
    }
    if (exp.punchInMs !== undefined && !shot?.punchIn)
      shot = { ...(shot ?? { framing: "two" as const }), punchIn: { on: a.who, at: atMs(shift + exp.punchInMs) } };
    if (exp.freeze && !text.some((t) => t.type === "slam"))
      text = [...text, { type: "slam", value: exp.freeze.text, at: atMs(shift + exp.freeze.atMs), durationMs: 1100 }];
  }
  return {
    beat: { ...beat, actions, sfx, text, ...(hold ? { holdAfterMs: hold } : {}), ...(duration !== beat.durationMs && duration !== undefined ? { durationMs: duration } : {}), ...(shot ? { shot } : {}) },
    unknown,
  };
};
