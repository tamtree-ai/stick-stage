import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { evalActor, frameShot, PovCard, SlamText, Stage, Subtitles, type ActorTracks, type StageActor } from "../../engine";
import { library, safeArea, sets } from "../../data";
import { TEXT_FONT } from "../fonts";
import type { TalkLabProps } from "../talk/talkData";
import { Label } from "./Label";

const W = 1080;
const H = 1920;

/**
 * One character delivers the lab script's lines: prepared voice audio, Rhubarb mouths layered
 * on each line's expression, word-timed subtitles, a POV card and slam text. Each line's shot
 * is a locked-off camera framed at the line's first frame (a hard cut between lines).
 */
export const TalkLab: React.FC<TalkLabProps> = ({ character, showLabels, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!timeline) throw new Error("TalkLab: timeline missing (calculateMetadata did not run)");
  const set = sets[timeline.set]!;
  const tracks: ActorTracks = {
    character,
    poseKeys: timeline.poseKeys,
    expressionKeys: timeline.expressionKeys,
    speech: timeline.speech,
  };
  const actorAt = (f: number): StageActor => ({
    id: character,
    x: 0.42,
    facing: "right",
    state: evalActor(library, tracks, f, fps, set.figureHeightPx),
  });
  const actor = actorAt(frame);

  // Current shot: the line playing, else the next one (lead-in), else the last (tail).
  let idx = 0;
  timeline.lines.forEach((l, i) => {
    if (frame >= l.from) idx = i;
  });
  const shotLine = timeline.lines[idx]!;
  const shotStart = idx === 0 ? 0 : shotLine.from;
  const camera = frameShot({ framing: shotLine.shot, on: character }, [actorAt(shotStart)], W, H, set.groundY);

  const speaking = timeline.lines.find((l) => frame >= l.from && frame < l.to);
  const ms = speaking ? ((frame - speaking.from) / fps) * 1000 : -1;
  const cue = speaking?.line.mouthCues.find((c) => ms >= c.startMs && ms < c.endMs);
  const style = { fontFamily: TEXT_FONT };

  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      <Stage set={set} actors={[actor]} width={W} height={H} frame={frame} camera={camera} />
      {timeline.lines.map((l) => (
        <Sequence key={l.line.id} from={l.from} durationInFrames={l.to - l.from + 1} layout="none">
          <Html5Audio src={staticFile(l.line.audio)} />
        </Sequence>
      ))}
      {timeline.pov ? (
        <PovCard text={timeline.pov} frame={frame} from={4} width={W} height={H} safeArea={safeArea} fontFamily={TEXT_FONT} />
      ) : null}
      {/* The slam is the word: subtitles step aside while one is up. */}
      <Subtitles hidden={timeline.slams.some((sl) => frame >= sl.from - 4 && frame < sl.to)} pages={timeline.pages} frame={frame} fps={fps} width={W} height={H} safeArea={safeArea} style={style} />
      {timeline.slams.map((s, i) => (
        <SlamText key={i} text={s.text} frame={frame} from={s.from} to={s.to} width={W} height={H} safeArea={safeArea} fontFamily={TEXT_FONT} />
      ))}
      {showLabels ? (
        <Label x={40} y={H - 300} size={30}>
          {`${speaking ? `${speaking.line.id} ${speaking.expression}` : "—"}  shot ${shotLine.shot}\nmouth ${cue?.shape ?? "rest"}  words ${speaking?.line.source.words ?? ""}`}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
