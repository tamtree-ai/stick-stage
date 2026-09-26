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
import { calculateContactSheetMetadata, ContactSheet, contactSheetSchema } from "./ContactSheet";

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
