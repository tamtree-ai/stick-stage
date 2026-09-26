import type { Expression } from "../face/schema";
import { EXPR_LEAD } from "../director/tracks";
import { CLOSEUP_BUDGET_MS, LAND_FRAMES, MIN_CLOSEUP_MS, MIN_PUNCH_GAP_MS } from "../director/shots";
import { msToFrame } from "../director/layout";
import { shotAt } from "../director/camera";
import type { Skit } from "../director/schema";
import type { BeatSpan, Program, Timeline } from "../director/timeline";
import type { Finding } from "./types";

/**
 * Story-level self-checks on a compiled timeline (plan M5): the punchline gets a camera event,
 * a reaction follows it, strong emotions get their face close-up within the budget, and one
 * dominant thing happens at a time.
 */

const FACE = ["medium", "close", "extreme"];
const isFace = (framing: string) => FACE.includes(framing);
const secs = (tl: Timeline, f: number) => `${(f / tl.fps).toFixed(2)}s`;

type Hint = (expression: string) => Expression["closeup"];

export const STORY_CHECKS = ["punchline-camera", "punchline-reaction", "emotion-closeups", "closeup-budget", "closeup-hold", "punch-gap", "one-thing", "hook", "length"];

const skitBeat = (skit: Skit, id: string) => skit.beats.find((b) => b.id === id);

export const punchlineChecks = (tl: Timeline, skit: Skit): Finding[] => {
  const out: Finding[] = [];
  tl.beats.forEach((b, i) => {
    if (!b.punchline) return;
    const inBeat = (f: number) => f >= b.from && f <= b.to;
    const cuts = tl.shots.filter((s) => s.frame > 0 && inBeat(s.frame));
    const punches = tl.punchIns.filter((p) => inBeat(p.frame));
    if (!cuts.length && !punches.length)
      out.push({ check: "punchline-camera", level: "error", frame: b.from, message: `punchline "${b.id}" has no shot change or punch-in; add "shot": { "punchIn": { "on": "${b.speaker}" } } or a close-up` });
    const faceOnSpeaker = cuts.some((c) => isFace(c.framing) && c.on === b.speaker);
    if (faceOnSpeaker && punches.length)
      out.push({ check: "punchline-camera", level: "warning", frame: b.from, message: `punchline "${b.id}" has both a face close-up and a punch-in; use one` });
    const next = tl.beats[i + 1];
    const optedOut = skitBeat(skit, b.id)?.reaction === false || tl.cast.length < 2;
    if (!optedOut && (!next || next.kind === "line"))
      out.push({ check: "punchline-reaction", level: "error", frame: b.to, message: `no reaction beat after punchline "${b.id}"; add a silent beat, or set "reaction" on the punchline` });
  });
  return out;
};

/** Hinted expression moments on silent / reaction beats (what the emotion close-up rule covers). */
const emotionMoments = (tl: Timeline, hint: Hint, b: BeatSpan) =>
  tl.cast.flatMap((c) =>
    c.expressionKeys
      .filter((k) => k.frame >= b.from - EXPR_LEAD - 1 && k.frame < b.to && hint(k.expression))
      .map((k) => ({ who: c.id, expression: k.expression, frame: k.frame + 1 })),
  );

