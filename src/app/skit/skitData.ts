import { staticFile, type CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import { compileSkit, formatDiagnostics, PreparedVoiceSchema, type PreparedVoice, type Program } from "../../engine";
import { library, reactions, sets, sfxLibrary } from "../../data";

export const skitCompositionSchema = z.object({
  /** Folder under `public/skits/`. */
  skit: z.string(),
  showLabels: z.boolean(),
  program: z.custom<Program>().optional(),
});
export type SkitCompositionProps = z.infer<typeof skitCompositionSchema>;

const fetchJson = async (file: string): Promise<unknown | undefined> => {
  const res = await fetch(staticFile(file));
  return res.ok ? res.json() : undefined;
};

/** Load skit.json + prepared voice (local files only), compile, and size the composition. */
export const calculateSkitMetadata: CalculateMetadataFunction<SkitCompositionProps> = async ({ props }) => {
  const skit = await fetchJson(`skits/${props.skit}/skit.json`);
  if (skit === undefined) throw new Error(`Missing public/skits/${props.skit}/skit.json`);
  const voiceJson = await fetchJson(`skits/${props.skit}/generated/voice.prepared.json`);
  const voice: PreparedVoice | undefined = voiceJson === undefined ? undefined : PreparedVoiceSchema.parse(voiceJson);
  const { program, warnings } = compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions });
  if (warnings.length) console.warn(formatDiagnostics(warnings));
  return {
    durationInFrames: program.durationInFrames,
    fps: program.fps,
    width: program.width,
    height: program.height,
    props: { ...props, program },
  };
};
