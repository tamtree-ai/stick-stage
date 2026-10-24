import React, { useId } from "react";
import { add, f2, lerpVec, sub, type Vec2 } from "../../lib/math";
import { PropView } from "../../props/PropView";
import { propAngle } from "../../props/track";
import { torsoFrame } from "../accessoryKit";
import { proportionsOf } from "../build";
import { limbControl, limbPath } from "../limbs";
import type { RigProps } from "../Rig";
import { Tail, Torso, torsoPath } from "./body";
import { DetailsBehind, DetailsOnBody } from "./details";
import { ShapeHead, ShapeHeadBack, ShapeHeadSymbols } from "./face";
import { QuadRig } from "./QuadRig";
import { backTone, lookOf, propLine } from "./look";
import { castTone, edgeTone } from "./palette";
import { GroundShadow, Soft } from "./soft";
import { shapeBuildMetrics } from "./proportions";
import type { Shape } from "./schema";

/** Rubber-hose bow of shape limbs. */
const LIMB_CURVE = 0.3;
/** Where the arms leave the body, up the torso from the hip; the skeleton's shoulder sits under the chin. */
const SHOULDER_AT = 0.76;

const Limb: React.FC<{ root: Vec2; joint: Vec2; tip: Vec2; side: 1 | -1; w: number; fill: string }> = ({ root, joint, tip, side, w, fill }) => (
  <path d={limbPath(root, limbControl(root, joint, tip, LIMB_CURVE, side), tip)} fill="none" stroke={fill} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);

/** A wing: a tapered leaf from the shoulder to the tip, flapping with the arm angles. */
const Wing: React.FC<{ root: Vec2; tip: Vec2; w: number; fill: string; held: React.ReactNode }> = ({ root, tip, w, fill, held }) => {
  const dx = tip.x - root.x;
  const dy = tip.y - root.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  const d = `M${f2(root.x)},${f2(root.y)} Q${f2(root.x + dx * 0.5 + nx)},${f2(root.y + dy * 0.5 + ny)} ${f2(tip.x)},${f2(tip.y)} Q${f2(root.x + dx * 0.4 - nx * 0.3)},${f2(root.y + dy * 0.4 - ny * 0.3)} ${f2(root.x)},${f2(root.y)} Z`;
  return (
    <g>
      <path d={d} fill={fill} />
      {held}
    </g>
  );
};

/**
 * One shape figure in figure space, on the stick rig's joints. Flat fills, no outlines: the far
 * limbs are a hue-shifted tone darker, and the near arm casts a soft shadow on the body so it
 * reads over a body of the same colour. Tail, ears, legs, torso and head are one soft
 * silhouette (`Soft`), so they flow into each other. Draw order: ground shadow, far arm,
 * backpack, the silhouette, the near arm and its shadow, held props, emanata.
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
  const clipId = "sha" + useId().replace(/[^a-zA-Z0-9]/g, "");
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
    if (shape.arms === "none") return <g key={`arm${s}`}>{held(s)}</g>;
    if (shape.arms === "wings") {
      // Longer than the arm and a shade darker, so the near wing reads over a body of the same colour.
      const tip = add(shoulder, { x: (hand.x - shoulder.x) * 1.35, y: (hand.y - shoulder.y) * 1.35 });
      return <Wing key={`arm${s}`} root={shoulder} tip={tip} w={limbW * 2.4} fill={back ? backTone(look.limbs) : edgeTone(look.limbs)} held={held(s)} />;
    }
    const joint = at(back ? j.elbowL : j.elbowR);
    return (
      <g key={`arm${s}`}>
        {back ? null : (
          // The near arm's shadow on the body: the arm nudged down and back, clipped to the torso.
          <g transform={torsoTransform}>
            <g clipPath={`url(#${clipId})`}>
              <g transform={`rotate(${f2(-angle)}) translate(${f2(-j.hip.x - limbW * 0.22)} ${f2(-j.hip.y + limbW * 0.28)})`}>
                <Limb root={shoulder} joint={joint} tip={hand} side={-1} w={limbW * 1.05} fill={castTone(look.body)} />
                <circle cx={hand.x} cy={hand.y} r={limbW * 0.66} fill={castTone(look.body)} />
              </g>
            </g>
          </g>
        )}
        <Limb root={shoulder} joint={joint} tip={hand} side={-1} w={limbW} fill={back ? backTone(look.limbs) : look.limbs} />
        {held(s)}
        <circle cx={hand.x} cy={hand.y} r={limbW * 0.62} fill={back ? backTone(look.hands) : look.hands} />
      </g>
    );
  };
  const footRx = Math.max(m.footRx, limbW * 0.85);
  const footRy = Math.max(m.footRy, limbW * 0.45);
  const leg = (s: "L" | "R") => {
    const back = s === "L";
    if (shape.legs === "none") return null;
    const foot = back ? j.footL : j.footR;
    return (
      <g key={`leg${s}`}>
        <Limb root={j.hip} joint={back ? j.kneeL : j.kneeR} tip={back ? j.ankleL : j.ankleR} side={1} w={limbW} fill={back ? backTone(look.limbs) : look.limbs} />
        <ellipse cx={foot.x} cy={foot.y + m.footRy - footRy} rx={footRx} ry={footRy} fill={back ? backTone(look.feet) : look.feet} />
      </g>
    );
  };

  const headProps = { R, look, face, blink, frame, symbolsSince, symbolAges, mirrored, seed: character.id };
  return (
    <g>
      <GroundShadow cx={j.hip.x} rx={W * 0.62} />
      <defs>
        <clipPath id={clipId}>
          <path d={torsoPath(look.s.body.kind, T, W)} />
        </clipPath>
      </defs>
      {arm("L")}
      <g transform={torsoTransform}>
        <DetailsBehind T={T} W={W} look={look} />
      </g>
      <Soft r={limbW * 0.3}>
        <g transform={torsoTransform}>
          <Tail T={T} W={W} look={look} frame={frame} />
        </g>
        <g transform={headTransform}>
          <ShapeHeadBack R={R} look={look} frame={frame} />
        </g>
        {leg("L")}
        {leg("R")}
        <g transform={torsoTransform}>
          <Torso T={T} W={W} look={look} details={false} />
        </g>
        <g transform={headTransform}>
          <ShapeHead {...headProps} withSymbols={false} />
        </g>
      </Soft>
      <g transform={torsoTransform}>
        <DetailsOnBody T={T} W={W} look={look} />
      </g>
      <g transform={headTransform}>
        <ShapeHeadSymbols {...headProps} />
      </g>
      {arm("R")}
      {props.dropped.map((d, i) => (
        <PropView key={i} def={d.def} x={d.x} y={d.y} angle={d.angle} {...propCommon} sw={propLine(d.def)} />
      ))}
    </g>
  );
};
