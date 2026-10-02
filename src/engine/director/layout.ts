import type { PreparedLine } from "../voice/schema";
import { resolveAnchor, type AnchorContext } from "./anchors";
import type { Diagnostic } from "./diagnostics";
import { isNarration, type Anchor, type Beat, type Skit } from "./schema";
import { CLASSIC, type DirectingStyle } from "./style";
import type { BeatKind } from "./timeline";

export const DEFAULT_SILENT_MS = 900;
/** Reaction close-up after the punchline: ~10 frames in the two-shot + ≥ 1 s on the face. Classic's number. */
export const REACTION_MS = CLASSIC.reactionMs;

export type LaidBeat = {
  beat: Beat;
  /** JSON path of the beat (synthetic beats point at the punchline that caused them). */
  path: (string | number)[];
  kind: BeatKind;
  synthetic: boolean;
  punchline: boolean;
  /** A voice-over line: nobody on stage speaks it. */
  narrator: boolean;
  /** A thought: the speaker is on stage, mouth shut. */
  thought: boolean;
  /** Absolute ms where anchors are measured from: line start (spoken) or beat start (silent). */
  zeroMs: number;
  /** Beat start/end in absolute ms (end includes the hold after). */
  fromMs: number;
  endMs: number;
  line?: PreparedLine;
  ctx: AnchorContext;
  /** Synthetic reaction beats: who reacts and with what. */
  reactor?: string;
  /** Extra reactors (a chaotic style). The first is `reactor`. */
  reactors?: string[];
  reactionExpression?: string;
};

export type Layout = { beats: LaidBeat[]; totalMs: number };

/** Which beats are punchlines: the flagged ones, else the last spoken beat. */
export const punchlineIndexes = (skit: Skit): Set<number> => {
  const flagged = skit.beats.flatMap((b, i) => (b.punchline ? [i] : []));
  if (flagged.length) return new Set(flagged);
  for (let i = skit.beats.length - 1; i >= 0; i--) if (!skit.beats[i]!.silent && skit.beats[i]!.punchline !== false) return new Set([i]);
  return new Set();
};

/**
 * The listener who reacts to `speaker`: whoever spoke last before them, else the first other
 * cast member. Nobody reacts to the narrator except the beat's `focus`.
 */
export const reactorFor = (skit: Skit, beatIndex: number, speaker: string): string | undefined => {
  const beat = skit.beats[beatIndex];
  if (beat && isNarration(skit, beat)) return beat.focus;
  const onStage = (id: string) => skit.cast.some((c) => c.id === id);
  for (let i = beatIndex - 1; i >= 0; i--) {
    const s = skit.beats[i]!.speaker;
    if (s && s !== speaker && onStage(s)) return s;
  }
  return skit.cast.find((c) => c.id !== speaker)?.id;
};

/**
 * Lay beats end to end. A beat's pause (`pauseBeforeMs`, else the skit gap) is dead air that
 * holds on the previous shot; the beat itself starts when its line (or silence) starts.
 */
