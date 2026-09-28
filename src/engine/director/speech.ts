import type { Character } from "../rig/schema";
import type { PreparedLine, WordTiming } from "../voice/schema";
import { normWord } from "../voice/words";
import { msToFrame, type LaidBeat } from "./layout";
import type { Skit } from "./schema";
import type { CastTrack } from "./timeline";

/** One hand gesture, picked from the line, plus head beats on stressed words. */
export type SpeechMotion = {
  nods: { ms: number; amount: number }[];
  /** A brow lift, on the last word of a question. */
  browMs?: number;
  gesture?: { pose: "point" | "shrug" | "hold-out" | "hands-on-hips"; fraction: number; durationFrames: number };
};

const energyOf = (character: Pick<Character, "energy"> | undefined): number => {
  const e = character?.energy;
  return e === undefined ? 0.55 : Math.max(0, Math.min(1, e));
};

/** A word that earns a head beat: long, shouted, capitalised, or the slam. */
const stressed = (word: WordTiming, index: number, slam: string | undefined): boolean => {
  const norm = normWord(word.text);
  if (!norm) return false;
  if (norm.length >= 7) return true;
  if (/[!?]/.test(word.text)) return true;
  if (index > 0 && /^[A-Z]/.test(word.text)) return true;
  if (slam && normWord(slam).includes(norm)) return true;
  return false;
};

const isList = (text: string): boolean => (text.match(/,/g) ?? []).length >= 1 || /\b(first|second|one|two|three)\b/i.test(text);

/**
 * Seeded speech motion from words the compiler already has. `energy` (0–1) scales the nods
 * and, below 0.35, drops the hand gesture, so a high-energy character moves more than a low one.
 * The caller skips the gesture when the beat already has a pose.
 */
export const speechMotion = (line: PreparedLine, character: Pick<Character, "energy"> | undefined, slam?: string): SpeechMotion => {
  const energy = energyOf(character);
  const words = line.words;
  const nods = words.flatMap((w, i) => (stressed(w, i, slam) ? [{ ms: w.startMs, amount: +(3 + 7 * energy).toFixed(2) }] : []));
  const question = /\?\s*$/.test(line.text.trim());
  const last = words[words.length - 1];
  const browMs = question && last ? last.startMs : undefined;
  if (energy < 0.35) return { nods, ...(browMs !== undefined ? { browMs } : {}) };

  const saysYou = words.some((w) => normWord(w.text) === "you" || normWord(w.text) === "your");
  const pose = question ? "hold-out" : saysYou ? "point" : isList(line.text) ? "shrug" : words.length <= 6 ? "hands-on-hips" : "shrug";
  return {
    nods,
    ...(browMs !== undefined ? { browMs } : {}),
    gesture: { pose, fraction: 0.16, durationFrames: energy > 0.75 ? 4 : 7 },
  };
};

const BODY = new Set(["pose", "gag", "fall", "hold", "drop", "slideTo", "walkTo"]);

/** Head beats and one gesture. An authored pose, gag, fall or prop move wins. */
export const stageSpeech = (skit: Skit, b: LaidBeat, speaker: CastTrack, character: Pick<Character, "energy"> | undefined, from: number, fps: number, poseLead: number) => {
  if (skit.speechMotion === "off" || !b.line) return;
  const authored = b.beat.actions.some((a) => a.who === speaker.id && BODY.has(a.do));
  const slam = b.beat.text.find((t) => t.type === "slam");
  const motion = speechMotion(b.line, character, slam && slam.type === "slam" ? slam.value : undefined);
  for (const n of motion.nods) speaker.nodKeys.push({ frame: from + msToFrame(n.ms, fps), amount: n.amount });
  if (motion.browMs !== undefined) speaker.browKeys.push({ frame: from + msToFrame(motion.browMs, fps), raise: 0.55 });
  if (authored || !motion.gesture) return;
  const g = motion.gesture;
  const home = [...speaker.poseKeys].reverse().find((k) => k.frame <= from)?.pose ?? "idle";
  const gf = from + msToFrame(b.line.durationMs * g.fraction, fps);
  speaker.poseKeys.push({ frame: Math.max(0, gf - poseLead), pose: g.pose, durationFrames: g.durationFrames });
  const back = gf + msToFrame(Math.min(650, b.line.durationMs * 0.4), fps);
  if (back > gf + 4) speaker.poseKeys.push({ frame: back, pose: home });
};
