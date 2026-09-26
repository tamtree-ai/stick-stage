import { z } from "zod";
import { SYMBOLS } from "../face/schema";
import { FRAMINGS } from "../shots/framing";

/**
 * Skit document (`public/skits/<id>/skit.json`). Library ids (poses, expressions, props, sets,
 * characters, sfx) are checked by the compiler, which knows the library; this schema checks shape.
 */

/** A moment inside a beat. Word anchors match the script text, tokenized like the TTS timings. */
export const AnchorSchema = z.union([
  z.strictObject({ word: z.string().min(1), occurrence: z.number().int().min(1).default(1) }),
  z.strictObject({ ms: z.number() }),
  z.strictObject({ fraction: z.number().min(0).max(1) }),
]);
export type Anchor = z.infer<typeof AnchorSchema>;

const who = z.string().min(1);
const at = AnchorSchema.optional();
const hand = z.enum(["L", "R"]).default("R");

/** Gaze target: a cast member, the camera, or a point (fractions of the frame). */
export const LookTargetSchema = z.union([z.string().min(1), z.strictObject({ x: z.number(), y: z.number() })]);

export const ActionSchema = z.discriminatedUnion("do", [
  z.strictObject({ do: z.literal("pose"), who, pose: z.string().min(1), at, durationFrames: z.number().int().min(1).max(30).optional() }),
  z.strictObject({ do: z.literal("expression"), who, expression: z.string().min(1), at }),
  z.strictObject({ do: z.literal("look"), who, to: LookTargetSchema, at }),
  z.strictObject({ do: z.literal("turn"), who, facing: z.enum(["left", "right"]).optional(), at }),
  z.strictObject({ do: z.literal("hop"), who, at, height: z.number().min(0.02).max(0.4).optional() }),
  z.strictObject({ do: z.literal("nod"), who, at }),
  z.strictObject({ do: z.literal("slideTo"), who, mark: z.string().min(1), at, durationFrames: z.number().int().min(3).max(30).optional() }),
  z.strictObject({ do: z.literal("hold"), who, prop: z.string().min(1), hand, at }),
  z.strictObject({ do: z.literal("putAway"), who, hand, at }),
  z.strictObject({ do: z.literal("drop"), who, hand, at }),
  z.strictObject({ do: z.literal("symbol"), who, symbol: z.enum(SYMBOLS), at, durationMs: z.number().min(100).max(10000).optional() }),
  z.strictObject({ do: z.literal("sit"), who, at }),
  z.strictObject({ do: z.literal("stand"), who, at }),
  /** Walk (or run) to a mark; `off-left` / `off-right` are entrances and exits. Faces the others on arrival. */
  z.strictObject({ do: z.literal("walkTo"), who, mark: z.string().min(1), at, speed: z.enum(["walk", "run"]).default("walk"), facing: z.enum(["left", "right"]).optional() }),
  /** Both step together and slap hands on the anchor. */
  z.strictObject({ do: z.literal("highFive"), who, with: z.string().min(1), at }),
  /** Step in and shove `target` on the anchor; they stagger back `distance` (fraction of frame width). */
  z.strictObject({ do: z.literal("shove"), who, target: z.string().min(1), at, distance: z.number().min(0.03).max(0.4).default(0.14) }),
]);
export type Action = z.infer<typeof ActionSchema>;
export const ACTION_KINDS = ActionSchema.options.map((o) => o.shape.do.value);

export const ShotSchema = z.strictObject({
  framing: z.enum(FRAMINGS),
  /** Cast member for face framings (`medium`, `close`, `extreme`). */
  on: z.string().optional(),
  /** Accepted for readability: a framing change is always a hard cut. */
  cut: z.boolean().optional(),
  /** When in the beat the cut happens (default: beat start). */
  at,
  /** 4–6 frame spring zoom toward a cast member's face. */
  punchIn: z.strictObject({ on: z.string().min(1), at }).optional(),
  shake: z.strictObject({ at, durationMs: z.number().min(50).max(3000).default(400), intensity: z.number().min(0).max(1).default(0.5) }).optional(),
});
export type Shot = z.infer<typeof ShotSchema>;

