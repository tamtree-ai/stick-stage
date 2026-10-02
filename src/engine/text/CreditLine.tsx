import React from "react";
import { safeRect, type SafeArea } from "./safeArea";

/** The image credit, burned in at the bottom of the safe area (under the captions) while a NASA / ESA image is up. */
export const CreditLine: React.FC<{ text: string; width: number; height: number; safeArea: SafeArea; fontFamily: string }> = ({ text, width, height, safeArea, fontFamily }) => {
  const safe = safeRect(safeArea, width, height);
  const size = Math.round(width * 0.022);
  return (
    <div
      style={{
        position: "absolute",
        left: safe.x,
        bottom: height - (safe.y + safe.h) + size * 0.2,
        maxWidth: safe.w,
        fontFamily,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.25,
        color: "#ffffff",
        background: "rgba(0,0,0,0.55)",
        padding: `${size * 0.25}px ${size * 0.5}px`,
        borderRadius: size * 0.3,
      }}
    >
      {text}
    </div>
  );
};
