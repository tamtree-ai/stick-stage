import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { sfxLibrary } from "../../data";
import { TEXT_FONT } from "../fonts";

const GAP = 12;
const FPS = 30;
const slots = (() => {
  let at = 15;
  return sfxLibrary.sounds.map((s) => {
    const frames = Math.ceil((s.durationMs / 1000) * FPS) + GAP;
    const slot = { ...s, from: at, frames };
    at += frames;
    return slot;
  });
})();
export const SFX_LAB_FRAMES = (slots[slots.length - 1]?.from ?? 0) + (slots[slots.length - 1]?.frames ?? 30) + 15;

/** Plays every sound in the SFX library once, at its manifest gain, with its name and license. */
export const SfxLab: React.FC = () => {
  const frame = useCurrentFrame();
  const now = slots.find((s) => frame >= s.from && frame < s.from + s.frames);
  return (
    <AbsoluteFill style={{ background: "#f3efe6", fontFamily: TEXT_FONT, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      {slots.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames} layout="none">
          <Html5Audio src={staticFile(s.file)} volume={() => s.gain} />
        </Sequence>
      ))}
      <div style={{ fontSize: 110, fontWeight: 800, color: "#1b1b1f" }}>{now?.id ?? "SFX library"}</div>
      <div style={{ fontSize: 34, color: "#555", marginTop: 20 }}>{now ? `${now.tags.join(" · ")}  ·  gain ${now.gain}` : `${slots.length} sounds`}</div>
      <div style={{ fontSize: 26, color: "#777", marginTop: 12, maxWidth: 900 }}>{now ? `${now.license} · ${now.source}` : ""}</div>
    </AbsoluteFill>
  );
};
