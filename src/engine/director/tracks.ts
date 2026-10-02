import { rand } from "../lib/seed";
import type { Library } from "../rig/actorState";
import { seatHeightAt } from "../set/seating";
import type { SetDef } from "../set/schema";
import { unknownId, type Diagnostic } from "./diagnostics";
import { anchorFrame, msToFrame, type Layout, type LaidBeat } from "./layout";
import { allMarks, highFive, markX, OFF_MARK, shove, walk, type MoveCtx } from "./moves";
import { facingAt, gazeToward, xAt } from "./placement";
import { stageSpeech } from "./speech";
import type { Action, ReactionTable, Skit } from "./schema";
import { CLASSIC, type DirectingStyle } from "./style";
import type { CastTrack, Facing } from "./timeline";
import { checkOverlaps, sortTracks } from "./trackOrder";

/** Poses start this many frames before their anchor, so the 4-frame move lands on it. */
export const POSE_LEAD = 2;
/** A beat's expression lands just before its line starts. */
export const EXPR_LEAD = 3;
export const DEFAULT_SLIDE_FRAMES = 8;
export const DEFAULT_HOP = 0.1;
export const DEFAULT_SYMBOL_MS = 1000;
/** Listeners nod on lines at least this long, on a seeded ~60% of them. */
const NOD_MIN_MS = 1400;
const NOD_CHANCE = 0.6;

/** An expression landing on screen: what the shot policy looks at for emotion close-ups. */
export type Moment = { who: string; expression: string; frame: number };

export type TrackResult = { cast: CastTrack[]; moments: Map<LaidBeat, Moment[]> };

type Ctx = {
  skit: Skit;
  set: SetDef;
  lib: Library;
  fps: number;
  diags: Diagnostic[];
  byId: Map<string, CastTrack>;
  mark: Map<string, string>;
  /** `"figure:orbit.perihelion"` → frame fractions (scene figures). */
  figureAt?: (ref: string) => { x: number; y: number } | undefined;
};

const moveCtx = (ctx: Ctx): MoveCtx => ({ set: ctx.set, lib: ctx.lib, width: ctx.skit.meta.width, fps: ctx.fps, cast: ctx.byId.values() });

const lastExpression = (c: CastTrack, frame: number): string => {
  let e = c.expressionKeys[0]!.expression;
  let at = -1;
  for (const k of c.expressionKeys) if (k.frame <= frame && k.frame >= at) [e, at] = [k.expression, k.frame];
  return e;
};

const seatPx = (ctx: Ctx, who: string, path: string): number | undefined => {
  const mark = ctx.mark.get(who)!;
  const px = seatHeightAt(ctx.set, mark);
  if (px === undefined)
    ctx.diags.push({ level: "error", code: "no-seat", path, message: `no seat at mark "${mark}" in set "${ctx.set.id}"`, expected: `a set with a chair/bench/couch whose "seatFor" lists "${mark}"` });
  return px;
};

/** Initial state per cast member (frame 0). */
const initCast = (ctx: Ctx): CastTrack[] =>
  ctx.skit.cast.map((m, i) => {
    const path = `cast[${i}]`;
    const x = markX(ctx.set, m.mark);
    if (x === undefined) ctx.diags.push(unknownId("mark", m.mark, allMarks(ctx.set), ["cast", i, "mark"]));
    ctx.mark.set(m.id, m.mark);
    const facing: Facing = m.facing ?? ((x ?? 0.5) <= 0.5 ? "right" : "left");
    const seated = m.seated ? seatPx(ctx, m.id, `${path}.seated`) : undefined;
    const heldKind = m.holding ? ctx.lib.props[m.holding.prop]?.kind : undefined;
    if (m.holding?.text && heldKind && heldKind !== "sign")
      ctx.diags.push({ level: "warning", code: "prop-text", path: `${path}.holding.text`, message: `"text" is drawn on a sign; "${m.holding.prop}" is a ${heldKind}` });
    if (m.holding?.screen && heldKind && heldKind !== "laptop")
      ctx.diags.push({ level: "warning", code: "prop-screen", path: `${path}.holding.screen`, message: `"screen" is drawn on a laptop; "${m.holding.prop}" is a ${heldKind}` });
    return {
      id: m.id,
      character: m.character,
      label: m.label,
      seed: `${m.id}-${ctx.skit.meta.title}`,
      x: x ?? 0.5,
      facing,
      poseKeys: [{ frame: 0, pose: m.pose ?? (seated !== undefined ? "sit" : "idle") }],
      expressionKeys: [{ frame: 0, expression: m.expression ?? "neutral" }],
      gazeKeys: [],
      nodKeys: [],
      seatKeys: seated !== undefined ? [{ frame: 0, seatPx: seated }] : [],
      propKeys: m.holding ? [{ frame: 0, hand: m.holding.hand, prop: m.holding.prop, text: m.holding.text, screen: m.holding.screen }] : [],
      symbolKeys: [],
      speech: [],
      moveKeys: [],
      facingKeys: [],
      hopKeys: [],
      gaitKeys: [],
      browKeys: [],
      fallKeys: [],
    };
  });

