import { z } from "zod";
import { SYMBOLS } from "../face/schema";
import type { Aspect } from "../format/aspect";
import { ScreenTextSchema, SignTextSchema } from "../lib/screenText";
import { CharacterSchema } from "../rig/schema";
import { PartLabelSchema } from "../set/schema";
import { FRAMINGS } from "../shots/framing";
import { I18nSchema } from "../i18n/pack";
import { MetaSchema } from "./meta";
import { STYLE_IDS } from "./style";

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
  z.strictObject({ do: z.literal("hold"), who, prop: z.string().min(1), hand, at, text: SignTextSchema.optional(), screen: ScreenTextSchema.optional() }),
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
  /** A stiff fall onto the ground (the faint). */
  z.strictObject({ do: z.literal("fall"), who, at }),
  /** A named gag. The compiler expands it into actions, a camera and SFX. */
  z.strictObject({ do: z.literal("gag"), who, gag: z.string().min(1), at, side: z.enum(["left", "right"]).optional() }),
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
export type SfxCue = z.infer<typeof SfxCueSchema>;
export const MAX_LIST_ITEMS = 5;
export const TextCueSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("slam"),
    value: z.string().min(1).max(40),
    at,
    durationMs: z.number().min(200).max(5000).default(1100),
  }),
  /** Items stack in the upper-middle band; each pops in on its anchor and stays until the next cut. */
  z
    .strictObject({
      type: z.literal("list"),
      items: z.array(z.string().min(1).max(40)).min(1).max(MAX_LIST_ITEMS),
      /** One anchor per item. */
      at: z.array(AnchorSchema).min(1).max(MAX_LIST_ITEMS),
    })
    .refine((t) => t.items.length === t.at.length, { message: `"at" needs one anchor per item`, path: ["at"] }),
]);
export type TextCue = z.infer<typeof TextCueSchema>;

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
  /**
   * Narrator beats: the cast member the voice-over is about. They get the punchline punch-in
   * and the reaction beat; without `focus` the camera holds the scene's shot.
   */
  focus: z.string().min(1).optional(),
  /** A thought: this cast member's voice, mouth shut, italic caption. Not the off-screen narrator. */
  voiceOver: z.boolean().optional(),
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
  holding: z.strictObject({ prop: z.string().min(1), hand, text: SignTextSchema.optional(), screen: ScreenTextSchema.optional() }).optional(),
  /** Name tag above the head in group shots ("me", "my brain", "reporter"). */
  label: z.string().min(1).max(24).optional(),
});
export type CastMember = z.infer<typeof CastSchema>;

export const TRANSITIONS = ["cut", "fade", "slide", "wipe", "clock-wipe"] as const;
export const TransitionSchema = z.strictObject({
  type: z.enum(TRANSITIONS).default("fade"),
  /** Ignored for "cut". */
  durationMs: z.number().min(100).max(2000).default(400),
});
export type Transition = z.infer<typeof TransitionSchema>;

/**
 * Title card: an optional small kicker line, then the title stacked in big words. The kicker
 * shows from the scene start; the title pops in on `at` (in the beat `beat`, default the scene's
 * first beat). One anchor per title line reveals the lines one by one; `\n` forces a break.
 */
export const CardSchema = z.strictObject({
  kicker: z.string().min(1).max(60).optional(),
  title: z.string().min(1).max(60),
  beat: z.string().min(1).optional(),
  at: z.union([AnchorSchema, z.array(AnchorSchema).min(1).max(3)]).optional(),
});
export type Card = z.infer<typeof CardSchema>;

/** The off-screen voice: beats whose `speaker` is the narrator's `id` are voice-over. */
export const NarratorSchema = z.strictObject({
  id: z.string().min(1).default("narrator"),
  /** Hints for the harness TTS, like a character's `voice`; `say` is the macOS dev voice. */
  voice: z
    .strictObject({
      provider: z.string().optional(),
      voiceId: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).default({}),
      say: z.string().optional(),
    })
    .optional(),
  /** How narrator subtitles differ from dialog. */
  captionStyle: z.enum(["italic", "boxed"]).default("italic"),
  /** Name in the post text and `.srt`. */
  name: z.string().min(1).max(24).default("Narrator"),
});
export type Narrator = z.infer<typeof NarratorSchema>;

/** A cast member's placement in one scene (omitted fields come from the skit's `cast`). */
export const SceneCastSchema = z.strictObject({
  id: z.string().min(1),
  mark: z.string().min(1).optional(),
  facing: z.enum(["left", "right"]).optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  seated: z.boolean().optional(),
  holding: z.strictObject({ prop: z.string().min(1), hand, text: SignTextSchema.optional(), screen: ScreenTextSchema.optional() }).optional(),
  label: z.string().min(1).max(24).optional(),
});

