import { SkitError, type Diagnostic } from "./director/diagnostics";

/**
 * Schema migrations. Every persisted document carries `schemaVersion`; when a schema changes
 * incompatibly, bump `CURRENT_VERSIONS[kind]` and add a migration `n → n+1` that rewrites old
 * documents. Loading runs the chain, so old skits keep working.
 */
export const DOC_KINDS = ["skit", "premise", "character", "pose", "expression", "prop", "set", "voice", "preparedVoice", "reactions", "sfx", "safeArea", "series", "music"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const CURRENT_VERSIONS: Readonly<Record<DocKind, number>> = {
  skit: 2,
  premise: 1,
  character: 1,
  pose: 1,
  expression: 1,
  prop: 1,
  set: 1,
  voice: 1,
  preparedVoice: 1,
  reactions: 1,
  sfx: 1,
  safeArea: 1,
  series: 1,
  music: 1,
};

type Doc = Record<string, unknown>;
export type Migration = { from: number; to: number; note: string; up: (doc: Doc) => Doc };
export type MigrationRegistry = Partial<Record<DocKind, readonly Migration[]>>;

export const MIGRATIONS: MigrationRegistry = {
  // v2 adds `narrator`, beat `focus`, scene `card`, list text cues and empty scene casts. Every v1 skit is a valid v2 skit.
  skit: [{ from: 1, to: 2, note: "narrator, cards and list text (no changes to v1 fields)", up: (doc) => doc }],
};

export type Migrated<T = unknown> = { doc: T; applied: string[] };

/**
 * Bring a document up to the current version. Documents without a numeric `schemaVersion` pass
 * through untouched (the zod schema then reports it). Throws `SkitError` for a version newer than
 * this engine or a gap in the chain.
 */
export const migrate = (
  kind: DocKind,
  input: unknown,
  registry: MigrationRegistry = MIGRATIONS,
  current: number = CURRENT_VERSIONS[kind],
): Migrated => {
  if (typeof input !== "object" || input === null || typeof (input as Doc).schemaVersion !== "number") return { doc: input, applied: [] };
  let doc = input as Doc;
  let v = doc.schemaVersion as number;
  const fail = (message: string, expected?: string): never => {
    const d: Diagnostic = { level: "error", code: "schema-version", path: "schemaVersion", message, expected };
    throw new SkitError([d]);
  };
  if (v > current) fail(`${kind} schemaVersion ${v} is newer than this engine supports (${current})`, "update StickStage, or use a document written for this version");
  const applied: string[] = [];
  while (v < current) {
    const m = registry[kind]?.find((x) => x.from === v);
    if (!m) return fail(`no migration for ${kind} schemaVersion ${v} → ${v + 1}`, `schemaVersion ${current}`);
    doc = { ...m.up(doc), schemaVersion: m.to };
    applied.push(`${kind} v${m.from}→v${m.to}: ${m.note}`);
    v = m.to;
  }
  return { doc, applied };
};
