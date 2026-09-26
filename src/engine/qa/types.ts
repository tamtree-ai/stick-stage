/** One finding of the skit self-check. Errors block posting; warnings are for a human look. */
export type Finding = {
  /** Stable machine-readable id, e.g. `punchline-camera`. */
  check: string;
  level: "error" | "warning" | "info";
  message: string;
  /** Frame the finding is about, if any. */
  frame?: number;
  /** Scene id for multi-scene skits. */
  scene?: string;
};

export type CheckReport = {
  ok: boolean;
  errors: number;
  warnings: number;
  findings: Finding[];
  /** Every check that ran (so a clean report still says what it looked at). */
  ran: string[];
};

export const report = (findings: Finding[], ran: string[]): CheckReport => {
  const errors = findings.filter((f) => f.level === "error").length;
  return { ok: errors === 0, errors, warnings: findings.filter((f) => f.level === "warning").length, findings, ran };
};
