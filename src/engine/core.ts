/**
 * `stickstage` (package root): the pure core. Types, schemas, the compiler, diagnostics, QA,
 * templates, math and registries. No React, no Node APIs, no side effects on import.
 * React components are in `stickstage/remotion`, Node adapters in `stickstage/node`.
 */
export * from "./lib/math";
export * from "./lib/easing";
export * from "./lib/color";
export * from "./lib/seed";
export * from "./rig/schema";
export * from "./rig/skeleton";
export * from "./rig/pose";
export * from "./rig/idle";
export * from "./rig/limbs";
export * from "./rig/actorState";
export * from "./rig/seat";
export * from "./rig/gait";
export * from "./props/schema";
export * from "./props/track";
export * from "./props/bounds";
export * from "./face/schema";
export * from "./face/mouths";
export * from "./face/expressions";
export * from "./face/visemes";
export * from "./voice/schema";
export * from "./voice/words";
export * from "./voice/placeholder";
export * from "./text/captions";
export * from "./text/safeArea";
export * from "./text/layout";
export * from "./set/schema";
export * from "./set/palettes";
export * from "./set/seating";
export * from "./set/catalog";
export * from "./catalog";
export * from "./draft";
export * from "./shots/framing";
export type { Camera, StageActor } from "./shots/Stage";
export * from "./director/schema";
export * from "./director/diagnostics";
export * from "./director/anchors";
export * from "./director/timeline";
export * from "./director/layout";
export * from "./director/placement";
export * from "./director/moves";
export * from "./director/tracks";
export * from "./director/shots";
export * from "./director/camera";
export * from "./director/scene";
export * from "./director/compile";
export * from "./director/post";
export * from "./qa";
export * from "./templates";
export * from "./migrate";
export * from "./library";
