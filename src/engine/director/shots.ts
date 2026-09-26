import type { Expression } from "../face/schema";
import type { Framing } from "../shots/framing";
import type { Diagnostic } from "./diagnostics";
import { anchorFrame, msToFrame, type LaidBeat, type Layout } from "./layout";
import type { Moment } from "./tracks";

/** Show the emotion in the two-shot this long before cutting to the face. */
export const LAND_FRAMES = 10;
/** A face close-up holds at least this long before the camera cuts back. */
export const MIN_CLOSEUP_MS = 1000;
/** At most one emotion close-up per this long (the punchline → reaction pair counts once). */
export const CLOSEUP_BUDGET_MS = 3000;
export const MIN_PUNCH_GAP_MS = 1500;
export const PUNCH_FRAMES = 5;
export const PUNCH_FACTOR = 1.28;

/** Planned shots before cameras are solved (framing needs actor positions at the cut frame). */
export type ShotPlan = {
  cuts: { frame: number; framing: Framing; on?: string; reason: string }[];
  punchIns: { frame: number; on: string; reason: string }[];
  shakes: { frame: number; durationFrames: number; intensity: number }[];
};

type Cam = { framing: Framing; on?: string; since: number; punched: boolean };

const FACE: readonly Framing[] = ["medium", "close", "extreme"];
const strength = (h: Expression["closeup"]) => (h === "extreme" ? 2 : h === "close" ? 1 : 0);

/**
 * Default shot policy for two-person exchanges (plan §5), with per-beat `shot` overrides.
 * One camera event per beat; the cut back to `two` waits until a close-up has held ~1 s.
 */
