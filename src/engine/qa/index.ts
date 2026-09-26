import type { CompileResult } from "../director/compile";
import type { Expression } from "../face/schema";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { SafeArea } from "../text/safeArea";
import { closeupChecks, pacingChecks, programChecks, punchlineChecks, STORY_CHECKS } from "./story";
import { report, type CheckReport, type Finding } from "./types";
import { visualChecks, VISUAL_CHECKS } from "./visual";

export * from "./types";
export { faceRect, sampleFrames, contrastChecks } from "./visual";

export type CheckInput = {
  result: Pick<CompileResult, "scenes" | "program">;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  safeArea: SafeArea;
};

/** The M5 self-check: story rules + visual QA over every scene of a compiled skit. Pure. */
export const checkSkit = ({ result, lib, sets, safeArea }: CheckInput): CheckReport => {
  const hint = (e: string): Expression["closeup"] => lib.expressions[e]?.closeup;
  const multi = result.scenes.length > 1;
  const findings: Finding[] = [...programChecks(result.program)];
  result.program.scenes.forEach((ps, i) => {
    const { skit, timeline: tl } = result.scenes[i]!;
    const scene = [
      ...punchlineChecks(tl, skit),
      ...closeupChecks(tl, skit, hint),
      ...pacingChecks(tl),
      ...visualChecks({ tl, lib, set: sets[tl.set]!, safeArea }),
    ];
    // Report skit-absolute frames.
    findings.push(...scene.map((f) => ({ ...f, frame: f.frame === undefined ? undefined : f.frame + ps.from, scene: multi ? ps.id : undefined })));
  });
  findings.sort((a, b) => (a.frame ?? -1) - (b.frame ?? -1));
  return report(findings, [...STORY_CHECKS, ...VISUAL_CHECKS]);
};

export const formatReport = (r: CheckReport, fps: number): string => {
  const icon = { error: "✗", warning: "!", info: "·" } as const;
  const head = r.ok ? `self-check passed (${r.warnings} warning${r.warnings === 1 ? "" : "s"})` : `self-check FAILED: ${r.errors} error${r.errors === 1 ? "" : "s"}, ${r.warnings} warning(s)`;
  const rows = r.findings.map((f) => `  ${icon[f.level]} [${f.check}]${f.scene ? ` (${f.scene})` : ""}${f.frame !== undefined ? ` ${(f.frame / fps).toFixed(2)}s` : ""}: ${f.message}`);
  return [head, ...rows].join("\n");
};
