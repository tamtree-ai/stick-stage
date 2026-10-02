import React from "react";
import { easeOutBack } from "../lib/easing";
import { f2 } from "../lib/math";
import { figureFontSize } from "./geometry";
import { Txt, type DrawProps } from "./draw/common";
import { Equation, ImageFigure } from "./draw/media";
import { Orbit, Particles } from "./draw/orbitParticles";
import { Axes, Plot } from "./draw/plot";
import { Callout, Histogram, Label, NumberLine } from "./draw/scales";
import { Vectors, Wave } from "./draw/vectorWave";
import type {
  AxesP,
  CalloutP,
  EquationP,
  HistogramP,
  ImageP,
  LabelP,
  NumberLineP,
  OrbitP,
  ParticlesP,
  PlotP,
  VectorP,
  WaveP,
} from "./params";
import type { VizTheme } from "./theme";
import { activeSpan, evalFigure, strikeRedraw, type FigureTrack, type Params } from "./track";

export type FiguresProps = {
  figures: readonly FigureTrack[];
  layer: "back" | "front";
  frame: number;
  fps: number;
  width: number;
  height: number;
  theme: VizTheme;
  fontFamily?: string;
};

const fontSize = (f: FigureTrack, unit: number) => figureFontSize(f.rect, unit);

const Body: React.FC<{
  f: FigureTrack;
  params: Params;
  reveal: number;
  t: number;
  theme: VizTheme;
  fontFamily?: string;
  unit: number;
  width: number;
  height: number;
  frame: number;
  fps: number;
}> = ({ f, params, reveal, t, theme, fontFamily, unit, width, height, frame, fps }) => {
  const { w, h } = f.rect;
  const fs = fontSize(f, unit);
  const common = { w, h, theme, reveal, t, fontFamily, unit };
  const as = <P,>(): DrawProps<P> => ({ ...common, p: params as P });
  switch (f.kind) {
    case "plot":
      return <Plot {...as<PlotP>()} fs={fs} />;
    case "axes":
      return <Axes {...as<AxesP>()} fs={fs} />;
    case "vector":
      return <Vectors {...as<VectorP>()} fs={fs} />;
    case "wave":
      return <Wave {...as<WaveP>()} fs={fs} />;
    case "orbit":
      return <Orbit {...as<OrbitP>()} fs={fs} />;
    case "particles":
      return <Particles {...as<ParticlesP>()} fs={fs} />;
    case "label":
      return <Label {...as<LabelP>()} />;
    case "callout": {
      const c = params as CalloutP;
      const tgt = Array.isArray(c.target)
        ? { x: c.target[0] * width - f.rect.x, y: c.target[1] * height - f.rect.y }
        : { x: w / 2, y: h };
      return <Callout {...as<CalloutP>()} target={tgt} />;
    }
    case "numberline":
    case "scale":
      return <NumberLine {...as<NumberLineP>()} fs={fs} />;
    case "histogram":
      return <Histogram {...as<HistogramP>()} fs={fs} />;
    case "equation":
      return <Equation {...as<EquationP>()} typeset={f.typeset} />;
    case "image": {
      const on = activeSpan(f, frame);
      const from = on?.show.frame ?? 0;
      const span = on?.hide ? on.hide.frame - from : 10 * fps;
      return (
        <ImageFigure
          {...as<ImageP>()}
          image={f.image}
          id={f.id}
          progress={(frame - from) / Math.max(1, span)}
        />
      );
    }
    default:
      return null;
  }
};

/** One figure at a frame: panel, body (with its reveal), the struck-out ghost, caption and tag. */
const FigureView: React.FC<Omit<FiguresProps, "figures" | "layer"> & { f: FigureTrack }> = ({
  f,
  frame,
  fps,
  width,
  height,
  theme,
  fontFamily,
}) => {
  const st = evalFigure(f, frame, fps);
  if (!st.visible) return null;
  const unit = width / 1080;
  const { x, y, w, h } = f.rect;
  const fs = fontSize(f, unit);
  const sw = theme.stroke * unit;
  const pop = st.style === "pop" ? easeOutBack(st.reveal, 1.6) : 1;
  const drawReveal =
    st.style === "draw" ? st.reveal : st.style === "none" ? 1 : Math.min(1, st.reveal * 4);
  const fade = st.style === "fade" || st.style === "pop" ? st.reveal : 1;
  const redraw = st.ghost ? strikeRedraw(f, frame) : 1;
  const body = { f, theme, fontFamily, unit, width, height, frame, fps };
  // The caption is a title above the box (below it sits the cast's heads).
  const labelY = -fs * 0.95;
  const struckLabel = st.ghost?.label && st.ghost.label !== st.label ? st.ghost.label : undefined;
  // Old and new captions side by side: the old one crossed out, the new one in the truth colour.
  const oldX = w * 0.27;
  const newX = struckLabel ? w * 0.73 : w / 2;
  const oldW = struckLabel ? Math.min(w * 0.46, struckLabel.length * fs * 0.6) : 0;
  return (
    <g
      transform={`translate(${f2(x + w / 2)} ${f2(y + h / 2)}) scale(${f2(pop)}) translate(${f2(-w / 2)} ${f2(-h / 2)})`}
      opacity={st.opacity * fade}
    >
      {f.panel ? (
        <rect
          x={-fs * 0.6}
          y={-fs * 0.6 - (f.label ? fs * 1.6 : 0)}
          width={w + fs * 1.2}
          height={h + fs * 1.2 + (f.label ? fs * 1.6 : 0)}
          rx={fs * 0.6}
          fill={theme.panel}
          opacity={0.9}
        />
      ) : null}
      {st.ghost ? (
        <g opacity={0.3}>
          <Body {...body} params={st.ghost.params} reveal={1} t={st.t} />
        </g>
      ) : null}
      <g opacity={st.ghost ? redraw : 1}>
        <Body
          {...body}
          params={st.params}
          reveal={Math.min(drawReveal, st.ghost ? redraw : 1)}
          t={st.t}
        />
      </g>
      {struckLabel && st.ghost ? (
        <g>
          <Txt
            x={oldX}
            y={labelY}
            size={fs * 0.9}
            color={theme.muted}
            halo={theme.paper}
            fontFamily={fontFamily}
          >
            {struckLabel}
          </Txt>
          <line
            x1={f2(oldX - oldW / 2)}
            y1={labelY}
            x2={f2(oldX - oldW / 2 + oldW * st.ghost.strike)}
            y2={labelY}
            stroke={theme.myth}
            strokeWidth={sw * 0.9}
            strokeLinecap="round"
          />
        </g>
      ) : null}
      {st.label ? (
        <Txt
          x={newX}
          y={labelY}
          size={fs}
          color={struckLabel ? theme.truth : theme.ink}
          halo={theme.paper}
          fontFamily={fontFamily}
          opacity={st.ghost ? redraw : drawReveal}
        >
          {st.label}
        </Txt>
      ) : null}
      {f.tag ? (
        <Txt
          x={w}
          y={-fs * 0.2}
          size={fs * 0.62}
          color={theme.muted}
          halo={theme.paper}
          anchor="end"
          italic
          weight={600}
          fontFamily={fontFamily}
        >
          {f.tag}
        </Txt>
      ) : null}
    </g>
  );
};

/** Figures on one layer of the stage, under the camera. */
export const Figures: React.FC<FiguresProps> = ({ figures, layer, ...rest }) => (
  <g>
    {figures
      .filter((f) => f.layer === layer)
      .map((f) => (
        <FigureView key={f.id} f={f} {...rest} />
      ))}
  </g>
);
