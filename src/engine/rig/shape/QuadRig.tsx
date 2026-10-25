import React, { useId } from "react";
import { shade } from "../../lib/color";
import { f2, mid, type Vec2 } from "../../lib/math";
import { PropView } from "../../props/PropView";
import { propAngle } from "../../props/track";
import { proportionsOf } from "../build";
import { limbControl, limbPath } from "../limbs";
import type { RigProps } from "../Rig";
import { Tail } from "./body";
import { ShapeHead, ShapeHeadBack, ShapeHeadSymbols } from "./face";
import { backTone, lookOf, propLine } from "./look";
import { castTone } from "./palette";
import { CelPart } from "../../shots/finish";
import { GroundShadow, Soft } from "./soft";
import { shapeBuildMetrics } from "./proportions";
import type { Shape } from "./schema";

const Leg: React.FC<{ root: Vec2; joint: Vec2; tip: Vec2; w: number; fill: string }> = ({ root, joint, tip, w, fill }) => (
  <path d={limbPath(root, limbControl(root, joint, tip, 0.18, 1), tip)} fill="none" stroke={fill} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);

/** A collar round a four-legged neck: a band across the neck between the shoulders and the head, and a tag. */
const Collar: React.FC<{ from: Vec2; head: Vec2; R: number; color: string }> = ({ from, head, R, color }) => {
  const at = { x: from.x + (head.x - from.x) * 0.42, y: from.y + (head.y - from.y) * 0.42 };
  const deg = (Math.atan2(head.y - from.y, head.x - from.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${f2(at.x)} ${f2(at.y)}) rotate(${f2(deg)})`}>
      <rect x={-R * 0.12} y={-R * 0.62} width={R * 0.24} height={R * 1.24} rx={R * 0.12} fill={color} />
      <circle cx={R * 0.02} cy={R * 0.66} r={R * 0.1} fill={shade(color, -0.1)} />
    </g>
  );
};

/**
 * A four-legged shape figure on the quadruped joints (`shape/quadruped.ts`): a capsule body from
 * rear hip to front shoulder, four tube legs with paws, the tail at the rump and the same head as
 * the biped. Far legs a tone darker behind the body; the near legs, body, tail and head are one
 * soft silhouette (`Soft`), and the near front leg casts a shadow on the body instead of an outline.
 */
export const QuadRig: React.FC<RigProps & { shape: Shape }> = ({ character, shape, joints: j, metrics: m, face, blink, frame, symbolsSince, symbolAges, props, mirrored = false, fontFamily = "sans-serif" }) => {
  const clipId = "qb" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const look = lookOf(shape);
  const bm = shapeBuildMetrics(shape);
  const bh = bm.bodyWidth * m.heightPx;
  const limbW = bm.limb * m.heightPx;
  const R = m.headR;
  const angle = (Math.atan2(j.shoulder.y - j.hip.y, j.shoulder.x - j.hip.x) * 180) / Math.PI;
  const bl = Math.hypot(j.shoulder.x - j.hip.x, j.shoulder.y - j.hip.y);
  const c = mid(j.hip, j.shoulder);
  const bodyT = `translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(angle)})`;
  const rx = bl / 2 + bh * 0.42;
  const ry = bh / 2;
  // The body sits on top of the leg roots.
  const lift = -bh * 0.18;
  const rounded = shape.body.kind === "bean" || shape.body.kind === "block";
  const bodyShape = rounded ? (
    <rect x={-rx} y={lift - ry} width={rx * 2} height={ry * 2} rx={shape.body.kind === "block" ? ry * 0.5 : ry} />
  ) : (
    <ellipse cx={0} cy={lift} rx={rx} ry={ry * (shape.body.kind === "barrel" ? 1.08 : 1)} />
  );
  const footRx = Math.max(m.footRx, limbW * 0.75);
  const footRy = Math.max(m.footRy, limbW * 0.4);
  const paw = (at: Vec2, back: boolean, front: boolean) => (
    <ellipse cx={at.x + (front ? m.footRx * 0.45 : 0)} cy={at.y + (front ? m.footRy * 0.35 : 0) + m.footRy - footRy} rx={footRx} ry={footRy} fill={back ? backTone(look.feet) : look.feet} />
  );
  const figurePx = m.heightPx / proportionsOf(character).height;
  const propCommon = { figurePx, stroke: look.ink, sw: 0, mirrored, fontFamily };
  const held = (s: "L" | "R") => {
    const h = props.held[s];
    if (!h) return null;
    const hand = s === "L" ? j.handL : j.handR;
    const elbow = s === "L" ? j.elbowL : j.elbowR;
    return <PropView def={h.def} x={hand.x} y={hand.y} angle={propAngle(h.def, elbow, hand)} scale={h.pop} {...propCommon} sw={propLine(h.def)} />;
  };
  const far = backTone(look.limbs);
  const legRoot = (v: Vec2, back: boolean) => ({ x: v.x + (back ? bh * 0.12 : -bh * 0.08), y: v.y });
  const { spots, stripes } = look.marks;
  const tail = (
    <g transform={`translate(${f2(j.hip.x)} ${f2(j.hip.y)}) rotate(${f2(angle)}) translate(${f2(-bh * 0.05)} ${f2(lift - ry * 0.25)})`}>
      <Tail T={bh} W={bh} look={look} frame={frame} />
    </g>
  );
  const headT = `translate(${f2(j.head.x)} ${f2(j.head.y)}) rotate(${f2(j.headTilt)})`;
  const headProps = { R, look, face, blink, frame, symbolsSince, symbolAges, mirrored, seed: character.id };
  const frontRoot = legRoot(j.shoulder, false);
  // Body space → figure space, nudged down and back: where the near front leg's shadow falls.
  const toWorld = (x: number, y: number): Vec2 => {
    const a = (angle * Math.PI) / 180;
    return { x: c.x + x * Math.cos(a) - y * Math.sin(a), y: c.y + x * Math.sin(a) + y * Math.cos(a) };
  };
  const toFigure = `rotate(${f2(-angle)}) translate(${f2(-c.x - limbW * 0.25)} ${f2(-c.y + limbW * 0.2)})`;
  return (
    <g>
      <GroundShadow cx={c.x} rx={rx * 1.05} />
      <Soft r={limbW * 0.3} color={far}>
        <Leg root={frontRoot} joint={j.elbowL} tip={j.handL} w={limbW} fill={far} />
        {paw(j.handL, true, true)}
        <Leg root={legRoot(j.hip, true)} joint={j.kneeL} tip={j.ankleL} w={limbW} fill={far} />
        {paw(j.footL, true, false)}
      </Soft>
      <Soft r={limbW * 0.3} color={look.body}>
        {tail}
        <g transform={headT}>
          <ShapeHeadBack R={R} look={look} frame={frame} />
        </g>
        <Leg root={legRoot(j.hip, true)} joint={j.kneeR} tip={j.ankleR} w={limbW} fill={look.limbs} />
        {paw(j.footR, false, false)}
        <g transform={bodyT}>
          <g fill={look.body}>{bodyShape}</g>
          <clipPath id={clipId}>{bodyShape}</clipPath>
          <g clipPath={`url(#${clipId})`}>
            {look.belly ? <ellipse cx={0} cy={lift + ry * 0.85} rx={rx * 0.7} ry={ry * 0.5} fill={look.belly} /> : null}
            {spots ? (
              <g fill={spots}>
                <circle cx={-rx * 0.4} cy={lift - ry * 0.3} r={ry * 0.25} />
                <circle cx={rx * 0.15} cy={lift - ry * 0.45} r={ry * 0.18} />
                <circle cx={rx * 0.45} cy={lift + ry * 0.05} r={ry * 0.2} />
              </g>
            ) : null}
            {stripes ? (
              <g fill={stripes}>
                {[-0.45, -0.1, 0.25].map((k) => (
                  <rect key={k} x={rx * k} y={lift - ry * 2} width={rx * 0.12} height={ry * 4} />
                ))}
              </g>
            ) : null}
            <g transform={toFigure}>
              <Leg root={frontRoot} joint={j.elbowR} tip={j.handR} w={limbW * 1.05} fill={castTone(look.body)} />
            </g>
          </g>
        </g>
        <g transform={bodyT}>
          {look.details.backpack ? <rect x={-rx * 0.35} y={lift - ry * 1.25} width={rx * 0.6} height={ry * 0.6} rx={ry * 0.2} fill={look.details.backpack} /> : null}
  
        </g>
        {look.details.scarf ? <Collar from={toWorld(rx * 0.72, lift - ry * 0.55)} head={j.head} R={R} color={look.details.scarf} /> : null}
        <CelPart mirrored={mirrored}>
          <g transform={headT}>
            <ShapeHead {...headProps} withSymbols={false} />
          </g>
        </CelPart>
        <CelPart mirrored={mirrored}>
          <Leg root={frontRoot} joint={j.elbowR} tip={j.handR} w={limbW} fill={look.limbs} />
          {paw(j.handR, false, true)}
        </CelPart>
      </Soft>
      <g transform={headT}>
        <ShapeHeadSymbols {...headProps} />
      </g>
      {held("R")}
      {held("L")}
      {props.dropped.map((d, i) => (
        <PropView key={i} def={d.def} x={d.x} y={d.y} angle={d.angle} {...propCommon} sw={propLine(d.def)} />
      ))}
    </g>
  );
};
