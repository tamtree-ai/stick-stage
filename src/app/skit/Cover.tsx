import React from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { library, safeArea, sets } from "../../data";
import { Skit, WIDE_SAFE_AREA } from "../../engine";
import { fontFor } from "../../engine/text/fonts";
import { SLAM } from "../../engine/text/layout";
import { TEXT_FONT } from "../fonts";
import type { SkitCompositionProps } from "./skitData";

const familyOf = (language: string | undefined): string => {
  const choice = fontFor(language);
  return choice.family === "Montserrat" ? TEXT_FONT : choice.family;
};

/** Punchline reaction, title in slam type, optional episode badge. `thumb` fits that still into 16:9. */
export const CoverStill: React.FC<SkitCompositionProps & { thumb?: boolean }> = ({ program, showLabels, thumb }) => {
  if (!program) throw new Error("Cover: program missing (calculateMetadata did not run)");
  const cover = program.cover ?? { scene: 0, frame: 0, title: program.title };
  const scene = program.scenes[cover.scene] ?? program.scenes[0];
  if (!scene) throw new Error("Cover: the program has no scenes");
  const fontFamily = familyOf(scene.timeline.language);
  const area = program.width > program.height ? WIDE_SAFE_AREA : safeArea;
  const picture = (
    <Freeze frame={cover.frame}>
      <Skit timeline={scene.timeline} set={sets[scene.timeline.set]!} lib={library} safeArea={area} fontFamily={fontFamily} showLabels={showLabels} audio={false} />
    </Freeze>
  );
  const title = (
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        bottom: "12%",
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: 88,
        lineHeight: 0.95,
        color: SLAM.fill,
        WebkitTextStroke: `8px ${SLAM.outline}`,
        paintOrder: "stroke fill",
      }}
    >
      {cover.badge ? <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "0.04em", marginBottom: 12 }}>{cover.badge}</div> : null}
      {cover.title}
    </div>
  );
  const frame = (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      {picture}
      {title}
    </AbsoluteFill>
  );
  if (!thumb) return frame;
  const thumbW = 1280;
  const thumbH = 720;
  const scale = Math.min(thumbW / program.width, thumbH / program.height);
  const dw = program.width * scale;
  const dh = program.height * scale;
  return (
    <AbsoluteFill style={{ background: "#111114" }}>
      <div style={{ position: "absolute", left: (thumbW - dw) / 2, top: (thumbH - dh) / 2, width: program.width, height: program.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {frame}
      </div>
    </AbsoluteFill>
  );
};

export const ThumbnailStill: React.FC<SkitCompositionProps> = (props) => <CoverStill {...props} thumb />;
