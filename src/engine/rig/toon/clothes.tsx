import React from "react";
import { darken } from "../../lib/color";
import { f2, type Vec2 } from "../../lib/math";
import { shadeOf, Shaded, Star, type Pen } from "./kit";
import type { ToonDetail } from "./schema";

/** Default colours of the small details (a character's `details[].color` overrides them). */
const DETAIL_COLORS: Record<ToonDetail, string> = {
  "pocket-pens": "#178f8a",
  "planet-pin": "#2b3a7a",
  "star-patch": "#f6c445",
  headphones: "#2bb3b1",
  "star-earring": "#f6c445",
  freckles: "#8a533a",
};
const PEN_RED = "#e4573a";

export const detailColor = (pen: Pen, id: ToonDetail): string | undefined => {
  const d = pen.t.details.find((x) => x.id === id);
  return d ? (d.color ?? DETAIL_COLORS[id]) : undefined;
};

export type TorsoProps = {
  hip: Vec2;
  /** Torso rotation in degrees (0 = upright). */
  angle: number;
  /** Torso length and thigh length in toon units. */
  T: number;
  thigh: number;
  /** Knees in figure px (back, front): a skirt's hem follows the thighs. */
  knees: readonly [Vec2, Vec2];
  pen: Pen;
};

/**
 * Everything worn on the torso, drawn in toon units in the torso frame (origin at the hip,
 * up = −y, facing +x): skirt or the jeans seat, the top, belt, the open outer layer, details.
 */
