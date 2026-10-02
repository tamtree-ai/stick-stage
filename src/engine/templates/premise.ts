import { z } from "zod";
import { ASPECTS } from "../format/aspect";
import { LINE_ROLES, scienceFields } from "../director/science";
import { FigureCueSchema, FigureSchema } from "../viz/schema";

/**
 * A premise: what a human writes (plan M6). The jokes, who says them and which line is the
 * punchline are human work; a template stages them into a draft `skit.json` that the
 * skit-director skill (or a person) then refines.
 */
export const TEMPLATES = ["exchange", "interview", "me-vs-me", "pov-monologue", "text-slam", "explainer", "family", "fable", "trio", "myth-flip"] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export const ROLES = LINE_ROLES;

export const PremiseLineSchema = z.strictObject({
  /** Cast id. For text-slam: whose face reacts (default: the first cast member). */
  who: z.string().min(1).optional(),
  /** Exactly what is said (or, for text-slam, the slam text). */
  text: z.string().min(1),
  /** Default: first line setup, last line punchline, the rest escalation. `myth-flip` uses its own roles (myth … takeaway). */
  role: z.enum(ROLES).optional(),
  /** What the voice says when it differs from the caption ("h-bar" for ħ). */
  spoken: z.string().min(1).optional(),
  /** Diagram cues on this line (show, switch to the truth state, roll the dice). */
  figures: z.array(FigureCueSchema).max(6).optional(),
  expression: z.string().optional(),
  /** Slam this text on the line's last word (punchlines, mostly). */
  slam: z.string().min(1).max(40).optional(),
  /** Hint for the TTS in the harness. */
  delivery: z.string().optional(),
  /** Thought: their own voice, mouth shut. The off-screen narrator is `who: "narrator"` on an explainer. */
  voiceOver: z.boolean().optional(),
  /** One named gag on the line. The compiler expands it. */
  gag: z.string().min(1).optional(),
  /** The one object this line is about. `"none"` puts it away. The director chooses the hand. */
  prop: z.string().min(1).optional(),
});
export type PremiseLine = z.infer<typeof PremiseLineSchema>;

export const PremiseCastSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_-]+$/, "lowercase letters, digits, - and _"),
  character: z.string().min(1),
  label: z.string().min(1).max(24).optional(),
  holding: z.string().optional(),
});

/** One scene of a premise. The set falls back to the premise `set`, then the template default. */
export const PremiseSceneSchema = z.strictObject({
  set: z.string().optional(),
  /** POV card for this scene. The first scene falls back to the premise `pov`. */
  pov: z.string().max(80).optional(),
  /** Title card over this scene. */
  card: z.string().min(1).max(60).optional(),
  /** Diagrams in this scene. */
  figures: z.array(FigureSchema).max(8).optional(),
  lines: z.array(PremiseLineSchema).min(1),
});
export type PremiseScene = z.infer<typeof PremiseSceneSchema>;

export const PremiseSchema = z
  .strictObject({
    /** Editor hint (JSON Schema path); ignored. */
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    template: z.enum(TEMPLATES),
    /** `9:16` short or `16:9` widescreen. Default short. Cast and sets must match. */
    aspect: z.enum(ASPECTS).default("9:16"),
    title: z.string().min(1),
    /** The premise in a sentence, for the record (not shown). */
    logline: z.string().optional(),
    pov: z.string().max(80).optional(),
    description: z.string().max(2000).optional(),
    hashtags: z.array(z.string()).default([]),
    /** Default per template, and the fallback for a scene that names no set. */
    set: z.string().optional(),
    cast: z.array(PremiseCastSchema).min(1).max(3),
    /** Diagrams for a one-scene premise (`lines`). */
    figures: z.array(FigureSchema).max(8).optional(),
    /** Facts with sources, the simplifications made: copied to the skit for the owner's check. */
    claims: scienceFields.claims,
    simplifications: scienceFields.simplifications,
    /** One scene. Mutually exclusive with `scenes`. */
    lines: z.array(PremiseLineSchema).min(1).optional(),
    /** 1–4 scenes, staged as `scenes[]`. Mutually exclusive with `lines`. */
    scenes: z.array(PremiseSceneSchema).min(1).max(4).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.lines && d.scenes) ctx.addIssue({ code: "custom", path: ["scenes"], message: `use either "lines" (one scene) or "scenes", not both` });
    if (!d.lines && !d.scenes) ctx.addIssue({ code: "custom", path: ["lines"], message: `a premise needs "lines" (or "scenes")` });
  });
export type Premise = z.infer<typeof PremiseSchema>;
export type PremiseInput = z.input<typeof PremiseSchema>;
