import React from "react";
import { subtitleSpec } from "../text/layout";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { Finish } from "../shots/finishKinds";
import { Stage } from "../shots/Stage";
import { CastLabels } from "../text/CastLabels";
import { CardText, ListText } from "../text/ExplainerText";
import { PovCard } from "../text/PovCard";
import type { SafeArea } from "../text/safeArea";
import { SlamText } from "../text/SlamText";
import { CreditLine } from "../text/CreditLine";
import { Subtitles } from "../text/Subtitles";
import { VerdictMeter } from "../text/VerdictMeter";
import { cameraAt, shotAt } from "./camera";
import { stageActorsAt } from "./placement";
import { QaOverlay } from "./QaOverlay";
import type { Timeline } from "./timeline";

const FACE_FRAMINGS: readonly string[] = ["medium", "close", "extreme"];

export type SkitProps = {
  timeline: Timeline;
  lib: Library;
  set: SetDef;
  safeArea: SafeArea;
  fontFamily: string;
  /** Debug overlay: beat, shot reason, frame. */
  showLabels?: boolean;
  /** `false`: mount no dialog or SFX audio (a preview on placeholder timings has no files). Default true. */
  audio?: boolean;
  /** Stage finish (the program's `finish`). */
  finish?: Finish;
};

/** Renders a compiled skit: stage under the director's camera, dialog + SFX audio, text overlays. */
export const Skit: React.FC<SkitProps> = ({ timeline: tl, lib, set, safeArea, fontFamily, showLabels, audio = true, finish }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = tl;
  const actors = stageActorsAt(lib, tl.cast, set, frame, fps, W);
  const camera = cameraAt(tl, frame);
  const slamUp = tl.slams.some((s) => frame >= s.from - 4 && frame < s.to);
  // The POV card sits where a face close-up puts the head, so it steps aside on face shots.
  const faceShot = FACE_FRAMINGS.includes(shotAt(tl, frame).framing);
  const direction = tl.direction ?? "ltr";
  // Credits up at once share one line (an image credit and a data source, two charts side by side).
  const credits = [...new Set((tl.credits ?? []).filter((c) => frame >= c.from && frame < c.to).map((c) => c.text))];
  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      <Stage set={set} actors={actors} width={W} height={H} frame={frame} camera={camera} fontFamily={fontFamily} labels={tl.labels} figures={tl.figures} fps={fps} finish={finish} />
      {audio && tl.audio.map((a) => (
        <Sequence key={`v-${a.beatId}`} from={a.frame} durationInFrames={a.durationFrames} layout="none">
          <Html5Audio src={staticFile(a.src)} />
        </Sequence>
      ))}
      {audio && tl.sfx.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={s.frame} durationInFrames={s.durationFrames} layout="none">
          <Html5Audio src={staticFile(s.src)} volume={() => s.volume} />
        </Sequence>
      ))}
      <CastLabels
        actors={actors.map((a) => ({ ...a, label: tl.cast.find((c) => c.id === a.id)?.label }))}
        camera={camera}
        width={W}
        height={H}
        groundY={set.groundY}
        minY={safeArea.top * H}
        fontFamily={fontFamily}
      />
      {tl.pov && !faceShot ? <PovCard text={tl.pov.text} frame={frame} from={tl.pov.from} to={tl.pov.to} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} direction={direction} /> : null}
      {tl.card ? <CardText card={tl.card} title={tl.card.lines.join("\n")} frame={frame} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} direction={direction} /> : null}
      {tl.lists.map((l, i) => (
        <ListText key={`list-${i}`} list={l} frame={frame} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} direction={direction} />
      ))}
      {tl.verdict ? <VerdictMeter verdict={tl.verdict} frame={frame} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} /> : null}
      <Subtitles hidden={slamUp} {...subtitleSpec(tl.directing)} pages={tl.pages} frame={frame} fps={fps} width={W} height={H} safeArea={safeArea} style={{ fontFamily }} narratorStyle={tl.narratorCaption} direction={tl.direction} />
      {tl.slams.map((s, i) => (
        <SlamText key={i} seed={`${tl.title}-${i}`} text={s.text} frame={frame} from={s.from} to={s.to} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} direction={direction} />
      ))}
      {credits.length ? <CreditLine text={credits.join(" · ")} width={W} height={H} safeArea={safeArea} fontFamily={fontFamily} /> : null}
      {showLabels ? <QaOverlay tl={tl} lib={lib} set={set} safeArea={safeArea} camera={camera} frame={frame} /> : null}
      {showLabels ? <SkitLabel tl={tl} frame={frame} /> : null}
    </AbsoluteFill>
  );
};

const SkitLabel: React.FC<{ tl: Timeline; frame: number }> = ({ tl, frame }) => {
  const beat = [...tl.beats].reverse().find((b) => b.from <= frame);
  const shot = shotAt(tl, frame);
  const punch = tl.punchIns.find((p) => p.frame <= frame && frame < p.frame + 30);
  const text = [
    `f${frame}  ${beat ? `${beat.id} (${beat.kind}${beat.punchline ? ", punchline" : ""})` : "lead-in"}`,
    `shot ${shot.framing}${shot.on ? ` on ${shot.on}` : ""}: ${shot.reason}${punch ? `  + punch-in ${punch.on}` : ""}`,
  ].join("\n");
  return (
    <div style={{ position: "absolute", left: 30, bottom: 40, color: "#fff", background: "#000b", font: "600 28px Menlo, monospace", padding: "8px 14px", borderRadius: 8, whiteSpace: "pre" }}>
      {text}
    </div>
  );
};
