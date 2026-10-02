/**
 * Kokoro voices for the house cast, for `pnpm voice:tts` and `pnpm try`.
 *
 * Kept here rather than as `voice.kokoro` in the character JSON: the catalog version hashes the
 * whole character library, so a data-only field there would re-pin every client's catalog.
 * Picked to match each character's `say` voice (gender, age). t-shoot keeps its own map from the
 * Gemini voice names in workspace settings; tests/kokoro-voices.test.ts checks these ids exist.
 */
export const KOKORO_VOICES: Readonly<Record<string, string>> = {
  milo: "am_puck",
  june: "af_kore",
  dash: "af_jessica",
  lila: "af_bella",
  nell: "bf_emma",
  reed: "am_adam",
  pip: "af_sarah",
  moss: "bm_george",
  theo: "am_liam",
};
export const KOKORO_NARRATOR = "am_michael";
export const KOKORO_DEFAULT = "af_heart";