export const layoutBeats = (
  skit: Skit,
  lines: ReadonlyMap<string, PreparedLine>,
  reactionFor: (beat: Beat, index: number) => { reactor: string; expression: string } | undefined,
  diags: Diagnostic[],
  style: DirectingStyle = CLASSIC,
): Layout => {
  const punch = punchlineIndexes(skit);
  const out: LaidBeat[] = [];
  let cursor = skit.timing.leadInMs;
  /** The previous beat, if it was cut from an audio file: the next cut from the same file keeps its timing. */
  let lastClip: { src: string; endMs: number } | undefined;
  const push = (beat: Beat, path: (string | number)[], kind: BeatKind, synthetic: boolean, isPunch: boolean, extra: Partial<LaidBeat> = {}) => {
    const a = beat.audio;
    const clipGap = a.source === "file" && lastClip?.src === a.src && a.startMs !== undefined ? Math.max(0, a.startMs - lastClip.endMs) : undefined;
    const gapDefault = skit.timing.gapMs === CLASSIC.gapMs ? style.gapMs : skit.timing.gapMs;
    const gap = beat.pauseBeforeMs ?? clipGap ?? (out.length === 0 || synthetic ? 0 : gapDefault);
    lastClip = a.source === "file" && a.endMs !== undefined && kind === "line" ? { src: a.src, endMs: a.endMs } : undefined;
    const line = extra.line;
    const durMs = line ? line.durationMs : (beat.durationMs ?? DEFAULT_SILENT_MS);
    const hold = beat.holdAfterMs ?? 0;
    const fromMs = cursor + gap;
    const laid: LaidBeat = {
      beat,
      path,
      kind,
      synthetic,
      punchline: isPunch,
      narrator: kind === "line" && isNarration(skit, beat),
      thought: kind === "line" && !!beat.voiceOver && !isNarration(skit, beat),
      zeroMs: fromMs,
      fromMs,
      endMs: fromMs + durMs + hold,
      ctx: { words: line?.words ?? [], durationMs: durMs, minMs: -gap, maxMs: durMs + hold },
      ...extra,
    };
    out.push(laid);
    cursor = laid.endMs;
  };

  skit.beats.forEach((beat, i) => {
    const path = ["beats", i];
    const isPunch = punch.has(i);
    if (beat.silent) {
      if (beat.line) diags.push({ level: "error", code: "silent-with-line", path: `beats[${i}].line`, message: "a silent beat has no line", expected: `remove "line", or set "silent": false` });
      push(beat, path, "silent", false, isPunch);
      return;
    }
    if (!beat.speaker || !beat.line) {
      diags.push({
        level: "error",
        code: "beat-incomplete",
        path: `beats[${i}]`,
        message: `a spoken beat needs "speaker" and "line" (or "silent": true)`,
        example: `{ "id": "${beat.id}", "speaker": "${skit.cast[0]?.id ?? "milo"}", "line": "…" }  or  { "id": "${beat.id}", "silent": true, "durationMs": 900 }`,
      });
      return;
    }
    const line = lines.get(beat.id);
    if (!line && beat.audio.source === "file") {
      diags.push({ level: "error", code: "clip-unprepared", path: `beats[${i}].audio`, message: `the clip for "${beat.id}" isn't prepared`, expected: `run \`pnpm prep <skit>\` (trims "${beat.audio.src}" and lip-syncs it)` });
      return;
    }
    if (!line) {
      diags.push({ level: "error", code: "voice-missing", path: `beats[${i}]`, message: `no voice for beat "${beat.id}"`, expected: `generated voice: run the tamtree harness or \`pnpm voice:say <skit>\`, then \`pnpm prep <skit>\`` });
      return;
    }
    if (line.text !== beat.line || (line.spoken ?? undefined) !== (beat.spoken ?? undefined)) {
      diags.push({ level: "error", code: "voice-stale", path: `beats[${i}].line`, message: `line changed since the voice was generated ("${line.text}")`, expected: `re-generate the voice for "${beat.id}", then \`pnpm prep <skit>\`` });
      return;
    }
    push(beat, path, "line", false, isPunch, { line });
    if (!isPunch || beat.reaction === false) return;
    const next = skit.beats[i + 1];
    if (next?.silent) return; // The skit already has its own reaction beat.
    const r = reactionFor(beat, i);
    if (!r) return;
    const others = skit.cast.map((c) => c.id).filter((id) => id !== beat.speaker && id !== r.reactor);
    const reactors = [r.reactor, ...others.slice(0, Math.max(0, style.reactors - 1))];
    const synthetic: Beat = { ...beat, id: `${beat.id}-reaction`, speaker: undefined, focus: undefined, line: undefined, silent: true, durationMs: style.reactionMs, pauseBeforeMs: 0, holdAfterMs: 0, shot: undefined, actions: [], sfx: [], text: [], figures: [], punchline: false };
    push(synthetic, path, "reaction", true, false, { reactor: r.reactor, reactors, reactionExpression: r.expression });
  });
  return { beats: out, totalMs: cursor + skit.timing.tailMs };
};

/** Resolve an anchor inside a laid beat to an absolute frame, recording a diagnostic on failure. */
export const anchorFrame = (
  b: LaidBeat,
  anchor: Anchor | undefined,
  path: string,
  fps: number,
  diags: Diagnostic[],
): number | undefined => {
  const r = resolveAnchor(anchor, b.ctx);
  if (!r.ok) {
    diags.push({ level: "error", code: "anchor", path, message: r.message, expected: r.expected, example: `"at": { "word": "${b.ctx.words[0]?.text ?? "fine"}" }  or  { "ms": 0 }` });
    return undefined;
  }
  return msToFrame(b.zeroMs + r.ms, fps);
};

export const msToFrame = (ms: number, fps: number): number => Math.round((ms / 1000) * fps);
