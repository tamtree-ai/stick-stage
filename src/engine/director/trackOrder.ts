import type { Diagnostic } from "./diagnostics";
import type { CastTrack } from "./timeline";

const byFrame = <T extends { frame: number }>(xs: T[]) => xs.sort((a, b) => a.frame - b.frame);

export const sortTracks = (c: CastTrack) => {
  for (const k of ["poseKeys", "expressionKeys", "gazeKeys", "nodKeys", "seatKeys", "propKeys", "symbolKeys", "moveKeys", "facingKeys", "hopKeys", "gaitKeys", "browKeys", "fallKeys"] as const)
    byFrame(c[k] as { frame: number }[]);
  c.speech.sort((a, b) => a.startFrame - b.startFrame);
};

/** Two pose (or expression) changes on one character within 2 frames: the later one wins. */
export const checkOverlaps = (cast: CastTrack[], diags: Diagnostic[]) => {
  for (const c of cast) {
    for (const [name, keys] of [["pose", c.poseKeys], ["expression", c.expressionKeys]] as const) {
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1]!;
        const b = keys[i]!;
        const ida = "pose" in a ? a.pose : a.expression;
        const idb = "pose" in b ? b.pose : b.expression;
        if (b.frame - a.frame <= 1 && ida !== idb && a.frame > 0)
          diags.push({ level: "warning", code: "overlap", path: `cast "${c.id}"`, message: `${name} "${ida}" and "${idb}" land together at frame ${b.frame}; "${idb}" wins` });
      }
    }
  }
};