const applyAction = (ctx: Ctx, b: LaidBeat, a: Action, path: string, moments: Moment[]): void => {
  const c = ctx.byId.get(a.who);
  if (!c) {
    ctx.diags.push(unknownId("cast member", a.who, [...ctx.byId.keys()], [...path.split("."), "who"]));
    return;
  }
  const frame = anchorFrame(b, a.at, `${path}.at`, ctx.fps, ctx.diags);
  if (frame === undefined) return;
  const f = Math.max(0, frame);
  switch (a.do) {
    case "pose":
      c.poseKeys.push({ frame: Math.max(0, f - POSE_LEAD), pose: a.pose, durationFrames: a.durationFrames });
      return;
    case "expression":
      c.expressionKeys.push({ frame: Math.max(0, f - 1), expression: a.expression });
      moments.push({ who: a.who, expression: a.expression, frame: f });
      return;
    case "look": {
      if (typeof a.to === "string" && a.to.startsWith("figure:")) {
        const pt = ctx.figureAt?.(a.to);
        if (!pt) {
          ctx.diags.push({ level: "error", code: "figure-anchor", path: `${path}.to`, message: `no figure point "${a.to}"`, expected: `"figure:<id>" or "figure:<id>.<anchor>" for a figure in this scene` });
          return;
        }
        c.gazeKeys.push({ frame: f, ...gazeToward({ x: xAt(c, f), facing: facingAt(c, f) }, pt, 0.42) });
        return;
      }
      if (typeof a.to === "string" && a.to !== "camera" && !ctx.byId.has(a.to)) {
        ctx.diags.push(unknownId("look target", a.to, ["camera", ...ctx.byId.keys()], [...path.split("."), "to"]));
        return;
      }
      const self = { x: xAt(c, f), facing: facingAt(c, f) };
      const g =
        a.to === "camera" ? { x: 0, y: 0 } : typeof a.to === "string" ? gazeToward(self, { x: xAt(ctx.byId.get(a.to)!, f) }) : gazeToward(self, a.to, 0.3);
      c.gazeKeys.push({ frame: f, ...g });
      return;
    }
    case "turn": {
      const now = facingAt(c, f);
      c.facingKeys.push({ frame: f, facing: a.facing ?? (now === "left" ? "right" : "left") });
      return;
    }
    case "hop":
      c.hopKeys.push({ frame: f, height: a.height ?? DEFAULT_HOP });
      return;
    case "nod":
      c.nodKeys.push({ frame: f });
      return;
    case "slideTo": {
      const x = markX(ctx.set, a.mark);
      if (x === undefined) {
        ctx.diags.push(unknownId("mark", a.mark, allMarks(ctx.set), [...path.split("."), "mark"]));
        return;
      }
      c.moveKeys.push({ frame: f, x, durationFrames: a.durationFrames ?? DEFAULT_SLIDE_FRAMES });
      ctx.mark.set(a.who, a.mark);
      return;
    }
    case "hold": {
      const kind = ctx.lib.props[a.prop]?.kind;
      if (a.text && kind && kind !== "sign")
        ctx.diags.push({ level: "warning", code: "prop-text", path, message: `"text" is drawn on a sign; "${a.prop}" is a ${kind}`, expected: `prop "sign", or omit "text"` });
      if (a.screen && kind && kind !== "laptop")
        ctx.diags.push({ level: "warning", code: "prop-screen", path, message: `"screen" is drawn on a laptop; "${a.prop}" is a ${kind}`, expected: `prop "laptop", or omit "screen"` });
      c.propKeys.push({ frame: f, hand: a.hand, prop: a.prop, text: a.text, screen: a.screen });
      return;
    }
    case "putAway":
    case "drop":
      c.propKeys.push({ frame: f, hand: a.hand, prop: null, drop: a.do === "drop" });
      return;
    case "symbol":
      c.symbolKeys.push({ frame: f, symbol: a.symbol, durationFrames: msToFrame(a.durationMs ?? DEFAULT_SYMBOL_MS, ctx.fps) });
      return;
    case "sit": {
      const px = seatPx(ctx, a.who, path);
      if (px === undefined) return;
      c.seatKeys.push({ frame: f, seatPx: px });
      c.poseKeys.push({ frame: f, pose: "sit" });
      return;
    }
    case "stand":
      c.seatKeys.push({ frame: f, seatPx: null });
      c.poseKeys.push({ frame: f, pose: "idle" });
      return;
    case "fall":
      c.fallKeys.push({ frame: f });
      c.poseKeys.push({ frame: f, pose: "faint" });
      return;
    case "gag":
      return;
    case "walkTo": {
      const x = markX(ctx.set, a.mark);
      if (x === undefined) {
        ctx.diags.push(unknownId("mark", a.mark, allMarks(ctx.set), [...path.split("."), "mark"]));
        return;
      }
      if (c.seatKeys.length && c.seatKeys[c.seatKeys.length - 1]!.seatPx !== null && c.seatKeys[c.seatKeys.length - 1]!.frame <= f)
        ctx.diags.push({ level: "warning", code: "walk-seated", path, message: `${a.who} walks while seated; add a "stand" action first` });
      walk(moveCtx(ctx), c, f, x, a.speed, a.facing);
      ctx.mark.set(a.who, a.mark);
      return;
    }
    case "highFive":
    case "shove": {
      const otherId = a.do === "highFive" ? a.with : a.target;
      const other = ctx.byId.get(otherId);
      const key = a.do === "highFive" ? "with" : "target";
      if (!other || other.id === c.id) {
        ctx.diags.push(unknownId("cast member", otherId, [...ctx.byId.keys()].filter((k) => k !== c.id), [...path.split("."), key]));
        return;
      }
      if (a.do === "highFive") highFive(moveCtx(ctx), c, other, f);
      else shove(moveCtx(ctx), c, other, f, a.distance);
      ctx.mark.set(c.id, OFF_MARK);
      ctx.mark.set(other.id, OFF_MARK);
      sortTracks(other);
      return;
    }
  }
};

