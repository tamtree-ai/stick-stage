/**
 * The accuracy layer for teaching skits: claims with sources, the simplifications the analogy
 * makes, and the owner's sign-off pinned to a content hash. A posting render refuses a skit
 * whose content changed after it was approved.
 */
import { z } from "zod";

/** Comedy roles, plus the misconception dialog's (`myth-flip`). The director frames by role. */
export const LINE_ROLES = [
  "setup",
  "escalation",
  "punchline",
  "myth",
  "pushback",
  "prediction",
  "demo",
  "reaction",
  "why",
  "why-it-felt-true",
  "takeaway",
  "loop",
] as const;
export type LineRole = (typeof LINE_ROLES)[number];

export const ClaimSchema = z.strictObject({
  /** The fact, in a sentence. */
  text: z.string().min(3).max(300),
  /** Where it is checked: a URL, a textbook and page, a paper. */
  source: z.string().min(3).max(300),
  /** Who checked it against the source. `null` until someone has. */
  checkedBy: z.string().min(1).max(60).nullable().default(null),
  /** Beat ids that state this claim (a line with a number needs one). */
  beats: z.array(z.string().min(1)).default([]),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const ApprovalSchema = z.strictObject({
  /** The channel owner. */
  approvedBy: z.string().min(1).max(60),
  /** `contentHash` of the skit at approval (`pnpm approve` writes it). */
  hash: z.string().regex(/^[0-9a-f]{16,64}$/),
  /** ISO date. */
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
});
export type Approval = z.infer<typeof ApprovalSchema>;

/** Skit fields for the science channel (all optional; a comedy skit has none). */
export const scienceFields = {
  /** Facts the skit states, each with a source. */
  claims: z.array(ClaimSchema).max(20).optional(),
  /** Where the picture or analogy breaks ("electrons are not little balls"). Becomes the pinned comment. */
  simplifications: z.array(z.string().min(3).max(300)).max(10).optional(),
  /** The owner's sign-off. A posting render needs it, and needs it to match the content. */
  approval: ApprovalSchema.optional(),
  /** The format this skit was staged from (`myth-flip`), so checks can follow it. */
  template: z.string().min(1).max(40).optional(),
};

/** JSON with sorted keys, so the hash ignores key order and whitespace. */
export const canonicalJson = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as Record<string, unknown>)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
};

/** FNV-1a 64-bit as hex (pure JS, so the browser and Node agree). */
const fnv64 = (s: string, seed: bigint): string => {
  let h = seed;
  const prime = 0x100000001b3n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
};

/**
 * Hash of everything the viewer sees and hears: the skit without `approval` and editor hints.
 * Two 64-bit FNV passes with different seeds → 32 hex characters.
 */
export const contentHash = (skitJson: unknown): string => {
  const rest = { ...((skitJson ?? {}) as Record<string, unknown>) };
  delete rest.approval;
  delete rest.$schema;
  const text = canonicalJson(rest);
  return fnv64(text, 0xcbf29ce484222325n) + fnv64(text, 0x84222325cbf29ce4n);
};

export type ApprovalStatus = { ok: true; approvedBy: string } | { ok: false; reason: "unapproved" | "changed" | "unchecked-claims"; message: string };

/** Is this skit cleared for a posting render? */
export const approvalStatus = (skitJson: unknown): ApprovalStatus => {
  const doc = (skitJson ?? {}) as { approval?: Approval; claims?: { checkedBy?: string | null; text?: string }[] };
  if (!doc.approval) return { ok: false, reason: "unapproved", message: "the skit has no owner approval; run `pnpm approve <skit> --by=<name>` after checking it" };
  const now = contentHash(skitJson);
  if (doc.approval.hash !== now) return { ok: false, reason: "changed", message: `the skit changed after ${doc.approval.approvedBy} approved it (hash ${doc.approval.hash.slice(0, 8)}… is now ${now.slice(0, 8)}…); re-check and approve again` };
  const unchecked = (doc.claims ?? []).filter((c) => !c.checkedBy);
  if (unchecked.length) return { ok: false, reason: "unchecked-claims", message: `${unchecked.length} claim(s) not checked against a source: ${unchecked.map((c) => `"${c.text}"`).join(", ")}` };
  return { ok: true, approvedBy: doc.approval.approvedBy };
};

/** A spoken line that states a number (digits, or a number word with a unit feel). */
export const statesNumber = (line: string): boolean => /\d/.test(line) || /\b(hundred|thousand|million|billion|trillion|percent)\b/i.test(line);
