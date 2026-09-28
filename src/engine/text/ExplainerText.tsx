import React from "react";
import { easeOutBack } from "../lib/easing";
import { clamp } from "../lib/math";
import type { CardEvent, ListEvent } from "../director/timeline";
import { CARD, cardLayout, LIST, listLayout } from "./layout";
import type { SafeArea } from "./safeArea";

/** Explainer text for 9:16: title cards and list reveals in the band above the subtitles. */

type Common = { frame: number; width: number; height: number; safeArea: SafeArea; fontFamily: string; direction?: "ltr" | "rtl" };

const POP_FRAMES = 4;
const OUT_FRAMES = 3;

/** The slam's drop-in (big → size with a small overshoot), gentler for stacked text. */
const pop = (frame: number, at: number, from = 1.8) => {
  const t = frame - (at - POP_FRAMES);
  if (t < 0) return undefined;
  return { scale: from - (from - 1) * easeOutBack(t / POP_FRAMES, 1.4), opacity: clamp(t / 2, 0, 1) };
};

const outlined = (size: number, fill: string, outline: string): React.CSSProperties => ({
  color: fill,
  WebkitTextStroke: `${Math.round(size * 0.12)}px ${outline}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size * 0.07)}px 0 ${outline}`,
});

const line = (text: string, cy: number, size: number, style: React.CSSProperties, transform: string, opacity: number, fontFamily: string, key?: React.Key, direction: "ltr" | "rtl" = "ltr") => (
  <div key={key} style={{ position: "absolute", left: 0, right: 0, top: cy, transform, opacity, textAlign: "center", direction, fontFamily, fontSize: size, whiteSpace: "nowrap", ...style }}>
    {text}
  </div>
);

/** Full-frame title card over the (dimmed) set: kicker pill, then the title's lines pop in on their anchors. */
export const CardText: React.FC<Common & { card: CardEvent; title: string }> = ({ card, title, frame, width, height, safeArea, fontFamily, direction = "ltr" }) => {
  if (frame >= card.to) return null;
  const layout = cardLayout(title, card.kicker, width, height, safeArea);
  const out = clamp((card.to - frame) / OUT_FRAMES, 0, 1);
  const scrim = clamp(frame / 6, 0, 1) * out;
  const k = layout.kicker;
  const kIn = pop(frame, card.kickerFrom, 1.3);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: CARD.scrim, opacity: scrim }} />
      {k && kIn ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: k.rect.y, display: "flex", justifyContent: "center", opacity: kIn.opacity * out, transform: `scale(${kIn.scale.toFixed(3)})` }}>
          <div
            style={{
              maxWidth: width * 0.8,
              whiteSpace: k.lines.length === 1 ? "nowrap" : undefined,
              padding: `${k.fontSize * 0.2}px ${k.fontSize * 0.5}px`,
              background: "#ffffff",
              color: "#16161a",
              borderRadius: k.fontSize * 0.4,
              fontFamily,
              fontWeight: 800,
              fontSize: k.fontSize,
              lineHeight: 1.2,
              textAlign: "center",
              direction,
            }}
          >
            {card.kicker}
          </div>
        </div>
      ) : null}
      {layout.lines.map((l, i) => {
        const p = pop(frame, card.at[i] ?? card.at[0]!, 2.3);
        if (!p) return null;
        const t = `translateY(-50%) rotate(-3deg) scale(${p.scale.toFixed(3)})`;
        return line(l, layout.lineY[i]!, layout.fontSize, { fontWeight: 900, lineHeight: CARD.lineHeight, letterSpacing: "-0.01em", ...outlined(layout.fontSize, CARD.fill, CARD.outline) }, t, p.opacity * out, fontFamily, i, direction);
      })}
    </div>
  );
};

/** Stacked list: each item pops in on its anchor and the list leaves at the next cut. */
export const ListText: React.FC<Common & { list: ListEvent }> = ({ list, frame, width, height, safeArea, fontFamily, direction = "ltr" }) => {
  if (frame >= list.to || frame < list.at[0]! - POP_FRAMES) return null;
  const layout = listLayout(list.items, width, height, safeArea);
  const out = clamp((list.to - frame) / OUT_FRAMES, 0, 1);
  return (
    <>
      {list.items.map((item, i) => {
        const p = pop(frame, list.at[i]!);
        if (!p) return null;
        const t = `translateY(-50%) scale(${p.scale.toFixed(3)})`;
        return line(item, layout.itemY[i]!, layout.fontSize, { fontWeight: 900, lineHeight: 1, ...outlined(layout.fontSize, LIST.fill, LIST.outline) }, t, p.opacity * out, fontFamily, i, direction);
      })}
    </>
  );
};