/** Listener auto-reactions: look at the speaker, maybe nod, react on the last word. */
const autoListen = (ctx: Ctx, b: LaidBeat, reactions: ReactionTable, from: number) => {
  const speaker = ctx.byId.get(b.beat.speaker!)!;
  const lastWord = b.line!.words[b.line!.words.length - 1];
  const speakerExpr = lastExpression(speaker, from);
  for (const c of ctx.byId.values()) {
    if (c.id === speaker.id) continue;
    const mine = (kind: Action["do"]) => b.beat.actions.some((a) => a.who === c.id && a.do === kind);
    if (!mine("look")) {
      const g = gazeToward({ x: xAt(c, from), facing: facingAt(c, from) }, { x: xAt(speaker, from) });
      c.gazeKeys.push({ frame: Math.max(0, from - 2), x: g.x, y: null });
    }
    const durMs = b.line!.durationMs;
    if (durMs >= NOD_MIN_MS && !mine("pose") && !mine("nod") && rand(c.seed, `nod-${b.beat.id}`) < NOD_CHANCE)
      c.nodKeys.push({ frame: from + msToFrame(durMs * 0.45, ctx.fps) });
    // The punchline's reaction gets its own beat (the reaction close-up) instead.
    const reactsLater = b.punchline && b.beat.reaction !== false;
    if (b.beat.reaction === false || reactsLater || mine("expression") || !lastWord) continue;
    const react = b.beat.reaction ?? reactions.listen[speakerExpr] ?? reactions.defaultListen;
    const at = from + msToFrame(lastWord.startMs, ctx.fps);
    if (react !== lastExpression(c, at)) c.expressionKeys.push({ frame: at - 1, expression: react });
  }
};

