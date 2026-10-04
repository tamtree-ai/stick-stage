import React from "react";
import { add, f2, lerpVec, type Vec2 } from "../../lib/math";
import { PropView } from "../../props/PropView";
import { propAngle } from "../../props/track";
import { torsoFrame } from "../accessoryKit";
import { proportionsOf } from "../build";
import type { RigProps } from "../Rig";
import { Torso } from "./clothes";
import { ToonHead } from "./face";
import { HairBack } from "./head";
import { makePen, polyline, Tube } from "./kit";
import { Arm, Leg } from "./limbs";
import type { Toon } from "./schema";
import { Shoe, SOLE_DROP } from "./shoes";

/**
 * One toon figure in figure space, on the same joints as the stick rig. Draw order: long hair,
 * back arm, legs and shoes, neck, torso clothes, head, front arm, held prop, front hand.
 */
export const ToonRig: React.FC<RigProps & { toon: Toon }> = ({
  character,
  toon,
  joints: j,
  metrics: m,
  face,
  blink,
  frame,
  symbolsSince,
  symbolAges,
  props,
  hands = {},
  mirrored = false,
  fontFamily = "sans-serif",
}) => {
  const P = proportionsOf(character);
  const figurePx = m.heightPx / P.height;
  const pen = makePen(toon, figurePx);
  const u = pen.u;
  const R = m.headR / u;
  const { len, angle } = torsoFrame(j.hip, j.neck);
  const rad = (angle * Math.PI) / 180;
  // A point `dx` toon units across the torso and `dy` up it, from `from`.
  const across = (from: Vec2, dx: number, dy = 0): Vec2 => ({
    x: from.x + (dx * Math.cos(rad) + dy * Math.sin(rad)) * u,
    y: from.y + (dx * Math.sin(rad) - dy * Math.cos(rad)) * u,
  });
  const W = toon.body.shoulders;
  const propCommon = { figurePx, stroke: pen.ink, sw: pen.o, mirrored, fontFamily };

  const held = (s: "L" | "R") => {
    const h = props.held[s];
    if (!h) return null;
    const hand = s === "L" ? j.handL : j.handR;
    const elbow = s === "L" ? j.elbowL : j.elbowR;
    return <PropView def={h.def} x={hand.x} y={hand.y} angle={propAngle(h.def, elbow, hand)} scale={h.pop} {...propCommon} />;
  };
  const arm = (s: "L" | "R") => (
    <Arm
      key={`arm${s}`}
      shoulder={across(j.shoulder, s === "L" ? -W * 0.22 : W * 0.2)}
      elbow={s === "L" ? j.elbowL : j.elbowR}
      wrist={s === "L" ? j.handL : j.handR}
      back={s === "L"}
      hand={props.held[s] ? "hold" : (hands[s] ?? "open")}
      between={held(s)}
      pen={pen}
    />
  );
  const leg = (s: "L" | "R") => {
    const foot = s === "L" ? j.footL : j.footR;
    const ankle = s === "L" ? j.ankleL : j.ankleR;
    return (
      <g key={`leg${s}`}>
        <Leg hip={across(j.hip, s === "L" ? -10 : 12)} knee={s === "L" ? j.kneeL : j.kneeR} ankle={ankle} back={s === "L"} pen={pen} />
        <Shoe at={{ x: ankle.x, y: foot.y + m.footRy - SOLE_DROP * u }} back={s === "L"} pen={pen} />
      </g>
    );
  };
  const headTransform = `translate(${f2(j.head.x)} ${f2(j.head.y)}) rotate(${f2(j.headTilt)}) scale(${f2(u)})`;
  const neckTop = lerpVec(j.neck, j.head, Math.max(0.2, 1 - (0.6 * m.headR) / Math.hypot(j.head.x - j.neck.x, j.head.y - j.neck.y)));

  return (
    <g>
      <g transform={headTransform}>
        <HairBack R={R} pen={pen} />
      </g>
      {arm("L")}
      {leg("L")}
      {leg("R")}
      <Tube d={polyline([add(j.neck, { x: 0, y: 6 * u }), neckTop])} w={toon.body.neck * u} fill={toon.skin} pen={pen} />
      <Torso hip={j.hip} angle={angle} T={len / u} thigh={(P.thigh * m.heightPx) / u} knees={[j.kneeL, j.kneeR]} pen={pen} />
      <g transform={headTransform}>
        <ToonHead
          R={R}
          face={face}
          blink={blink}
          pen={pen}
          frame={frame}
          symbolsSince={symbolsSince}
          symbolAges={symbolAges}
          mirrored={mirrored}
          seed={character.id}
        />
      </g>
      {arm("R")}
      {props.dropped.map((d, i) => (
        <PropView key={i} def={d.def} x={d.x} y={d.y} angle={d.angle} {...propCommon} />
      ))}
    </g>
  );
};
