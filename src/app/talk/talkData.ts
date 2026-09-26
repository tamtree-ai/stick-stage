import { staticFile, type CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import {
  buildCaptionPages,
  FRAMINGS,
  normWord,
  PreparedVoiceSchema,
  type CaptionPage,
  type ExpressionKey,
  type Framing,
  type PoseKey,
  type PreparedLine,
  type SpeechClip,
} from "../../engine";

/** Lab script (`public/skits/<id>/script.json`): lines plus per-line acting for TalkLab. */
export const TalkScriptSchema = z.object({
  schemaVersion: z.literal(1),
  set: z.string(),
  pov: z.string().optional(),
  lines: z.array(
    z.object({
      id: z.string(),
      speaker: z.string(),
      text: z.string(),
      expression: z.string(),
      pose: z.string().optional(),
      /** Word the pose lands on. */
      poseAt: z.string().optional(),
      shot: z.enum(FRAMINGS).default("two"),
      slam: z.object({ value: z.string(), at: z.string() }).optional(),
    }),
  ),
});
export type TalkScript = z.infer<typeof TalkScriptSchema>;

export type TalkTimeline = {
  durationInFrames: number;
  set: string;
  pov?: string;
  lines: { line: PreparedLine; from: number; to: number; expression: string; shot: Framing }[];
  poseKeys: PoseKey[];
  expressionKeys: ExpressionKey[];
  speech: SpeechClip[];
  pages: CaptionPage[];
  slams: { text: string; from: number; to: number }[];
};

const LEAD_MS = 600;
const GAP_MS = 450;
const TAIL_MS = 1200;
/** Poses start this many frames before their word, so the 4-frame move lands on it. */
const POSE_LEAD = 2;
/** Expressions land just before the line starts. */
const EXPR_LEAD = 3;
const SLAM_HOLD_MS = 1100;

/** Anchor word → line ms. An exact token ("Forty!") wins over a normalized match ("forty"). */
const wordAt = (line: PreparedLine, word: string): number => {
  const w = line.words.find((x) => x.text === word) ?? line.words.find((x) => normWord(x.text) === normWord(word));
  if (!w) throw new Error(`Line "${line.id}": anchor word "${word}" not in "${line.text}"`);
  return w.startMs;
};

/** Lay lines end to end with a gap, and resolve word anchors to frames. */
export const buildTalkTimeline = (script: TalkScript, prepared: PreparedLine[], fps: number): TalkTimeline => {
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const byId = new Map(prepared.map((l) => [l.id, l]));
  let at = LEAD_MS;
  const poseKeys: PoseKey[] = [{ frame: 0, pose: "idle" }];
  const expressionKeys: ExpressionKey[] = [{ frame: 0, expression: "neutral" }];
  const slams: TalkTimeline["slams"] = [];
  const lines = script.lines.map((s) => {
    const line = byId.get(s.id);
    if (!line) throw new Error(`Line "${s.id}" has no prepared voice. Run: pnpm voice:say <skit> && pnpm prep <skit>`);
    if (line.text !== s.text) throw new Error(`Line "${s.id}": script text changed since prep. Re-run voice + prep.`);
    const from = f(at);
    expressionKeys.push({ frame: Math.max(1, from - EXPR_LEAD), expression: s.expression });
    if (s.pose) poseKeys.push({ frame: Math.max(1, f(at + (s.poseAt ? wordAt(line, s.poseAt) : 0)) - POSE_LEAD), pose: s.pose });
    if (s.slam) {
      const hit = f(at + wordAt(line, s.slam.at));
      slams.push({ text: s.slam.value, from: hit, to: hit + f(SLAM_HOLD_MS) });
    }
    const entry = { line, from, to: f(at + line.durationMs), expression: s.expression, shot: s.shot };
    at += line.durationMs + GAP_MS;
    return entry;
  });
  const end = at - GAP_MS + TAIL_MS;
  poseKeys.push({ frame: f(end - TAIL_MS * 0.6), pose: "idle" });
  return {
    durationInFrames: f(end),
    set: script.set,
    pov: script.pov,
    lines,
    poseKeys,
    expressionKeys,
    speech: lines.map((l) => ({ startFrame: l.from, cues: l.line.mouthCues })),
    pages: buildCaptionPages(lines.map((l) => ({ startMs: (l.from / fps) * 1000, words: l.line.words }))),
    slams,
  };
};

export const talkLabSchema = z.object({
  skit: z.string(),
  character: z.string(),
  showLabels: z.boolean(),
  timeline: z.custom<TalkTimeline>().optional(),
});
export type TalkLabProps = z.infer<typeof talkLabSchema>;

const fetchJson = async (file: string): Promise<unknown> => {
  const res = await fetch(staticFile(file));
  if (!res.ok) throw new Error(`Missing ${file} (${res.status}). Run: pnpm voice:say <skit> && pnpm prep <skit>`);
  return res.json();
};

/** Loads the lab script and prepared voice (local files only) and sizes the composition. */
export const calculateTalkLabMetadata: CalculateMetadataFunction<TalkLabProps> = async ({ props }) => {
  const fps = 30;
  const script = TalkScriptSchema.parse(await fetchJson(`skits/${props.skit}/script.json`));
  const prepared = PreparedVoiceSchema.parse(await fetchJson(`skits/${props.skit}/generated/voice.prepared.json`));
  const timeline = buildTalkTimeline(script, prepared.lines, fps);
  return { durationInFrames: timeline.durationInFrames, fps, props: { ...props, timeline } };
};
