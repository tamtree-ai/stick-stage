import { describe, expect, it } from "vitest";
import { library } from "../src/data";
import { KOKORO_DEFAULT, KOKORO_NARRATOR, KOKORO_VOICES } from "../scripts/lib/kokoro-voices";
import { pcm16Wav } from "../scripts/lib/tts";
import { voiceFor } from "../scripts/lib/voice-tts";

/** Kokoro's own voice list, without loading the model (kokoro-js is optional). */
const kokoroVoices = async (): Promise<string[] | undefined> => {
  try {
    const { KokoroTTS } = await import("kokoro-js");
    return Object.keys(Object.getOwnPropertyDescriptor(KokoroTTS.prototype, "voices")!.get!.call({}));
  } catch {
    return undefined;
  }
};

describe("Kokoro voices for the CLI", () => {
  it("every house character has one, and every id is a Kokoro voice", async () => {
    expect(Object.keys(library.characters).filter((id) => !KOKORO_VOICES[id])).toEqual([]);
    const known = await kokoroVoices();
    if (!known) return;
    for (const id of [...Object.values(KOKORO_VOICES), KOKORO_NARRATOR, KOKORO_DEFAULT]) expect(known).toContain(id);
  });

  it("an override wins, then the cast map, then the default; narration has its own", () => {
    expect(voiceFor("milo", false)).toBe("am_puck");
    expect(voiceFor("milo", false, { milo: "am_echo" })).toBe("am_echo");
    expect(voiceFor("someone-new", false)).toBe(KOKORO_DEFAULT);
    expect(voiceFor("june", true)).toBe(KOKORO_NARRATOR);
  });

  it("writes 16-bit PCM mono WAV", () => {
    const wav = pcm16Wav(new Float32Array([0, 1, -1, 2]), 24000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt16LE(34)).toBe(16);
    expect([wav.readInt16LE(44), wav.readInt16LE(46), wav.readInt16LE(48), wav.readInt16LE(50)]).toEqual([0, 32767, -32767, 32767]);
  });
});
