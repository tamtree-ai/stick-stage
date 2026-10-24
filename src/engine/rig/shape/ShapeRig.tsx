import React from "react";
import { add, f2, lerpVec, sub, type Vec2 } from "../../lib/math";
import { PropView } from "../../props/PropView";
import { propAngle } from "../../props/track";
import { torsoFrame } from "../accessoryKit";
import { proportionsOf } from "../build";
import { limbControl, limbPath } from "../limbs";
import type { RigProps } from "../Rig";
import { Tail, Torso } from "./body";
import { DetailsBehind } from "./details";
import { ShapeHead, ShapeHeadBack } from "./face";
import { QuadRig } from "./QuadRig";
import { backTone, lookOf, propLine } from "./look";
import { edgeTone } from "./palette";
import { shapeBuildMetrics } from "./proportions";
import type { Shape } from "./schema";

/** Rubber-hose bow of shape limbs. */
const LIMB_CURVE = 0.3;
/** Where the arms leave the body, up the torso from the hip; the skeleton's shoulder sits under the chin. */
const SHOULDER_AT = 0.76;

const Limb: React.FC<{ root: Vec2; joint: Vec2; tip: Vec2; side: 1 | -1; w: number; fill: string; edge?: string }> = ({ root, joint, tip, side, w, fill, edge }) => {
  const d = limbPath(root, limbControl(root, joint, tip, LIMB_CURVE, side), tip);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {edge ? <path d={d} stroke={edge} strokeWidth={w * 1.16} /> : null}
      <path d={d} stroke={fill} strokeWidth={w} />
    </g>
  );
};

/**
 * One shape figure in figure space, on the stick rig's joints. Flat fills, no outlines: the far
 * limbs are a tone darker and the near arm carries a thin darker edge so it reads over a body
 * of the same colour. Draw order: tail, backpack, far ears, far arm, legs, torso, head, near
 * arm, held props.
 */
export const ShapeRig: React.FC<RigProps & { shape: Shape }> = (p) => (p.shape.plan === "quadruped" ? <QuadRig {...p} /> : <BipedRig {...p} />);

const BipedRig: React.FC<RigProps & { shape: Shape }> = ({
  character,
  shape,
  joints: j,
  metrics: m,
  face,
  blink,
  frame,
  symbolsSince,
  symbolAges,
  props,
  mirrored = false,
  fontFamily = "sans-serif",
}) => {
  const look = lookOf(shape);
  const bm = shapeBuildMetrics(shape);
  const W = bm.bodyWidth * m.heightPx;
  const limbW = bm.limb * m.heightPx;
  const R = m.headR;
  const { len: T, angle } = torsoFrame(j.hip, j.neck);
  const torsoTransform = `translate(${f2(j.hip.x)} ${f2(j.hip.y)}) rotate(${f2(angle)})`;
  const headTransform = `translate(${f2(j.head.x)} ${f2(j.head.y)}) rotate(${f2(j.headTilt)})`;
  const figurePx = m.heightPx / proportionsOf(character).height;
  const propCommon = { figurePx, stroke: look.ink, sw: 0, mirrored, fontFamily };

  // The whole arm moves down with the shoulder, so its lengths and angles stay the skeleton's.
  const drop = sub(lerpVec(j.hip, j.neck, SHOULDER_AT), j.shoulder);
  const shoulder = add(j.shoulder, drop);
  const at = (v: Vec2) => add(v, drop);
  const held = (s: "L" | "R") => {
    const h = props.held[s];
    if (!h) return null;
    const hand = at(s === "L" ? j.handL : j.handR);
    const elbow = at(s === "L" ? j.elbowL : j.elbowR);
    return <PropView def={h.def} x={hand.x} y={hand.y} angle={propAngle(h.def, elbow, hand)} scale={h.pop} {...propCommon} sw={propLine(h.def)} />;
  };
  const arm = (s: "L" | "R") => {
    const back = s === "L";
    const hand = at(back ? j.handL : j.handR);
    return (
      <g key={`arm${s}`}>
        <Limb
          root={shoulder}
          joint={at(back ? j.elbowL : j.elbowR)}
          tip={hand}
          side={-1}
          w={limbW}
          fill={back ? backTone(look.limbs) : look.limbs}
          edge={back ? undefined : edgeTone(look.body)}
        />
        {held(s)}
        <circle cx={hand.x} cy={hand.y} r={limbW * 0.62} fill={back ? backTone(look.hands) : look.hands} />
      </g>
    );
  };
  const footRx = Math.max(m.footRx, limbW * 0.85);
  const footRy = Math.max(m.footRy, limbW * 0.45);
  const leg = (s: "L" | "R") => {
    const back = s === "L";
    const foot = back ? j.footL : j.footR;
    return (
      <g key={`leg${s}`}>
        <Limb root={j.hip} joint={back ? j.kneeL : j.kneeR} tip={back ? j.ankleL : j.ankleR} side={1} w={limbW} fill={back ? backTone(look.limbs) : look.limbs} />
        <ellipse cx={foot.x} cy={foot.y + m.footRy - footRy} rx={footRx} ry={footRy} fill={back ? backTone(look.feet) : look.feet} />
      </g>
    );
  };

  return (
    <g>
      <g transform={torsoTransform}>
        <Tail T={T} W={W} look={look} frame={frame} />
        <DetailsBehind T={T} W={W} look={look} />
      </g>
      <g transform={headTransform}>
        <ShapeHeadBack R={R} look={look} frame={frame} />
      </g>
      {arm("L")}
      {leg("L")}
      {leg("R")}
      <g transform={torsoTransform}>
        <Torso T={T} W={W} look={look} />
      </g>
      <g transform={headTransform}>
        <ShapeHead
          R={R}
          look={look}
          face={face}
          blink={blink}
          frame={frame}
          symbolsSince={symbolsSince}
          symbolAges={symbolAges}
          mirrored={mirrored}
          seed={character.id}
        />
      </g>
      {arm("R")}
      {props.dropped.map((d, i) => (
        <PropView key={i} def={d.def} x={d.x} y={d.y} angle={d.angle} {...propCommon} sw={propLine(d.def)} />
      ))}
    </g>
  );
};
