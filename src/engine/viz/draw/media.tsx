import React from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { f2 } from "../../lib/math";
import { equationFit } from "../geometry";
import type { EquationP, ImageP } from "../params";
import { resolveColor } from "../theme";
import type { Typeset } from "../typeset";
import { phase, type DrawProps } from "./common";

/**
 * A typeset equation, fitted into its box. Parts appear in order (`show`), tagged terms can
 * light up (`highlight`) or be cancelled (`strike`).
 */
export const Equation: React.FC<DrawProps<EquationP> & { typeset?: Typeset }> = ({
  p,
  w,
  h,
  theme,
  reveal,
  unit,
  typeset,
}) => {
  if (!typeset) return null;
  const { s, ox, oy } = equationFit(typeset, w, h);
  const n = typeset.parts.length;
  // The reveal draws the parts on one after another, up to `show` of them.
  const limit = Math.min(n, p.show ?? n);
  const shownAt = (i: number) =>
    Math.min(1, Math.max(0, limit - i)) *
    phase(reveal, i / Math.max(1, n), (i + 1) / Math.max(1, n));
  const ink = resolveColor(theme, p.color);
  const hi = resolveColor(theme, p.highlightColor, theme.highlight);
  const sw = theme.stroke * unit;
  return (
    <g transform={`translate(${f2(ox)} ${f2(oy)}) scale(${f2(s)})`}>
      {typeset.parts.map((part, i) => {
        const o = shownAt(i);
        if (o <= 0) return null;
        const lit = part.cls !== undefined && p.highlight.includes(part.cls);
        const struck = part.cls !== undefined && p.strike.includes(part.cls);
        const [bx, by, bw, bh] = part.box;
        const pad = 60;
        return (
          <g key={i} opacity={o} style={{ color: lit ? hi : ink }}>
            {lit ? (
              <rect
                x={bx - pad}
                y={by - pad}
                width={bw + 2 * pad}
                height={bh + 2 * pad}
                rx={pad}
                fill={hi}
                opacity={0.18}
              />
            ) : null}
            <g
              fill="currentColor"
              stroke="none"
              dangerouslySetInnerHTML={{ __html: part.markup }}
            />
            {struck ? (
              <line
                x1={bx - pad}
                y1={by + bh + pad * 0.5}
                x2={bx + bw + pad}
                y2={by - pad * 0.5}
                stroke={theme.myth}
                strokeWidth={(sw * 1.1) / s}
                strokeLinecap="round"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

const loaded = new Set<string>();

/** Hold the frame until the image is decoded (SVG `<image>` has no Remotion wrapper). */
const holdForImage = (src: string) => {
  if (loaded.has(src) || typeof Image === "undefined") return;
  const handle = delayRender(`image ${src}`);
  const img = new Image();
  img.onload = () => {
    loaded.add(src);
    continueRender(handle);
  };
  img.onerror = () => continueRender(handle);
  img.src = src;
};

/** A credited NASA / ESA image with a slow, frame-pure pan and zoom, in a drawn frame. */
export const ImageFigure: React.FC<
  DrawProps<ImageP> & {
    image?: { src: string; width: number; height: number };
    id: string;
    progress: number;
  }
> = ({ p, w, h, theme, reveal, unit, image, id, progress }) => {
  const src = image ? staticFile(image.src) : "";
  holdForImage(src);
  if (!image) return null;
  const u = Math.min(1, Math.max(0, progress));
  const zoom = p.from.zoom + (p.to.zoom - p.from.zoom) * u;
  const cx = p.from.x + (p.to.x - p.from.x) * u;
  const cy = p.from.y + (p.to.y - p.from.y) * u;
  const ar = image.width / image.height;
  const base = p.fit === "cover" ? Math.max(w / ar, h) : Math.min(w / ar, h);
  const ih = base * zoom;
  const iw = ih * ar;
  const x = w / 2 - cx * iw;
  const y = h / 2 - cy * ih;
  const sw = theme.stroke * unit;
  const clip = `img-clip-${id}`;
  const shape =
    p.frame === "eyepiece" ? (
      <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} />
    ) : (
      <rect x={0} y={0} width={w} height={h} rx={p.frame === "monitor" ? sw * 2 : sw} />
    );
  return (
    <g opacity={phase(reveal, 0, 1)}>
      <defs>
        <clipPath id={clip}>{shape}</clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="#000" clipPath={`url(#${clip})`} />
      <image
        href={src}
        x={f2(x)}
        y={f2(y)}
        width={f2(iw)}
        height={f2(ih)}
        preserveAspectRatio="none"
        clipPath={`url(#${clip})`}
      />
      {p.frame === "none" ? null : p.frame === "eyepiece" ? (
        <circle
          cx={w / 2}
          cy={h / 2}
          r={Math.min(w, h) / 2}
          fill="none"
          stroke={theme.ink}
          strokeWidth={sw * 2.4}
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={p.frame === "monitor" ? sw * 2 : sw}
          fill="none"
          stroke={theme.ink}
          strokeWidth={p.frame === "monitor" ? sw * 3 : sw * 1.2}
        />
      )}
    </g>
  );
};
