/**
 * Tamtree envelope findings (plugin SDK 2.7.0) from what the pipeline reports.
 *
 * Two shapes arrive here: the self-check's `Finding` (`check`, `level`, `frame`, `scene`) and a
 * request `Diagnostic` (`code`, `level`, `path` into the request item, e.g. `skit.beats[2].pose`).
 * Both become `{ level, message, check?, path?, at? }`. `path` is prefixed with `items[0].json.`,
 * so Tamtree's run view can open the step's input at that value. Anything without a string
 * `message` is skipped rather than guessed at.
 */
export type EnvelopeFinding = {
  level: "error" | "warning" | "info";
  message: string;
  check?: string;
  path?: string;
  at?: Record<string, unknown>;
};

const LEVELS = new Set(["error", "warning", "info"]);

export const toFindings = (details: readonly unknown[]): EnvelopeFinding[] =>
  details.flatMap((detail): EnvelopeFinding[] => {
    if (!detail || typeof detail !== "object") return [];
    const d = detail as Record<string, unknown>;
    if (typeof d.message !== "string") return [];
    const finding: EnvelopeFinding = {
      level: LEVELS.has(d.level as string) ? (d.level as EnvelopeFinding["level"]) : "info",
      message: d.message,
    };
    const check = typeof d.check === "string" ? d.check : typeof d.code === "string" ? d.code : undefined;
    if (check) finding.check = check;
    if (typeof d.path === "string" && d.path) finding.path = `items[0].json.${d.path}`;
    const at: Record<string, unknown> = {};
    if (typeof d.frame === "number") at.frame = d.frame;
    if (typeof d.scene === "string") at.scene = d.scene;
    if (Object.keys(at).length > 0) finding.at = at;
    return [finding];
  });
