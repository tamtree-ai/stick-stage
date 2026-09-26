import type { Library } from "../rig/actorState";
import { docBeats, type SkitDoc } from "./schema";
import type { Program } from "./timeline";

/** Post-ready text for a skit: the caption file and subtitles that go up with the MP4. */

export const AI_VOICE_NOTE = "Voices are AI-generated (text-to-speech).";

export const slug = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "skit";

const tag = (h: string) => (h.startsWith("#") ? h : `#${h}`);

/** Caption text for the platform post: description, hashtags, disclosure, then the script. */
export const postText = (doc: SkitDoc, lib: Library): string => {
  const name = (castId: string) => {
    const c = doc.cast.find((x) => x.id === castId);
    return (c && lib.characters[c.character]?.displayName) ?? castId;
  };
  const script = docBeats(doc)
    .filter((b) => !b.silent && b.line && b.speaker)
    .map((b) => `${name(b.speaker!)}: ${b.line}`);
  const parts = [doc.meta.description ?? doc.meta.title];
  if (doc.meta.hashtags.length) parts.push(doc.meta.hashtags.map(tag).join(" "));
  if (doc.meta.syntheticVoices) parts.push(AI_VOICE_NOTE);
  return `${parts.join("\n\n")}\n\n---\nScript\n${script.join("\n")}\n`;
};

const srtTime = (ms: number) => {
  const t = Math.max(0, Math.round(ms));
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)},${p(t % 1000, 3)}`;
};

/** SubRip captions from the compiled pages (script text exactly, skit-absolute times). */
export const programSrt = (p: Program): string => {
  const cues = p.scenes.flatMap((sc) => {
    const offset = (sc.from / p.fps) * 1000;
    return sc.timeline.pages.map((pg) => ({ from: pg.startMs + offset, to: pg.endMs + offset, text: pg.text.trim() }));
  });
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join("\n");
};
