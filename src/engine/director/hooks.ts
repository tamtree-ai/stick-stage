import type { Program } from "./timeline";

const TEASER_MS = 1200;
const SLIDE_MS = 260;

export type HookKind = "pov" | "none" | "teaser" | "slam";

export type HookPoint = { scene: number; frame: number };

/** The punchline's reaction close-up, else the punchline beat, in scene-local frames. */
export const reactionPoint = (program: Program): HookPoint | undefined => {
  for (let i = 0; i < program.scenes.length; i++) {
    const tl = program.scenes[i]!.timeline;
    const shot = tl.shots.find((s) => s.reason.startsWith("reaction close-up"));
    if (shot) return { scene: i, frame: shot.frame };
  }
  for (let i = program.scenes.length - 1; i >= 0; i--) {
    const tl = program.scenes[i]!.timeline;
    const beat = [...tl.beats].reverse().find((b) => b.punchline);
    if (beat) return { scene: i, frame: beat.from };
  }
  return undefined;
};

/** The punchline slam, else the reaction point. */
export const slamPoint = (program: Program): HookPoint | undefined => {
  for (let i = 0; i < program.scenes.length; i++) {
    const slams = program.scenes[i]!.timeline.slams;
    const last = slams[slams.length - 1];
    if (last) return { scene: i, frame: last.from };
  }
  return reactionPoint(program);
};

/**
 * A cold open built from frames the compiler already has. `teaser` and `slam` prepend ~1.2 s
 * of that frame, then a short slide into beat one. `none` drops the POV card. `pov` is unchanged.
 */
export const applyHook = (program: Program, kind: HookKind): Program => {
  if (kind === "pov") return { ...program, hook: undefined };
  if (kind === "none") {
    return {
      ...program,
      hook: undefined,
      scenes: program.scenes.map((sc, i) => (i === 0 ? { ...sc, timeline: { ...sc.timeline, pov: undefined } } : sc)),
    };
  }
  const point = kind === "slam" ? slamPoint(program) : reactionPoint(program);
  if (!point) return program;
  const prefixFrames = Math.max(1, Math.round((TEASER_MS / 1000) * program.fps));
  const transitionFrames = Math.max(1, Math.round((SLIDE_MS / 1000) * program.fps));
  const base = program.hook ? program.durationInFrames - program.hook.prefixFrames + program.hook.transitionFrames : program.durationInFrames;
  return {
    ...program,
    durationInFrames: base + prefixFrames - transitionFrames,
    hook: { kind, scene: point.scene, frame: point.frame, prefixFrames, transitionFrames },
  };
};
