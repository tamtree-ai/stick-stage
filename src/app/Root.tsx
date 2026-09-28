import React from "react";
import { Composition, Still } from "remotion";
import { CHARACTER_LAB_FRAMES, CharacterLab, characterLabSchema } from "./labs/CharacterLab";
import { FACE_LAB_FRAMES, FaceLab, faceLabSchema } from "./labs/FaceLab";
import { PoseLab, poseLabSchema } from "./labs/PoseLab";
import {
  CLOSEUP_LAB_FRAMES,
  CloseupLab,
  closeupLabSchema,
  CloseupSheet,
  closeupSheetSchema,
  closeupSheetSize,
} from "./labs/CloseupLab";
import { TalkLab } from "./labs/TalkLab";
import { calculateTalkLabMetadata, talkLabSchema } from "./talk/talkData";
import { SetLab, setLabSchema, setLabSize } from "./labs/SetLab";
import { PROP_LAB_FRAMES, PropLab, propLabSchema } from "./labs/PropLab";
import { STAGING_LAB_FRAMES, StagingLab, stagingLabSchema } from "./labs/StagingLab";
import { calculateContactSheetMetadata, ContactSheet, contactSheetSchema } from "../engine";
import { CoverStill, ThumbnailStill } from "./skit/Cover";
import { SkitComposition } from "./skit/SkitComposition";
import { calculateSkitMetadata, skitCompositionSchema } from "./skit/skitData";
import { SFX_LAB_FRAMES, SfxLab } from "./labs/SfxLab";
import { SafeAreaLab, safeAreaLabSchema } from "./labs/SafeAreaLab";

const FPS = 30;
const W = 1080;
const H = 1920;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CharacterLab"
      component={CharacterLab}
      schema={characterLabSchema}
      defaultProps={{ set: "living-1", left: "milo", right: "june", showLabels: true }}
      durationInFrames={CHARACTER_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="CharacterLabClean"
      component={CharacterLab}
      schema={characterLabSchema}
      defaultProps={{ set: "living-1", left: "milo", right: "june", showLabels: false }}
      durationInFrames={CHARACTER_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="FaceLab"
      component={FaceLab}
      schema={faceLabSchema}
      defaultProps={{ set: "living-1", left: "milo", right: "june", showLabels: true }}
      durationInFrames={FACE_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="CloseupLab"
      component={CloseupLab}
      schema={closeupLabSchema}
      defaultProps={{ set: "living-1", left: "milo", right: "june", showLabels: true }}
      durationInFrames={CLOSEUP_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="CloseupLabClean"
      component={CloseupLab}
      schema={closeupLabSchema}
      defaultProps={{ set: "living-1", left: "milo", right: "june", showLabels: false }}
      durationInFrames={CLOSEUP_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Still
      id="CloseupSheet"
      component={CloseupSheet}
      schema={closeupSheetSchema}
      defaultProps={{ set: "living-1", characters: ["milo", "june"], framing: "extreme" as const }}
      calculateMetadata={({ props }) => closeupSheetSize(props.characters.length)}
      {...closeupSheetSize(2)}
    />
    <Still
      id="CloseupSheetClose"
      component={CloseupSheet}
      schema={closeupSheetSchema}
      defaultProps={{ set: "living-1", characters: ["milo", "june"], framing: "close" as const }}
      calculateMetadata={({ props }) => closeupSheetSize(props.characters.length)}
      {...closeupSheetSize(2)}
    />
    <Composition
      id="TalkLab"
      component={TalkLab}
      schema={talkLabSchema}
      defaultProps={{ skit: "talklab", character: "milo", showLabels: true }}
      calculateMetadata={calculateTalkLabMetadata}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="TalkLabClean"
      component={TalkLab}
      schema={talkLabSchema}
      defaultProps={{ skit: "talklab", character: "milo", showLabels: false }}
      calculateMetadata={calculateTalkLabMetadata}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="PoseLab"
      component={PoseLab}
      schema={poseLabSchema}
      defaultProps={{ character: "milo", expression: "neutral" }}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="PoseLabJune"
      component={PoseLab}
      schema={poseLabSchema}
      defaultProps={{ character: "june", expression: "neutral" }}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="StagingLab"
      component={StagingLab}
      schema={stagingLabSchema}
      defaultProps={{ showLabels: true, left: "milo", right: "june" }}
      durationInFrames={STAGING_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="StagingLabClean"
      component={StagingLab}
      schema={stagingLabSchema}
      defaultProps={{ showLabels: false, left: "milo", right: "june" }}
      durationInFrames={STAGING_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="PropLab"
      component={PropLab}
      schema={propLabSchema}
      defaultProps={{ set: "plain-1", showLabels: true }}
      durationInFrames={PROP_LAB_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Still
      id="SetLab"
      component={SetLab}
      schema={setLabSchema}
      defaultProps={{ kits: [] as string[], tileWidth: 200 }}
      calculateMetadata={({ props }) => setLabSize(props)}
      {...setLabSize({ kits: [], tileWidth: 200 })}
    />
    {/* A skit from public/skits/<skit>/skit.json. `pnpm render <skitId>` sets the prop. */}
    <Composition
      id="Skit"
      component={SkitComposition}
      schema={skitCompositionSchema}
      defaultProps={{ skit: "fine", showLabels: false }}
      calculateMetadata={calculateSkitMetadata}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="SkitDebug"
      component={SkitComposition}
      schema={skitCompositionSchema}
      defaultProps={{ skit: "fine", showLabels: true }}
      calculateMetadata={calculateSkitMetadata}
      durationInFrames={FPS}
      fps={FPS}
      width={W}
      height={H}
    />
    <Still
      id="Cover"
      component={CoverStill}
      schema={skitCompositionSchema}
      defaultProps={{ skit: "fine", showLabels: false }}
      calculateMetadata={async (args) => ({ ...(await calculateSkitMetadata(args)), durationInFrames: 1 })}
      width={1080}
      height={1920}
    />
    <Still
      id="Thumbnail"
      component={ThumbnailStill}
      schema={skitCompositionSchema}
      defaultProps={{ skit: "fine", showLabels: false }}
      calculateMetadata={async (args) => ({ ...(await calculateSkitMetadata(args)), durationInFrames: 1, width: 1280, height: 720 })}
      width={1280}
      height={720}
    />
    <Composition id="SfxLab" component={SfxLab} durationInFrames={SFX_LAB_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="SafeAreaLab" component={SafeAreaLab} schema={safeAreaLabSchema} defaultProps={{}} durationInFrames={1} fps={FPS} width={W} height={H} />
    <Still
      id="ContactSheet"
      component={ContactSheet}
      schema={contactSheetSchema}
      defaultProps={{ title: "", tiles: [], cols: 6, tileWidth: 270, tileHeight: 480 }}
      calculateMetadata={calculateContactSheetMetadata}
      width={W}
      height={H}
    />
  </>
);
