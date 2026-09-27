/**
 * `stickstage/schema`: zod schemas for every persisted document, their JSON Schema, and
 * migrations. No React, no Node APIs.
 */
import { z } from "zod";
import { SkitSchema, ReactionTableSchema, SfxManifestSchema } from "./director/schema";
import { ExpressionSchema } from "./face/schema";
import { PropSchema } from "./props/schema";
import { CharacterSchema, PoseSchema } from "./rig/schema";
import { SetSchema } from "./set/schema";
import { PremiseSchema } from "./templates/premise";
import { SafeAreaSchema } from "./text/safeArea";
import { PreparedVoiceSchema, VoiceManifestSchema } from "./voice/schema";
import type { DocKind } from "./migrate";

export * from "./director/schema";
export { ExpressionSchema, EYE_SHAPES, SYMBOLS } from "./face/schema";
export { MouthParamsSchema } from "./face/mouths";
export { PropSchema } from "./props/schema";
export { CharacterSchema, PoseSchema, ProportionsSchema, AccessorySchema } from "./rig/schema";
export { SetSchema, SetPartSchema, PATTERNS } from "./set/schema";
export { PremiseSchema, PremiseLineSchema, PremiseCastSchema, PremiseSceneSchema, TEMPLATES } from "./templates/premise";
export { SafeAreaSchema } from "./text/safeArea";
export * from "./voice/schema";
export * from "./migrate";

/** The schema for each persisted document kind. */
export const DOC_SCHEMAS: Record<DocKind, z.ZodType> = {
  skit: SkitSchema,
  premise: PremiseSchema,
  character: CharacterSchema,
  pose: PoseSchema,
  expression: ExpressionSchema,
  prop: PropSchema,
  set: SetSchema,
  voice: VoiceManifestSchema,
  preparedVoice: PreparedVoiceSchema,
  reactions: ReactionTableSchema,
  sfx: SfxManifestSchema,
  safeArea: SafeAreaSchema,
};

/** JSON Schema (draft 2020-12) of a document kind, for editors and other languages. */
export const jsonSchemaFor = (kind: DocKind): Record<string, unknown> =>
  z.toJSONSchema(DOC_SCHEMAS[kind], { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
