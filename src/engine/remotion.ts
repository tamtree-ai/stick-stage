/**
 * `stickstage/remotion`: the React / Remotion side. The consumer registers compositions with
 * these (StickStage never registers a root itself) and supplies registries and an asset loader
 * through `calculateStickStageMetadata`.
 */
export { Actor } from "./rig/Actor";
export { Rig } from "./rig/Rig";
export { accessoryIds } from "./rig/accessories";
export { Face } from "./face/Face";
export { PropView } from "./props/PropView";
export { PROP_DRAW, type PropDrawProps } from "./props/draw";
export { SetLayers } from "./set/Set";
export { PARTS, PART_INFO, KITS, KIT_BACKDROP, type Kit, type PartInfo } from "./set/parts/registry";
export { SEAT_HEIGHT, SEAT_PARTS } from "./set/parts/seats";
export { Stage, FULL_FRAME, type Camera, type StageActor, type StageProps } from "./shots/Stage";
export { Subtitles, type SubtitlesProps, type TextStyle } from "./text/Subtitles";
export { PovCard } from "./text/PovCard";
export { SlamText } from "./text/SlamText";
export { CastLabels } from "./text/CastLabels";
export { Skit, type SkitProps } from "./director/Skit";
export { SkitProgram, SkitProgram as StickStageComposition, type SkitProgramProps } from "./director/Program";
export { QaOverlay } from "./director/QaOverlay";
export * from "./director/metadata";
export * from "./sheet/ContactSheet";