export const Torso: React.FC<TorsoProps> = ({ hip, angle, T, thigh, knees, pen }) => {
  const { t } = pen;
  const o = t.outline;
  const ink = pen.ink;
  const W = t.body.shoulders;
  const Wa = t.body.waist ?? W * 0.8;
  const H = t.body.hips;
  const b = t.bottom;
  const outer = t.outer;
  const parts: React.ReactNode[] = [];

  if (b.kind === "skirt") {
    // The hem follows the thighs: (a, b) is `a` along the mean thigh and `b` across it toward
    // the front. Standing that is plain (b, a); seated the skirt lies over the lap, less flared.
    const rad = (-angle * Math.PI) / 180;
    const local = (p: Vec2) => {
      const x = (p.x - hip.x) / pen.u;
      const y = (p.y - hip.y) / pen.u;
      return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
    };
    const kl = local(knees[0]);
    const kr = local(knees[1]);
    const mx = (kl.x + kr.x) / 2;
    const my = (kl.y + kr.y) / 2;
    const dl = Math.hypot(mx, my) || 1;
    const d = { x: mx / dl, y: my / dl };
    const lap = Math.min(1, Math.max(0, Math.atan2(d.x, d.y) / (Math.PI / 2)));
    const k = 1 - 0.45 * lap;
    const at = (a: number, w: number) => `${f2(d.x * a + d.y * w * k)},${f2(d.y * a - d.x * w * k)}`;
    const sk = `M${-Wa * 0.55},-30 L${Wa * 0.55},-30 Q${at(40, H * 0.75)} ${at(thigh * 0.82, H * 0.9)} Q${at(thigh * 0.92, 0)} ${at(thigh * 0.82, -H * 0.9)} Q${at(40, -H * 0.75)} ${-Wa * 0.55},-30 Z`;
    parts.push(<Shaded key="skirt" d={sk} fill={b.fill} shade={shadeOf(b)} cut={-H * 0.35} pen={pen} />);
    parts.push(
      <path
        key="pleats"
        d={`M${at(0, -6)} Q${at(60, -10)} ${at(thigh * 0.84, -16)} M${at(4, 24)} Q${at(60, 30)} ${at(thigh * 0.82, 36)}`}
        fill="none"
        stroke={shadeOf(b)}
        strokeWidth={5}
        strokeLinecap="round"
      />,
    );
  } else {
    // The seat of the jeans, so the tops of the legs join under the top.
    parts.push(<path key="seat" d={`M${-H / 2},-20 L${H / 2},-20 L${H / 2 - 4},18 L${-H / 2 + 4},18 Z`} fill={b.fill} stroke={b.fill} strokeWidth={10} />);
  }

  const top = t.top;
  if (top.kind === "turtleneck") {
    const d = `M${-W * 0.46},${-T + 4} Q${-W * 0.5},${-T * 0.62} ${-Wa * 0.5},${-T * 0.3} Q${-Wa * 0.56},-18 ${-Wa * 0.56},-26 L${Wa * 0.56},-26 Q${Wa * 0.52},${-T * 0.3} ${Wa * 0.5},${-T * 0.3} Q${W * 0.5},${-T * 0.62} ${W * 0.46},${-T + 4} Q0,${-T - 12} ${-W * 0.46},${-T + 4} Z`;
    parts.push(<Shaded key="top" d={d} fill={top.fill} shade={shadeOf(top)} cut={-W * 0.2} pen={pen} />);
    parts.push(
      <path
        key="collar"
        d={`M${-W * 0.2},${-T - 2} Q0,${-T - 12} ${W * 0.26},${-T - 2} L${W * 0.22},${-T + 16} Q0,${-T + 6} ${-W * 0.16},${-T + 16} Z`}
        fill={top.fill}
        stroke={ink}
        strokeWidth={o * 0.75}
        strokeLinejoin="round"
      />,
    );
  } else {
    // Under an open outer layer only the middle shows; alone, the tee spans the shoulders.
    const d = outer
      ? `M${-W * 0.3},${-T + 2} L${W * 0.36},${-T + 2} L${H * 0.4},0 L${-H * 0.3},0 Z`
      : `M${-W * 0.48},${-T + 4} L${W * 0.5},${-T + 4} L${H * 0.52},0 L${-H * 0.5},0 Z`;
    parts.push(<Shaded key="top" d={d} fill={top.fill} shade={outer ? undefined : shadeOf(top)} cut={-W * 0.2} pen={pen} />);
  }
  if (top.print) {
    const cx = W * 0.06;
    const cy = -T * 0.55;
    parts.push(
      <g key="print">
        <circle cx={cx} cy={cy} r={20} fill={top.print} />
        <ellipse cx={cx} cy={cy} rx={34} ry={9} fill="none" stroke={top.print} strokeWidth={5} transform={`rotate(-18 ${f2(cx)} ${f2(cy)})`} />
      </g>,
    );
  }
  if (top.belt) {
    const d = `M${-Wa * 0.56},-30 H${Wa * 0.56}`;
    parts.push(
      <g key="belt" strokeLinecap="round">
        <path d={d} stroke={ink} strokeWidth={8} />
        <path d={d} stroke={top.belt} strokeWidth={3} />
      </g>,
    );
  }

  if (outer?.kind === "labcoat") {
    const back = `M${-W * 0.52},${-T + 8} Q${-W * 0.64},${-T * 0.4} ${-H * 0.78},62 L${-H * 0.2},70 L${-W * 0.12},${-T * 0.42} L${-W * 0.06},${-T + 4} Q${-W * 0.3},${-T - 8} ${-W * 0.52},${-T + 8} Z`;
    const front = `M${W * 0.52},${-T + 8} Q${W * 0.62},${-T * 0.4} ${H * 0.78},62 L${H * 0.42},68 L${W * 0.3},${-T * 0.42} L${W * 0.3},${-T + 4} Q${W * 0.42},${-T - 6} ${W * 0.52},${-T + 8} Z`;
    parts.push(<Shaded key="coatB" d={back} fill={outer.fill} shade={shadeOf(outer)} cut={-W * 0.36} pen={pen} />);
    parts.push(<Shaded key="coatF" d={front} fill={outer.fill} pen={pen} />);
    parts.push(
      <path
        key="lapels"
        d={`M${-W * 0.06},${-T + 4} L${-W * 0.02},${-T * 0.7} L${-W * 0.16},${-T * 0.76} M${W * 0.3},${-T + 4} L${W * 0.26},${-T * 0.7} L${W * 0.4},${-T * 0.76}`}
        fill="none"
        stroke={ink}
        strokeWidth={o * 0.67}
        strokeLinejoin="round"
      />,
    );
    parts.push(<path key="hipPocket" d={`M${-H * 0.6},28 h30`} stroke={ink} strokeWidth={o * 0.67} strokeLinecap="round" />);
  } else if (outer?.kind === "varsity") {
    const back = `M${-W * 0.48},${-T + 4} Q${-W * 0.62},${-T * 0.5} ${-H * 0.58},-2 L${-H * 0.18},-2 L${-W * 0.12},${-T * 0.5} L${-W * 0.1},${-T + 4} Q${-W * 0.3},${-T - 10} ${-W * 0.48},${-T + 4} Z`;
    const front = `M${W * 0.5},${-T + 4} Q${W * 0.62},${-T * 0.5} ${H * 0.6},-2 L${H * 0.36},-2 L${W * 0.28},${-T * 0.5} L${W * 0.26},${-T + 4} Q${W * 0.38},${-T - 8} ${W * 0.5},${-T + 4} Z`;
    const rib = outer.rib ?? outer.fill;
    const stripe = outer.ribStripe ?? outer.fill;
    const hem = `M${-H * 0.58},-2 H${-H * 0.18} M${H * 0.36},-2 H${H * 0.6}`;
    const collar = `M${-W * 0.1},${-T + 4} Q${W * 0.1},${-T + 20} ${W * 0.26},${-T + 4}`;
    parts.push(<Shaded key="jB" d={back} fill={outer.fill} shade={shadeOf(outer)} cut={-W * 0.3} pen={pen} />);
    parts.push(<Shaded key="jF" d={front} fill={outer.fill} pen={pen} />);
    parts.push(
      <g key="ribs" fill="none">
        <path d={hem} stroke={ink} strokeWidth={22 + 2 * o} />
        <path d={hem} stroke={rib} strokeWidth={22} />
        <path d={hem} stroke={stripe} strokeWidth={5} />
        <path d={collar} stroke={ink} strokeWidth={16 + 2 * o} strokeLinecap="round" />
        <path d={collar} stroke={rib} strokeWidth={16} strokeLinecap="round" />
        <circle cx={W * 0.44} cy={-T * 0.28} r={5} fill={rib} stroke={ink} strokeWidth={3} />
      </g>,
    );
  }

  const pens = detailColor(pen, "pocket-pens");
  if (pens) {
    const x = -H * 0.6;
    const y = -T * 0.6;
    parts.push(
      <g key="pens" strokeLinecap="round">
        <rect x={x} y={y} width={28} height={24} rx={3} fill={outer?.fill ?? t.top.fill} stroke={ink} strokeWidth={o * 0.67} />
        <path d={`M${x + 8},${y - 12} v20`} stroke={pens} strokeWidth={5} />
        <path d={`M${x + 17},${y - 9} v17`} stroke={PEN_RED} strokeWidth={5} />
      </g>,
    );
  }
  const pin = detailColor(pen, "planet-pin");
  if (pin) {
    const cx = W * 0.42;
    const cy = -T * 0.74;
    parts.push(
      <g key="pin">
        <circle cx={cx} cy={cy} r={11} fill={pin} stroke={ink} strokeWidth={3.5} />
        <ellipse cx={cx} cy={cy} rx={18} ry={5} fill="none" stroke={t.accent} strokeWidth={3} transform={`rotate(-20 ${f2(cx)} ${f2(cy)})`} />
      </g>,
    );
  }
  const patch = detailColor(pen, "star-patch");
  if (patch) parts.push(<Star key="patch" x={W * 0.44} y={-T * 0.66} r={15} fill={patch} pen={pen} sw={3.5} />);
  const phones = detailColor(pen, "headphones");
  if (phones) {
    const band = `M${-W * 0.28},${-T + 2} Q${W * 0.05},${-T + 46} ${W * 0.36},${-T + 4}`;
    parts.push(
      <g key="phones" fill="none" strokeLinecap="round">
        <path d={band} stroke={ink} strokeWidth={20} />
        <path d={band} stroke={phones} strokeWidth={12} />
        <ellipse cx={W * 0.36} cy={-T + 14} rx={19} ry={24} fill={darken(phones, 0.45)} stroke={ink} strokeWidth={5} />
        <ellipse cx={W * 0.38} cy={-T + 14} rx={10} ry={14} fill={phones} />
      </g>,
    );
  }

  return <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)}) scale(${f2(pen.u)})`}>{parts}</g>;
};
