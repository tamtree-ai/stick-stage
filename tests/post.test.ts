import { describe, expect, it } from "vitest";
import { library } from "../src/data";
import { AI_VOICE_NOTE, parseSkit, postText, programSrt, slug } from "../src/engine";
import { compile, skitOf } from "./director-fixtures";

describe("post text", () => {
  const beats = [
    { id: "a", speaker: "milo", line: "Hey. You okay?" },
    { id: "b", speaker: "june", line: "I'm fine." },
  ];
  it("caption: description, hashtags, AI-voice note, script with display names", () => {
    const { skit } = skitOf(beats, { meta: { title: "Fine", description: "When they're fine.", hashtags: ["relatable", "#skit"] } });
    const text = postText(parseSkit(skit), library);
    expect(text).toContain("When they're fine.\n\n#relatable #skit\n\n" + AI_VOICE_NOTE);
    expect(text).toContain("Milo: Hey. You okay?\nJune: I'm fine.");
  });
  it("no disclosure line when the voices aren't synthetic; title when no description", () => {
    const { skit } = skitOf(beats, { meta: { title: "Fine", syntheticVoices: false } });
    const text = postText(parseSkit(skit), library);
    expect(text.startsWith("Fine\n")).toBe(true);
    expect(text).not.toContain(AI_VOICE_NOTE);
  });
  it("SRT cues carry the script words with increasing times", () => {
    const srt = programSrt(compile(beats).program);
    expect(srt.startsWith("1\n00:00:00,")).toBe(true);
    expect(srt).toContain("okay?");
    expect(srt).toContain(" --> ");
  });
  it("slugs", () => {
    expect(slug("Not being sarcastic!")).toBe("not-being-sarcastic");
    expect(slug("Café  déjà vu")).toBe("cafe-deja-vu");
  });
});