export const planShots = (
  layout: Layout,
  moments: Map<LaidBeat, Moment[]>,
  hint: (expression: string) => Expression["closeup"],
  fps: number,
  diags: Diagnostic[],
): ShotPlan => {
  const plan: ShotPlan = { cuts: [{ frame: 0, framing: "two", reason: "open on two" }], punchIns: [], shakes: [] };
  let cam: Cam = { framing: "two", since: 0, punched: false };
  let lastCloseup = -Infinity;
  let lastPunch = -Infinity;
  const minHold = msToFrame(MIN_CLOSEUP_MS, fps);

  const cut = (frame: number, framing: Framing, on: string | undefined, reason: string) => {
    plan.cuts.push({ frame, framing, on, reason });
    cam = { framing, on, since: frame, punched: false };
  };
  const punch = (frame: number, on: string, reason: string) => {
    plan.punchIns.push({ frame, on, reason });
    cam = { ...cam, punched: true };
    lastPunch = frame;
  };
  const onTwo = () => cam.framing === "two" && !cam.punched;
  /** Two-shot first, then cut to the face once the expression has landed. */
  const emotionCloseup = (m: Moment, reason: string) => {
    const framing = hint(m.expression) ?? "close";
    const frame = onTwo() ? m.frame + LAND_FRAMES : m.frame;
    cut(frame, framing, m.who, `${reason}: ${m.expression}`);
    lastCloseup = frame;
  };
  const strongest = (b: LaidBeat) =>
    (moments.get(b) ?? []).filter((m) => hint(m.expression)).sort((x, y) => strength(hint(y.expression)) - strength(hint(x.expression)) || x.frame - y.frame)[0];

  layout.beats.forEach((b, i) => {
    const from = msToFrame(b.fromMs, fps);
    const prev = layout.beats[i - 1];
    const s = b.beat.shot;
    const where = `${b.path.join(".").replace(/\.(\d+)/g, "[$1]")}.shot`;
    if (s) {
      const at = anchorFrame(b, s.at, `${where}.at`, fps, diags) ?? from;
      if (s.framing !== cam.framing || s.on !== cam.on || s.cut) cut(at, s.framing, s.on, "skit shot");
      if (FACE.includes(s.framing)) lastCloseup = at;
      if (s.punchIn) {
        const pf = anchorFrame(b, s.punchIn.at, `${where}.punchIn.at`, fps, diags) ?? from;
        if (FACE.includes(s.framing))
          diags.push({ level: "warning", code: "punch-on-face", path: `${where}.punchIn`, message: "a punch-in on a face framing: use a close-up or a punch-in, not both" });
        if (pf - lastPunch < msToFrame(MIN_PUNCH_GAP_MS, fps))
          diags.push({ level: "warning", code: "punch-gap", path: `${where}.punchIn`, message: `punch-ins less than ${MIN_PUNCH_GAP_MS / 1000} s apart` });
        punch(pf, s.punchIn.on, "skit punch-in");
      }
      if (s.shake) {
        const sf = anchorFrame(b, s.shake.at, `${where}.shake.at`, fps, diags) ?? from;
        plan.shakes.push({ frame: sf, durationFrames: msToFrame(s.shake.durationMs, fps), intensity: s.shake.intensity });
      }
      return;
    }

    const end = b.line ? from + msToFrame(b.line.durationMs, fps) : from;
    /** Return to the two-shot once the current close-up has held (closes the previous beat's event). */
    const backToTwo = (reason: string) => {
      if (onTwo()) return from;
      const at = Math.max(from, cam.since + minHold);
      if (at < end) cut(at, "two", undefined, reason);
      return at;
    };

    if (b.kind === "line" && !b.punchline) {
      // Plain back-and-forth stays on (or returns to) the two-shot.
      backToTwo("back to two for the next line");
      return;
    }

    const m = strongest(b);
    if (b.punchline) {
      // A silent punchline (a slam, a look) belongs to whoever reacts in it.
      const speaker = b.beat.speaker ?? m?.who;
      if (!speaker) return;
      if (!b.line) {
        // Silent punchline: land the reaction on a face (a new framing), else punch in.
        if (m && (from - lastCloseup >= msToFrame(CLOSEUP_BUDGET_MS, fps) || !onTwo())) return emotionCloseup(m, "punchline emotion");
        if (onTwo() && from - lastPunch >= msToFrame(MIN_PUNCH_GAP_MS, fps)) return punch(from + 2, speaker, "punchline punch-in");
        return cut(from, "close", speaker, "punchline close");
      }
      // The emotion close-up needs room to hold ≥ 1 s before the reaction cut; short lines get the punch-in.
      const cutAt = m ? (onTwo() ? m.frame + LAND_FRAMES : m.frame) : 0;
      const room = msToFrame(b.endMs, fps) - cutAt;
      if (m && from - lastCloseup >= msToFrame(CLOSEUP_BUDGET_MS, fps) && room >= minHold) return emotionCloseup(m, "punchline emotion");
      const twoAt = backToTwo("back to two before the punchline");
      const lastWord = b.line?.words[b.line.words.length - 1];
      const pf = from + msToFrame(lastWord?.startMs ?? 0, fps);
      // Punch in on the last word, if the two-shot has been up long enough to read.
      if (onTwo() && pf - twoAt >= 6 && pf - lastPunch >= msToFrame(MIN_PUNCH_GAP_MS, fps)) return punch(pf, speaker, "punchline punch-in");
      if (onTwo()) cut(Math.max(from, pf), "close", speaker, "punchline close");
      return;
    }

    if (b.kind === "reaction" && m) {
      // Shot–reverse-shot with the punchline; exempt from the close-up budget.
      return emotionCloseup(m, "reaction close-up");
    }

    // A slam is the beat's one dominant thing: no close-up cut away from it.
    if (b.kind === "silent" && m && b.beat.text.length === 0) {
      const afterPunch = prev?.punchline === true;
      if (afterPunch || from - lastCloseup >= msToFrame(CLOSEUP_BUDGET_MS, fps)) emotionCloseup(m, "reaction emotion");
    }
  });
  plan.cuts.sort((a, b) => a.frame - b.frame);
  return plan;
};
