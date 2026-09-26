import type { CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import { formatDiagnostics } from "./diagnostics";
import { compileSkit } from "./compile";
import type { ReactionTable, SfxManifest } from "./schema";
import type { Program } from "./timeline";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { PreparedVoiceSchema } from "../voice/schema";

/** Props of the skit composition the consumer registers (`skit` = folder under their skits dir). */
export const skitCompositionSchema = z.object({
  skit: z.string(),
  showLabels: z.boolean(),
  program: z.custom<Program>().optional(),
});
export type SkitCompositionProps = z.infer<typeof skitCompositionSchema>;

export type StickStageContext = {
  /** Asset resolver: load a JSON file by path relative to the served root (`undefined` if missing). */
  load: (file: string) => Promise<unknown | undefined>;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  /** Where skit folders are, relative to the served root. Default "skits". */
  skitsPath?: string;
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
    const { program, warnings } = compileSkit({ skit, voice, lib: ctx.lib, sets: ctx.sets, sfx: ctx.sfx, reactions: ctx.reactions });
    if (warnings.length) console.warn(formatDiagnostics(warnings));
    return { durationInFrames: program.durationInFrames, fps: program.fps, width: program.width, height: program.height, props: { ...props, program } };
  };