/** Beats + actions → per-cast tracks, and the expression moments the shot policy reads. */
export const buildTracks = (skit: Skit, layout: Layout, set: SetDef, lib: Library, reactions: ReactionTable, fps: number, diags: Diagnostic[], style: DirectingStyle = CLASSIC, figureAt?: Ctx["figureAt"]): TrackResult => {
  const ctx: Ctx = { skit, set, lib, fps, diags, byId: new Map(), mark: new Map(), figureAt };
  for (const c of initCast(ctx)) ctx.byId.set(c.id, c);
  const moments = new Map<LaidBeat, Moment[]>();
  for (const b of layout.beats) {
    const m: Moment[] = [];
    moments.set(b, m);
    const from = msToFrame(b.fromMs, fps);
    // Voice-over: no mouth, no body, and nobody on stage turns to it.
    // A thought keeps the body and the face, and shuts the mouth.
    if (b.kind === "line" && b.thought) {
      const speaker = ctx.byId.get(b.beat.speaker!);
      if (!speaker) {
        diags.push(unknownId("speaker", b.beat.speaker!, [...ctx.byId.keys()], [...b.path, "speaker"]));
        continue;
      }
      if (b.beat.expression) {
        speaker.expressionKeys.push({ frame: Math.max(0, from - EXPR_LEAD), expression: b.beat.expression });
        m.push({ who: speaker.id, expression: b.beat.expression, frame: from });
      }
    }
    if (b.kind === "line" && !b.narrator && !b.thought) {
      const speaker = ctx.byId.get(b.beat.speaker!);
      if (!speaker) {
        diags.push(unknownId("speaker", b.beat.speaker!, [...ctx.byId.keys()], [...b.path, "speaker"]));
        continue;
      }
      if (b.beat.expression) {
        speaker.expressionKeys.push({ frame: Math.max(0, from - EXPR_LEAD), expression: b.beat.expression });
        m.push({ who: speaker.id, expression: b.beat.expression, frame: from });
      }
      speaker.gazeKeys.push({ frame: Math.max(0, from - 2), x: null, y: null });
      speaker.speech.push({ startFrame: from, cues: b.line!.mouthCues });
      stageSpeech(ctx.skit, b, speaker, ctx.lib.characters[speaker.character], from, ctx.fps, POSE_LEAD);
      autoListen(ctx, b, reactions, from);
    }
    if (b.kind === "reaction" && b.reactionExpression) {
      const reactors = b.reactors ?? (b.reactor ? [b.reactor] : []);
      reactors.forEach((id, n) => {
        const who = ctx.byId.get(id);
        if (!who) return;
        who.expressionKeys.push({ frame: from + n * 6, expression: b.reactionExpression! });
        if (n === 0) m.push({ who: id, expression: b.reactionExpression!, frame: from + 1 });
      });
    }
    b.beat.actions.forEach((a, j) => {
      if (style.speedLines && a.do === "pose") {
        const c = ctx.byId.get(a.who);
        const frame = anchorFrame(b, a.at, "speed", fps, []);
        if (c && frame !== undefined) c.symbolKeys.push({ frame, symbol: "speed-lines", durationFrames: 10 });
      }
      applyAction(ctx, b, a, `${b.path.join(".").replace(/\.(\d+)/g, "[$1]")}.actions[${j}]`, m);
      // Later actions read positions and facings, so keep every track in frame order.
      const c = ctx.byId.get(a.who);
      if (c) sortTracks(c);
    });
  }
  const cast = [...ctx.byId.values()];
  for (const c of cast) sortTracks(c);
  checkOverlaps(cast, diags);
  return { cast, moments };
};
