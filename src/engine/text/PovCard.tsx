import React from "react";
import { easeOutBack } from "../lib/easing";
import { clamp } from "../lib/math";
import { POV } from "./layout";
import { safeRect, type SafeArea } from "./safeArea";

export type PovCardProps = {
  text: string;
  frame: number;
  width: number;
  height: number;
  safeArea: SafeArea;
  fontFamily: string;
  /** Frame the card pops in on. */
  from?: number;
  /** Frame it leaves on (omit to hold to the end). */
  to?: number;
  fontSize?: number;
};

const IN_FRAMES = 5;
const OUT_FRAMES = 3;

/** Top "POV:" card: dark text on a white rounded card, just inside the top safe edge. */
export const PovCard: React.FC<PovCardProps> = ({ text, frame, width, height, safeArea, fontFamily, from = 0, to, fontSize = POV.fontSize }) => {
  if (frame < from || (to !== undefined && frame >= to)) return null;
  const safe = safeRect(safeArea, width, height);
  const inT = easeOutBack((frame - from + 1) / IN_FRAMES, 1.6);
  const outT = to === undefined ? 1 : clamp((to - frame) / OUT_FRAMES, 0, 1);
  const s = Math.max(0, inT) * outT;
  const [lead, ...rest] = text.split(/(?<=^POV:)/);
  return (
    <div
      style={{
        position: "absolute",
        left: safe.x,
        width: safe.w,
        top: safe.y + 16,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${s.toFixed(3)})`,
        transformOrigin: "50% 0%",
      }}
    >
      <div
        style={{
          maxWidth: safe.w * 0.94,
          padding: `${fontSize * 0.34}px ${fontSize * 0.55}px`,
          background: POV.card,
          color: POV.fill,
          borderRadius: fontSize * 0.45,
          border: `${Math.round(fontSize * 0.1)}px solid #16161a`,
          boxShadow: `0 ${Math.round(fontSize * 0.12)}px 0 #16161a`,
          fontFamily,
          fontWeight: 700,
          fontSize,
          lineHeight: POV.lineHeight,
          textAlign: "center",
        }}
      >
        {rest.length ? (
          <>
            <span style={{ fontWeight: 900 }}>{lead}</span>
            {rest.join("")}
          </>
        ) : (
          text
        )}
      </div>
    </div>
  );
};
