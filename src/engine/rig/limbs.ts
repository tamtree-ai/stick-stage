import { add, f2, len, mid, normal, scale, sub, type Vec2 } from "../lib/math";

/**
 * Rubber-hose limb: one quadratic Bézier from root to tip, bowed through the joint so
 * the elbow/knee never shows as a corner. `curve` adds a constant bow even when straight;
 * `side` picks the bow direction when the limb is straight (+1 = counter-clockwise normal).
 */
export const limbControl = (
  root: Vec2,
  joint: Vec2,
  tip: Vec2,
  curve: number,
  side: 1 | -1,
): Vec2 => {
  const m = mid(root, tip);
  const span = len(sub(tip, root));
  const toJoint = sub(joint, m);
  const n = normal(root, tip);
  // Bow toward whichever side the joint already bends, else toward `side`.
  const dot = toJoint.x * n.x + toJoint.y * n.y;
  const bowSide = Math.abs(dot) > span * 0.02 ? Math.sign(dot) : side;
  // A quadratic passes halfway between the chord midpoint and its control point.
  // Pushing the control 0.55× past the joint rounds sharp bends instead of looping them.
  const through = add(joint, scale(toJoint, 0.55));
  return add(through, scale(n, bowSide * curve * span * 0.14));
};

export const limbPath = (root: Vec2, control: Vec2, tip: Vec2): string =>
  `M ${f2(root.x)} ${f2(root.y)} Q ${f2(control.x)} ${f2(control.y)} ${f2(tip.x)} ${f2(tip.y)}`;
