/**
 * `stickstage/schema`: zod schemas for every persisted document, their JSON Schema, and
 * migrations. No React, no Node APIs.
 */
import { z } from "zod";
import { MusicManifestSchema } from "./audio/music";
import { SkitSchema, ReactionTableSchema, SfxManifestSchema } from "./director/schema";
import { ExpressionSchema } from "./face/schema";
import { PropSchema } from "./props/schema";
import { CharacterSchema, PoseSchema } from "./rig/schema";
import { SeriesSchema } from "./series/schema";
import { SetSchema } from "./set/schema";
import { PremiseSchema } from "./templates/premise";
import { SafeAreaSchema } from "./text/safeArea";
import { PreparedVoiceSchema, VoiceManifestSchema } from "./voice/schema";
import { WriterReplySchema } from "./writer/reply";
import type { DocKind } from "./migrate";

export * from "./director/schema";
export { ExpressionSchema, EYE_SHAPES, SYMBOLS } from "./face/schema";
export { MouthParamsSchema } from "./face/mouths";
export { PropSchema } from "./props/schema";
export { CharacterSchema, PoseSchema, ProportionsSchema, AccessorySchema } from "./rig/schema";
export { SeriesSchema, SeriesRefSchema } from "./series/schema";
export { MusicManifestSchema } from "./audio/music";
export { SetSchema, SetPartSchema, PartLabelSchema, PATTERNS } from "./set/schema";
export { PremiseSchema, PremiseLineSchema, PremiseCastSchema, PremiseSceneSchema, TEMPLATES } from "./templates/premise";
export { SafeAreaSchema } from "./text/safeArea";
export * from "./voice/schema";
export * from "./migrate";
export { DraftReplySchema, ReviseReplySchema, WriterReplySchema, type DraftReply, type ReviseReply, type WriterReply } from "./writer/reply";

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
  series: SeriesSchema,
  music: MusicManifestSchema,
};

/** JSON Schema (draft 2020-12) of a document kind, for editors and other languages. */
export const jsonSchemaFor = (kind: DocKind): Record<string, unknown> =>
  z.toJSONSchema(DOC_SCHEMAS[kind], { io: "input", unrepresentable: "any" }) as Record<string, unknown>;

/** JSON Schema of a model's reply to the writer prompts (draft or revise). Not a stored document. */
export const writerReplyJsonSchema = (): Record<string, unknown> => z.toJSONSchema(WriterReplySchema, { io: "input" }) as Record<string, unknown>;
