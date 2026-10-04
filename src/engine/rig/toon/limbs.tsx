import React from "react";
import { darken, lighten } from "../../lib/color";
import { add, lerpVec, scale, sub, type Vec2 } from "../../lib/math";
import { Hand, type HandShape } from "./hands";
import { polyline, shadeOf, Tube, type Pen } from "./kit";

const unit = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

/** A short straight band across a limb (cuff, rib), from `a` to `b`, `w` px wide. */
const Band: React.FC<{ a: Vec2; b: Vec2; w: number; fill: string; pen: Pen }> = ({ a, b, w, fill, pen }) => (
  <Tube d={polyline([a, b])} w={w} fill={fill} pen={pen} cap="butt" />
);

/**
 * The thumb (local −y of a hand shape) turns with the forearm: forward when the arm hangs, on
 * top when it points forward. Only a forearm pointing clearly backward mirrors the hand, so the
 * thumb stays on top; the margin keeps a hanging arm's sway from flipping it back and forth.
 */
export const thumbFlip = (fore: Vec2): boolean => fore.x < -0.35;

export type ArmProps = {
  shoulder: Vec2;
  elbow: Vec2;
  wrist: Vec2;
  /** The back arm is drawn one tone darker. */
  back: boolean;
  /** `undefined` draws no hand (a held prop's own grip, or a hidden hand). */
  hand?: HandShape;
  /** Drawn over the arm and under the hand: a held prop, so the fingers close over it. */
  between?: React.ReactNode;
  pen: Pen;
};

/** Skin tube, then the sleeve to its cuff, then the hand. */
export const Arm: React.FC<ArmProps> = ({ shoulder, elbow, wrist, back, hand, between, pen }) => {
  const { t, u } = pen;
  const skin = back ? (t.skinShade ?? shadeOf({ fill: t.skin })) : t.skin;
  const fore = unit(sub(wrist, elbow));
  const outer = t.outer;
  const sleeveCloth = outer ? (outer.sleeve ?? outer) : t.top;
  const sleeveFill = back ? shadeOf(sleeveCloth) : sleeveCloth.fill;
  // No outer layer: a short sleeve of the top, ending partway down the upper arm.
  const cuffAt = outer ? lerpVec(elbow, wrist, outer.cuffAt) : lerpVec(shoulder, elbow, 0.6);
  const sleevePts = outer ? [shoulder, elbow, cuffAt] : [shoulder, cuffAt];
  const sleeveW = (outer?.kind === "varsity" ? 36 : 34) * u;
  const angle = (Math.atan2(fore.y, fore.x) * 180) / Math.PI;
  return (
    <g>
      <Tube d={polyline([shoulder, elbow, wrist])} w={t.body.arm * u} fill={skin} pen={pen} />
      <Tube d={polyline(sleevePts)} w={sleeveW} fill={sleeveFill} pen={pen} />
      {outer?.kind === "labcoat" ? (
        // Rolled-up cuff: a slightly wider, lighter band.
        <Band a={add(cuffAt, scale(fore, -10 * u))} b={cuffAt} w={36 * u} fill={back ? shadeOf(outer) : darken(outer.fill, 0.06)} pen={pen} />
      ) : null}
      {outer?.kind === "varsity" ? (
        <>
          <Band a={add(cuffAt, scale(fore, -12 * u))} b={cuffAt} w={32 * u} fill={outer.rib ?? outer.fill} pen={pen} />
          <path
            d={polyline([add(cuffAt, scale(fore, -6.5 * u)), add(cuffAt, scale(fore, -5 * u))])}
            stroke={outer.ribStripe ?? outer.fill}
            strokeWidth={32 * u}
          />
        </>
      ) : null}
      {between}
      {hand ? (
        <Hand
          shape={hand}
          at={add(wrist, scale(fore, -4 * u))}
          angle={angle}
          flip={thumbFlip(fore)}
          skin={skin}
          nails={t.nails}
          pen={pen}
        />
      ) : null}
    </g>
  );
};

export type LegProps = { hip: Vec2; knee: Vec2; ankle: Vec2; back: boolean; pen: Pen };

/** Tights (under a skirt) or a jeans leg with a turned-up cuff. */
export const Leg: React.FC<LegProps> = ({ hip, knee, ankle, back, pen }) => {
  const { t, u } = pen;
  const b = t.bottom;
  if (b.kind === "skirt") {
    const legs = b.legs ?? t.skin;
    return <Tube d={polyline([hip, knee, ankle])} w={24 * u} fill={back ? darken(legs, 0.2) : legs} pen={pen} />;
  }
  const shin = unit(sub(ankle, knee));
  const cuff = b.cuff ?? lighten(b.fill, 0.3);
  return (
    <g>
      <Tube d={polyline([hip, knee, ankle])} w={38 * u} fill={back ? shadeOf(b) : b.fill} pen={pen} />
      <Band a={add(ankle, scale(shin, -26 * u))} b={add(ankle, scale(shin, -8 * u))} w={44 * u} fill={back ? darken(cuff, 0.15) : cuff} pen={pen} />
    </g>
  );
};
