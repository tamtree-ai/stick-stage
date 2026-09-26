import React from "react";
import { AbsoluteFill, Img, type CalculateMetadataFunction } from "remotion";
import { z } from "zod";

export const contactSheetSchema = z.object({
  title: z.string(),
  tiles: z.array(z.object({ src: z.string(), frame: z.number() })),
  cols: z.number(),
  tileWidth: z.number(),
  tileHeight: z.number(),
});
type Props = z.infer<typeof contactSheetSchema>;

const HEADER = 56;
const GAP = 6;

export const calculateContactSheetMetadata: CalculateMetadataFunction<Props> = ({ props }) => {
  const rows = Math.max(1, Math.ceil(props.tiles.length / props.cols));
  return {
    width: Math.ceil((props.cols * (props.tileWidth + GAP) + GAP) / 2) * 2,
    height: Math.ceil((HEADER + rows * (props.tileHeight + GAP) + GAP) / 2) * 2,
  };
};

/** Tiles pre-rendered frames (passed as data URLs by scripts/sheet.ts) into one image. */
export const ContactSheet: React.FC<Props> = ({ title, tiles, cols, tileWidth, tileHeight }) => (
  <AbsoluteFill style={{ background: "#222", fontFamily: "Menlo, monospace" }}>
    <div style={{ height: HEADER, color: "#fff", fontSize: 26, padding: "12px 12px", fontWeight: 700 }}>{title}</div>
    {tiles.map((t, i) => (
      <div
        key={t.frame}
        style={{
          position: "absolute",
          left: GAP + (i % cols) * (tileWidth + GAP),
          top: HEADER + Math.floor(i / cols) * (tileHeight + GAP),
          width: tileWidth,
          height: tileHeight,
        }}
      >
        <Img src={t.src} style={{ width: tileWidth, height: tileHeight, display: "block" }} />
        <div style={{ position: "absolute", left: 4, top: 4, background: "#000c", color: "#fff", fontSize: 18, padding: "1px 6px", borderRadius: 4 }}>
          {t.frame}
        </div>
      </div>
    ))}
  </AbsoluteFill>
);