export const SfxCueSchema = z.strictObject({ id: z.string().min(1), at, volume: z.number().min(0).max(2).default(1) });
export const TextCueSchema = z.strictObject({
  type: z.literal("slam"),
  value: z.string().min(1).max(40),
  at,
  durationMs: z.number().min(200).max(5000).default(1100),
});

export const AudioSourceSchema = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("tts") }),
  /**
   * Lip-sync to existing audio (e.g. a trending sound): `src` is relative to the skit folder,
   * trimmed to `startMs`–`endMs`. Consecutive beats cut from one file keep the file's own timing.
   * `words` are optional word start times in the source file's ms (else Whisper, else estimated).
   */
  z.strictObject({
    source: z.literal("file"),
    src: z.string().min(1),
    startMs: z.number().min(0).optional(),
    endMs: z.number().min(0).optional(),
    words: z.array(z.strictObject({ text: z.string().min(1), startMs: z.number().min(0), endMs: z.number().min(0).optional() })).optional(),
  }),
]);

export const BeatSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "letters, digits, - and _ only (it names the voice file)"),
  speaker: z.string().optional(),
  line: z.string().min(1).optional(),
  /** A beat with no dialog: reactions, comedic pauses. Needs `durationMs` (default 900). */
  silent: z.boolean().default(false),
  durationMs: z.number().min(100).max(10000).optional(),
  /** Speaker's expression for this line (lands just before the line starts). */
  expression: z.string().optional(),
  /** Marks the punchline. Default: the last spoken beat. */
  punchline: z.boolean().optional(),
  /** Silence before the line; replaces the skit's default gap. */
  pauseBeforeMs: z.number().min(0).max(5000).optional(),
  /** Silence after the line. */
  holdAfterMs: z.number().min(0).max(5000).optional(),
  audio: AudioSourceSchema.default({ source: "tts" }),
  /** Free-form delivery hint for the TTS in the harness (e.g. "whispered", "flat"). */
  delivery: z.string().optional(),
  /** Listeners' reaction expression on the last word, or `false` for none. Default from `reactions.json`. */
  reaction: z.union([z.string().min(1), z.literal(false)]).optional(),
  /** Optional: the default shot policy frames the beat when omitted. */
  shot: ShotSchema.optional(),
  actions: z.array(ActionSchema).default([]),
  sfx: z.array(SfxCueSchema).default([]),
  text: z.array(TextCueSchema).default([]),
});
export type Beat = z.infer<typeof BeatSchema>;

export const CastSchema = z.strictObject({
  id: z.string().min(1),
  character: z.string().min(1),
  mark: z.string().min(1),
  /** Default: facing the center of the frame. */
  facing: z.enum(["left", "right"]).optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  /** Start seated on the seat at this mark. */
  seated: z.boolean().default(false),
  holding: z.strictObject({ prop: z.string().min(1), hand }).optional(),
});
export type CastMember = z.infer<typeof CastSchema>;

export const TRANSITIONS = ["cut", "fade", "slide", "wipe", "clock-wipe"] as const;
export const TransitionSchema = z.strictObject({
  type: z.enum(TRANSITIONS).default("fade"),
  /** Ignored for "cut". */
  durationMs: z.number().min(100).max(2000).default(400),
});
export type Transition = z.infer<typeof TransitionSchema>;

/** A cast member's placement in one scene (omitted fields come from the skit's `cast`). */
export const SceneCastSchema = z.strictObject({
  id: z.string().min(1),
  mark: z.string().min(1).optional(),
  facing: z.enum(["left", "right"]).optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  seated: z.boolean().optional(),
  holding: z.strictObject({ prop: z.string().min(1), hand }).optional(),
});

export const SceneSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "letters, digits, - and _ only"),
  /** Default: the skit's `set`. */
  set: z.string().min(1).optional(),
  /** Who is in this scene and where. Default: the whole cast at their skit marks. */
  cast: z.array(SceneCastSchema).min(1).optional(),
  /** How this scene comes in (ignored on the first scene). Default: a 400 ms fade. */
  // eslint-disable-next-line @remotion/non-pure-animation -- a skit field, not a CSS transition
  transition: TransitionSchema.optional(),
  /** POV card for this scene. Default: the skit's `overlay.pov` on the first scene only. */
  pov: z.string().max(80).optional(),
  beats: z.array(BeatSchema).min(1),
});
export type Scene = z.infer<typeof SceneSchema>;

