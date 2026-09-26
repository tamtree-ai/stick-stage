/**
 * `POST /render` input: multipart with `skit` (skit.json), `voice` (voice.json, exactly the harness
 * contract in docs/voice-contract.md), optional `options` (JSON) and one file part per audio file,
 * named like the manifest's `audio` ("voice/b1.wav" → a part whose filename is "b1.wav").
 * Everything is checked here so a bad upload is a 4xx now, not a failed job later.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSkit, skitLines, SkitError, VoiceManifestSchema, type Diagnostic, type VoiceManifest } from "../engine/core";
import { HttpError } from "./http";
import type { JobOptions } from "./jobs";
import { unsupportedBeats } from "./validate";

const AUDIO_PATH = /^voice\/([A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}\.(wav|mp3|ogg))$/i;

/** Magic bytes, so a JSON error page saved as `b1.wav` fails at submit, not in ffmpeg. */
export const audioKind = (b: Uint8Array): "wav" | "mp3" | "ogg" | undefined => {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "wav";
  if (ascii(0, 4) === "OggS") return "ogg";
  if (ascii(0, 3) === "ID3" || (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0)) return "mp3";
  return undefined;
};

const invalid = (diagnostics: Diagnostic[]) => new HttpError(422, "invalid-render-request", "the render request has errors", { diagnostics });
const err = (code: string, p: string, message: string, expected?: string): Diagnostic => ({ level: "error", code, path: p, message, expected });

const jsonField = async (form: FormData, name: string, required: boolean): Promise<unknown> => {
  const v = form.get(name);
  if (v === null) {
    if (required) throw invalid([err("field-missing", name, `multipart field "${name}" is missing`)]);
    return undefined;
  }
  const text = typeof v === "string" ? v : await v.text();
  try {
    return JSON.parse(text);
  } catch {
    throw invalid([err("bad-json", name, `field "${name}" is not valid JSON`)]);
  }
};

export type Submission = { skit: unknown; voice: VoiceManifest; files: Map<string, Uint8Array>; options: JobOptions; warnings: string[] };

/** Parse and cross-check the parts. Throws 422 with diagnostics (compile's codes where they apply). */
export const parseSubmission = async (form: FormData): Promise<Submission> => {
  const skit = await jsonField(form, "skit", true);
  let doc;
  try {
    doc = parseSkit(skit);
  } catch (e) {
    if (e instanceof SkitError) throw invalid(e.diagnostics.map((d) => ({ ...d, path: `skit.${d.path}` })));
    throw e;
  }
  const unsupported = unsupportedBeats(doc);
  if (unsupported.length) throw invalid(unsupported);

  const voiceParse = VoiceManifestSchema.safeParse(await jsonField(form, "voice", true));
  if (!voiceParse.success) throw invalid(voiceParse.error.issues.map((i) => err("voice-invalid", `voice.${i.path.join(".")}`, i.message)));
  const voice = voiceParse.data;

  const rawOptions = ((await jsonField(form, "options", false)) ?? {}) as Record<string, unknown>;
  const options: JobOptions = { skipCheck: rawOptions.skipCheck === true, debug: rawOptions.debug === true, sheet: rawOptions.sheet === true };

  const uploads = new Map<string, File>();
  form.forEach((v) => typeof v !== "string" && v.name && uploads.set(v.name, v));

  const diags: Diagnostic[] = [];
  const warnings: string[] = [];
  const byId = new Map(voice.lines.map((l) => [l.id, l]));
  const needed = skitLines(doc);
  for (const l of needed) {
    const v = byId.get(l.id);
    if (!v) diags.push(err("voice-missing", `voice.lines`, `no voice line for beat "${l.id}"`, `{ "id": "${l.id}", "text": ${JSON.stringify(l.text)}, "audio": "voice/${l.id}.wav" }`));
    else if (v.text !== l.text) diags.push(err("voice-stale", `voice.lines[id=${l.id}].text`, `voice text ${JSON.stringify(v.text)} differs from the skit line`, JSON.stringify(l.text)));
  }
  const neededIds = new Set(needed.map((l) => l.id));
  for (const v of voice.lines) if (!neededIds.has(v.id)) warnings.push(`voice line "${v.id}" isn't a spoken beat of the skit; ignored`);

  const files = new Map<string, Uint8Array>();
  for (const [i, v] of voice.lines.entries()) {
    if (!neededIds.has(v.id)) continue;
    const m = AUDIO_PATH.exec(v.audio);
    if (!m) {
      diags.push(err("audio-path", `voice.lines[${i}].audio`, `"${v.audio}" isn't a plain file under voice/`, `"voice/${v.id}.wav" (letters, digits, - _ .; .wav, .mp3 or .ogg)`));
      continue;
    }
    const name = m[1]!;
    const f = uploads.get(name);
    if (!f) {
      diags.push(err("audio-missing", `voice.lines[${i}].audio`, `no uploaded file named "${name}"`, `a multipart file part with filename "${name}"`));
      continue;
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    const kind = audioKind(bytes);
    if (!kind) diags.push(err("audio-format", `voice.lines[${i}].audio`, `"${name}" isn't WAV, MP3 or OGG audio`));
    else files.set(name, bytes);
  }
  if (diags.length) throw invalid(diags);

  // Only the lines the skit speaks: prep must not trip over extras.
  return { skit, voice: { ...voice, lines: voice.lines.filter((l) => neededIds.has(l.id)) }, files, options, warnings };
};

/** Lay the submission out as a skit folder (skit.json, voice.json, voice/*). */
export const writeSubmission = (dir: string, s: Submission) => {
  fs.mkdirSync(path.join(dir, "voice"), { recursive: true });
  fs.writeFileSync(path.join(dir, "skit.json"), JSON.stringify(s.skit, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "voice.json"), JSON.stringify(s.voice, null, 2) + "\n");
  for (const [name, bytes] of s.files) fs.writeFileSync(path.join(dir, "voice", name), bytes);
};
