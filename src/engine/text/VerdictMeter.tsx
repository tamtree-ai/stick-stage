import React from "react";
import type { VerdictEvent } from "../director/timeline";
import { easeOutBack, easeOutCubic } from "../lib/easing";
import { clamp, lerp } from "../lib/math";
import { textWidth, VERDICT } from "./layout";
import { safeRect, type SafeArea } from "./safeArea";

const POP_FRAMES = 5;

/** The meter's value (share blaming the left side) at `frame`: each key tips from the last settled value with a small overshoot. */
export const verdictValueAt = (keys: VerdictEvent["keys"], frame: number): number => {
  let v = keys[0]?.value ?? 50;
  let settled = v;
  for (const k of keys.slice(1)) {
    if (frame < k.frame) break;
    v = lerp(settled, k.value, easeOutBack((frame - k.frame) / VERDICT.swingFrames, 1.4));
    settled = k.value;
  }
  return clamp(v, 4, 96);
};

const outlined = (px: number): React.CSSProperties => ({ WebkitTextStroke: `${px}px ${VERDICT.ink}`, paintOrder: "stroke fill" });

export type VerdictMeterProps = { verdict: VerdictEvent; frame: number; width: number; height: number; safeArea: SafeArea; fontFamily: string };

/**
 * "Who's wrong?" meter: the question stamps in big on frame 0, shrinks into a header, and a
 * two-colour bar under it tips toward whoever the room blames. After the punchline a pulsing
 * comment ask drops under the bar. Frame-pure.
 */
export const VerdictMeter: React.FC<VerdictMeterProps> = ({ verdict: v, frame, width, height, safeArea, fontFamily }) => {
  const safe = safeRect(safeArea, width, height);
  const headerY = safe.y + VERDICT.top;
  const barY = headerY + VERDICT.titleSize * 1.3 + VERDICT.barGap;
  const barW = safe.w * 0.92;
  const barX = safe.x + (safe.w - barW) / 2;
  const { stampFrames, shrinkFrames } = VERDICT;
  // 0 = the big stamp mid-frame, 1 = settled in the header.
  const settle = v.intro ? easeOutCubic((frame - stampFrames) / shrinkFrames) : 1;
  const pop = v.intro ? clamp(easeOutBack((frame + 1) / POP_FRAMES, 1.8), 0, 1.2) : 1;
  // The stamp fits the safe width (uppercase glyphs plus the card's padding).
  const stampSize = Math.min(VERDICT.stampSize, (safe.w * 0.94) / (textWidth(v.question.toUpperCase(), 1) + 1));
  const titleSize = lerp(stampSize, VERDICT.titleSize, settle);
  const titleCy = lerp(height * VERDICT.stampY, headerY + VERDICT.titleSize * 0.65, settle);
  const barIn = v.intro ? easeOutBack((frame - stampFrames - shrinkFrames / 2) / 6, 1.3) : 1;
  const value = verdictValueAt(v.keys, frame);
  const split = barW * (value / 100);
  const askT = v.askFrom === undefined ? 0 : easeOutBack((frame - v.askFrom) / POP_FRAMES, 1.8);
  const pulse = 1 + 0.035 * Math.sin(((frame - (v.askFrom ?? 0)) / 9) * Math.PI);
  const radius = VERDICT.barHeight / 2;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: safe.x,
          width: safe.w,
          top: titleCy - titleSize * 0.65,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${pop.toFixed(3)}) rotate(${lerp(-4, 0, settle).toFixed(2)}deg)`,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            padding: `${titleSize * 0.08}px ${titleSize * 0.4}px`,
            background: VERDICT.card,
            border: `${Math.max(4, Math.round(titleSize * 0.08))}px solid ${VERDICT.ink}`,
            borderRadius: titleSize * 0.4,
            boxShadow: `0 ${Math.round(titleSize * 0.1)}px 0 ${VERDICT.ink}`,
            color: VERDICT.ink,
            fontFamily,
            fontWeight: 900,
            fontSize: titleSize,
            lineHeight: 1.1,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {v.question}
        </div>
      </div>
      {barIn > 0 ? (
        <div style={{ position: "absolute", left: barX, top: barY, width: barW, height: VERDICT.barHeight, transform: `scaleX(${clamp(barIn, 0, 1.1).toFixed(3)})`, transformOrigin: "50% 50%" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", border: `6px solid ${VERDICT.ink}`, background: VERDICT.right, boxShadow: `0 7px 0 ${VERDICT.ink}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: split, background: VERDICT.left }} />
            <div style={{ position: "absolute", left: split - 5, top: -4, bottom: -4, width: 10, background: VERDICT.card, transform: "skewX(-14deg)" }} />
          </div>
          {v.sides.map((side, i) => (
            <div
              key={side.id}
              style={{
                position: "absolute",
                top: 0,
                height: VERDICT.barHeight,
                display: "flex",
                alignItems: "center",
                [i === 0 ? "left" : "right"]: radius * 0.7,
                color: VERDICT.card,
                fontFamily,
                fontWeight: 900,
                fontSize: VERDICT.nameSize,
                ...outlined(7),
              }}
            >
              {side.name}
            </div>
          ))}
        </div>
      ) : null}
      {v.ask && askT > 0 ? (
        <div style={{ position: "absolute", left: safe.x, width: safe.w, top: barY + VERDICT.barHeight + 26, display: "flex", justifyContent: "center", transform: `scale(${(askT * pulse).toFixed(3)})`, transformOrigin: "50% 0%" }}>
          <div
            style={{
              padding: `${VERDICT.askSize * 0.18}px ${VERDICT.askSize * 0.5}px`,
              background: VERDICT.askFill,
              border: `6px solid ${VERDICT.ink}`,
              borderRadius: VERDICT.askSize * 0.5,
              boxShadow: `0 6px 0 ${VERDICT.ink}`,
              color: VERDICT.ink,
              fontFamily,
              fontWeight: 900,
              fontSize: VERDICT.askSize,
              whiteSpace: "nowrap",
            }}
          >
            {v.ask}
          </div>
        </div>
      ) : null}
    </>
  );
};
