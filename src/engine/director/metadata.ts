import type { CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import { formatDiagnostics } from "./diagnostics";
import { compileSkit, type SeriesStyle } from "./compile";
import type { ReactionTable, SfxManifest } from "./schema";
import type { Program } from "./timeline";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { SafeArea } from "../text/safeArea";
import { PreparedVoiceSchema } from "../voice/schema";

/** Props of the skit composition the consumer registers (`skit` = folder under their skits dir). */
export const skitCompositionSchema = z.object({
  skit: z.string(),
  showLabels: z.boolean(),
  program: z.custom<Program>().optional(),
  /** Render the scenes without a teaser or slam prefix, so a scene cache can share those frames. */
  omitHook: z.boolean().optional(),
  /** BCP 47 dub (`skit.i18n`) to compile. */
  lang: z.string().min(2).max(16).optional(),
});
export type SkitCompositionProps = z.infer<typeof skitCompositionSchema>;

export type StickStageContext = {
  /** Asset resolver: load a JSON file by path relative to the served root (`undefined` if missing). */
  load: (file: string) => Promise<unknown | undefined>;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  /** The platform safe area face shots keep faces inside. */
  safeArea?: SafeArea;
  /** Where skit folders are, relative to the served root. Default "skits". */
  skitsPath?: string;
  /** Series documents, so a skit can inherit style and cold open. */
  series?: Readonly<Record<string, SeriesStyle>>;
};

/**
 * `calculateMetadata` for the skit composition: loads `skit.json` + the prepared voice (local
 * files only), compiles, and sizes the composition from the program.
 */
export const calculateStickStageMetadata =
  (ctx: StickStageContext): CalculateMetadataFunction<SkitCompositionProps> =>
  async ({ props }) => {
    const base = `${ctx.skitsPath ?? "skits"}/${props.skit}`;
    const skit = await ctx.load(`${base}/skit.json`);
    if (skit === undefined) throw new Error(`Missing ${base}/skit.json`);
    const voiceJson = await ctx.load(`${base}/generated/voice.prepared.json`);
    const voice = voiceJson === undefined ? undefined : PreparedVoiceSchema.parse(voiceJson);
    const compiled = compileSkit({ skit, voice, lib: ctx.lib, sets: ctx.sets, sfx: ctx.sfx, reactions: ctx.reactions, safeArea: ctx.safeArea, series: ctx.series, lang: props.lang });
    if (compiled.warnings.length) console.warn(formatDiagnostics(compiled.warnings));
    const hook = compiled.program.hook;
    const program = props.omitHook && hook ? { ...compiled.program, hook: undefined, durationInFrames: compiled.program.durationInFrames - hook.prefixFrames + hook.transitionFrames } : compiled.program;
    return { durationInFrames: program.durationInFrames, fps: program.fps, width: program.width, height: program.height, props: { ...props, program } };
  };