export const closeupChecks = (tl: Timeline, skit: Skit, hint: Hint): Finding[] => {
  const out: Finding[] = [];
  const budget = msToFrame(CLOSEUP_BUDGET_MS, tl.fps);
  const faceCuts = tl.shots.filter((s) => isFace(s.framing));
  tl.beats.forEach((b, i) => {
    if (b.kind === "line" || skitBeat(skit, b.id)?.shot) return;
    const ms = emotionMoments(tl, hint, b);
    if (!ms.length) return;
    const covered = ms.some((m) => {
      const live = shotAt(tl, m.frame);
      if (isFace(live.framing) && live.on === m.who) return true;
      return faceCuts.some((s) => s.on === m.who && s.frame >= m.frame - 1 && s.frame <= m.frame + LAND_FRAMES + 3);
    });
    if (covered) return;
    const afterPunch = tl.beats[i - 1]?.punchline === true;
    const recent = faceCuts.some((s) => s.frame < ms[0]!.frame && ms[0]!.frame - s.frame < budget);
    if (recent && !afterPunch && b.kind !== "reaction") {
      out.push({ check: "emotion-closeups", level: "info", frame: ms[0]!.frame, message: `${ms[0]!.who}'s ${ms[0]!.expression} in "${b.id}" stays in the two-shot (close-up budget)` });
      return;
    }
    out.push({ check: "emotion-closeups", level: "error", frame: ms[0]!.frame, message: `${ms[0]!.who}'s ${ms[0]!.expression} in "${b.id}" gets no face close-up` });
  });
  // Budget: one emotion close-up per ~3 s; the punchline → reaction pair counts once.
  const director = faceCuts.filter((s) => s.reason !== "skit shot");
  director.forEach((s, i) => {
    const prev = director[i - 1];
    if (prev && s.frame - prev.frame < budget && !s.reason.startsWith("reaction close-up"))
      out.push({ check: "closeup-budget", level: "warning", frame: s.frame, message: `two emotion close-ups ${secs(tl, s.frame - prev.frame)} apart (budget ${CLOSEUP_BUDGET_MS / 1000} s)` });
  });
  // Never on two consecutive plain lines.
  let plainRun = 0;
  for (const b of tl.beats) {
    const plain = b.kind === "line" && !b.punchline;
    const face = faceCuts.some((s) => s.frame >= b.from && s.frame < b.to);
    plainRun = plain && face ? plainRun + 1 : 0;
    if (plainRun >= 2) out.push({ check: "closeup-budget", level: "warning", frame: b.from, message: `face close-ups on two plain lines in a row (at "${b.id}")` });
  }
  // A close-up holds ≥ 1 s before the next cut.
  const minHold = msToFrame(MIN_CLOSEUP_MS, tl.fps) - 1;
  tl.shots.forEach((s, i) => {
    const end = tl.shots[i + 1]?.frame ?? tl.durationInFrames;
    if (isFace(s.framing) && end - s.frame < minHold)
      out.push({ check: "closeup-hold", level: "warning", frame: s.frame, message: `${s.framing} on ${s.on} holds only ${secs(tl, end - s.frame)}` });
  });
  return out;
};

export const pacingChecks = (tl: Timeline): Finding[] => {
  const out: Finding[] = [];
  const gap = msToFrame(MIN_PUNCH_GAP_MS, tl.fps);
  tl.punchIns.forEach((p, i) => {
    const prev = tl.punchIns[i - 1];
    if (prev && p.frame - prev.frame < gap) out.push({ check: "punch-gap", level: "warning", frame: p.frame, message: `punch-ins ${secs(tl, p.frame - prev.frame)} apart (min ${MIN_PUNCH_GAP_MS / 1000} s)` });
  });
  // One dominant thing at a time: camera events and big gestures don't pile up.
  const events = [
    ...tl.shots.filter((s) => s.frame > 0).map((s) => ({ frame: s.frame, what: `cut to ${s.framing}` })),
    ...tl.punchIns.map((p) => ({ frame: p.frame, what: "punch-in" })),
    ...tl.shakes.map((s) => ({ frame: s.frame, what: "shake" })),
  ].sort((a, b) => a.frame - b.frame);
  events.forEach((e, i) => {
    const prev = events[i - 1];
    if (prev && e.frame - prev.frame < 8 && e.frame !== prev.frame)
      out.push({ check: "one-thing", level: "warning", frame: e.frame, message: `${prev.what} and ${e.what} within ${e.frame - prev.frame} frames` });
  });
  for (let a = 0; a < tl.cast.length; a++)
    for (let b = a + 1; b < tl.cast.length; b++)
      for (const ka of tl.cast[a]!.poseKeys.slice(1))
        for (const kb of tl.cast[b]!.poseKeys.slice(1))
          if (Math.abs(ka.frame - kb.frame) <= 3 && ka.pose !== "idle" && kb.pose !== "idle")
            out.push({ check: "one-thing", level: "warning", frame: ka.frame, message: `${tl.cast[a]!.id} (${ka.pose}) and ${tl.cast[b]!.id} (${kb.pose}) gesture at the same time` });
  return out;
};

/** Whole-skit checks: the hook plays in the first second; length. */
export const programChecks = (p: Program): Finding[] => {
  const out: Finding[] = [];
  const tl = p.scenes[0]!.timeline;
  const first = tl.beats.find((b) => b.kind === "line");
  if (first && first.from > tl.fps)
    out.push({ check: "hook", level: "warning", frame: first.from, message: `the first line starts at ${secs(tl, first.from)}; the hook should play within the first second` });
  const len = p.durationInFrames / p.fps;
  if (len < 15 || len > 30) out.push({ check: "length", level: "info", message: `${len.toFixed(1)} s long (two-person skits target 15–30 s)` });
  return out;
};