const TimingSchema = z
  .strictObject({
    /** Before the first beat. Short: the hook plays within the first second. */
    leadInMs: z.number().min(0).max(3000).default(300),
    /** Default silence between beats (a beat's `pauseBeforeMs` replaces it). */
    gapMs: z.number().min(0).max(3000).default(250),
    /** After the last beat. */
    tailMs: z.number().min(0).max(5000).default(700),
  })
  .default({ leadInMs: 300, gapMs: 250, tailMs: 700 });

export const MetaSchema = z.strictObject({
  title: z.string().min(1),
  fps: z.number().int().min(12).max(60).default(30),
  width: z.number().int().min(360).default(1080),
  height: z.number().int().min(360).default(1920),
  /** Post caption (batch render writes it to `<name>.txt`). Default: the title. */
  description: z.string().max(2000).optional(),
  hashtags: z.array(z.string().regex(/^#?[\p{L}\p{N}_]+$/u, "one word, no spaces")).default([]),
  /** Synthetic (TTS) voices: add the AI-voice disclosure line to the post text. */
  syntheticVoices: z.boolean().default(true),
});

/** The skit document (`skit.json`): one scene (`set` + `beats`) or several (`scenes`). */
export const SkitSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    meta: MetaSchema,
    /** The set (single-scene skits), or the default set for scenes. */
    set: z.string().min(1).optional(),
    cast: z.array(CastSchema).min(1).max(4),
    overlay: z
      .strictObject({ pov: z.string().max(80).optional(), subtitles: z.boolean().default(true) })
      .default({ subtitles: true }),
    timing: TimingSchema,
    beats: z.array(BeatSchema).min(1).optional(),
    scenes: z.array(SceneSchema).min(1).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.beats && d.scenes) ctx.addIssue({ code: "custom", path: ["scenes"], message: `use either "beats" (one scene) or "scenes", not both` });
    if (!d.beats && !d.scenes) ctx.addIssue({ code: "custom", path: ["beats"], message: `a skit needs "beats" (or "scenes")` });
    if (!d.set && !d.scenes) ctx.addIssue({ code: "custom", path: ["set"], message: `a skit needs a "set"` });
    d.scenes?.forEach((sc, i) => {
      if (!sc.set && !d.set) ctx.addIssue({ code: "custom", path: ["scenes", i, "set"], message: `scene "${sc.id}" needs a "set" (or give the skit one)` });
    });
  });
export type SkitDoc = z.infer<typeof SkitSchema>;
export type SkitInput = z.input<typeof SkitSchema>;

/** One resolved scene, as the director compiles it (a single-scene skit is exactly this). */
export type Skit = Omit<SkitDoc, "set" | "beats" | "scenes"> & { set: string; beats: Beat[] };

/** Every beat of a skit document, across scenes. */
export const docBeats = (d: SkitDoc): Beat[] => d.beats ?? d.scenes!.flatMap((s) => s.beats);

/** Listener reaction defaults (`src/data/reactions.json`): speaker expression → listener expression. */
export const ReactionTableSchema = z.object({
  schemaVersion: z.literal(1),
  /** Listener's expression on the speaker's last word, for ordinary lines. */
  listen: z.record(z.string(), z.string()),
  defaultListen: z.string(),
  /** Listener's expression in the reaction close-up after the punchline. */
  punchline: z.record(z.string(), z.string()),
  defaultPunchline: z.string(),
});
export type ReactionTable = z.infer<typeof ReactionTableSchema>;

/** SFX library manifest (`src/data/sfx.json`). Every file records its license. */
export const SfxManifestSchema = z.object({
  schemaVersion: z.literal(1),
  sounds: z.array(
    z.object({
      id: z.string(),
      /** Relative to `public/`. */
      file: z.string(),
      durationMs: z.number().positive(),
      /** Playback gain so stings sit under dialog. */
      gain: z.number().min(0).max(2).default(0.8),
      license: z.string().min(1),
      source: z.string().min(1),
      tags: z.array(z.string()).default([]),
    }),
  ),
});
export type SfxManifest = z.infer<typeof SfxManifestSchema>;