export const SceneSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "letters, digits, - and _ only"),
  /** Default: the skit's `set`. */
  set: z.string().min(1).optional(),
  /** Who is in this scene and where. Default: the whole cast at their skit marks (none on a card scene). `[]`: nobody (narrator-only). */
  cast: z.array(SceneCastSchema).optional(),
  /** How this scene comes in (ignored on the first scene). Default: a 400 ms fade. */
  // eslint-disable-next-line @remotion/non-pure-animation -- a skit field, not a CSS transition
  transition: TransitionSchema.optional(),
  /** POV card for this scene. Default: the skit's `overlay.pov` on the first scene only. */
  pov: z.string().max(80).optional(),
  /** A full-frame title card over the set, timed by the scene's (narrator) beats. */
  card: CardSchema.optional(),
  /** Words on a set part for this scene only. The shared set is unchanged. */
  labels: z.array(PartLabelSchema).max(6).optional(),
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

/** Title, frame and post text. Defined in `meta.ts` so this file stays under the line cap. */
export { MetaSchema } from "./meta";

/** The skit document (`skit.json`): one scene (`set` + `beats`) or several (`scenes`). */
export const SkitSchema = z
  .strictObject({
    /** Editor hint (JSON Schema path); ignored. */
    $schema: z.string().optional(),
    schemaVersion: z.literal(2),
    meta: MetaSchema,
    /** The set (single-scene skits), or the default set for scenes. */
    set: z.string().min(1).optional(),
    cast: z.array(CastSchema).min(1).max(4),
    /** Off-screen voice-over (optional). */
    narrator: NarratorSchema.optional(),
    overlay: z
      .strictObject({ pov: z.string().max(80).optional(), subtitles: z.boolean().default(true) })
      .default({ subtitles: true }),
    timing: TimingSchema,
    /** Words on a set part. Single-scene skits only; a multi-scene skit puts `labels` on each scene. */
    labels: z.array(PartLabelSchema).max(6).optional(),
    /** One bed from the music manifest. Ducked under dialog; silent on the punchline. */
    music: z.string().min(1).optional(),
    /** Head beats and one gesture per line. Omitted means on. */
    speechMotion: z.enum(["auto", "off"]).optional(),
    /** How the director cuts. Omitted: the series style, else classic. */
    style: z.enum(STYLE_IDS).optional(),
    /** Opening. Omitted: the series `coldOpen`, else the POV card when the skit has one. */
    coldOpen: z.enum(["pov", "none", "teaser"]).optional(),
    /**
     * Workspace characters. Resolved before the catalog, so the catalog hash does not change.
     * Not shipped in `src/data/`.
     */
    characters: z.array(CharacterSchema).max(4).optional(),
    /** Dubbed words, keyed by BCP 47. Staging stays; timing follows the new voice. */
    i18n: I18nSchema.optional(),
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
    if (d.narrator && d.cast.some((c) => c.id === d.narrator!.id))
      ctx.addIssue({ code: "custom", path: ["narrator", "id"], message: `the narrator's id "${d.narrator.id}" is also a cast id; rename one` });
  });
type SkitParsed = z.infer<typeof SkitSchema>;
/** A parsed skit. `meta.aspect`, `width` and `height` are filled in by `parseSkit`. */
export type SkitDoc = Omit<SkitParsed, "meta"> & {
  meta: Omit<SkitParsed["meta"], "aspect" | "width" | "height"> & { aspect: Aspect; width: number; height: number };
};
export type SkitInput = z.input<typeof SkitSchema>;

/** One resolved scene, as the director compiles it (a single-scene skit is exactly this). */
export type Skit = Omit<SkitDoc, "set" | "beats" | "scenes"> & { set: string; beats: Beat[]; card?: Card };

/** Is this beat a voice-over (spoken by the skit's narrator)? */
export const isNarration = (skit: Pick<SkitDoc, "narrator">, b: Pick<Beat, "speaker">): boolean => !!skit.narrator && b.speaker === skit.narrator.id;

/** Every beat of a skit document, across scenes. */
export const docBeats = (d: SkitDoc): Beat[] => d.beats ?? d.scenes!.flatMap((s) => s.beats);

export { ReactionTableSchema, SfxManifestSchema, type ReactionTable, type SfxManifest } from "./librarySchemas";
