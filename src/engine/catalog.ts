import { ASPECTS, ASPECT_LABEL, FRAME, type Aspect } from "./format/aspect";
import type { PropDef } from "./props/schema";
import { GAGS } from "./director/gags";
import type { ReactionTable, SfxManifest } from "./director/schema";
import { STYLES } from "./director/style";
import type { Library } from "./rig/actorState";
import { setCatalog, type SetCatalogEntry } from "./set/catalog";
import type { SetDef } from "./set/schema";
import { TEMPLATES, type TemplateId } from "./templates/premise";
import { TEMPLATE_CAST, TEMPLATE_CAST_MAX, defaultSet } from "./templates/stage";
import { WIDE_SAFE_AREA, type SafeArea } from "./text/safeArea";

/** Everything a skit is validated and rendered against. Two registries with equal content have equal versions. */
export type CatalogSource = {
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  safeArea: SafeArea;
  /** Directing styles. Part of the hash: they change what renders. */
  styles?: typeof STYLES;
  /** Named gags. Part of the hash. */
  gags?: typeof GAGS;
};

export type CatalogCharacter = { id: string; name: string; aspect: Aspect };
export type CatalogAspect = { id: Aspect; width: number; height: number; label: string };
export type CatalogTemplate = {
  id: TemplateId;
  cast: 1 | 2 | 3;
  castMax: 1 | 2 | 3;
  /** Default set for a 9:16 short. */
  defaultSet: string;
  /** Default set for each frame. */
  defaultSets: Record<Aspect, string>;
  description: string;
};

/** What a brief can pick from: the picker's view of a registry, pinned by `version`. */
export type Catalog = {
  version: string;
  /** The two frames a user can pick. */
  aspects: CatalogAspect[];
  characters: CatalogCharacter[];
  sets: SetCatalogEntry[];
  templates: CatalogTemplate[];
  expressions: string[];
  props: string[];
  /** Names, categories and aliases. `props` stays the id list. Sorted by `rank`, then id. */
  propInfo: CatalogProp[];
  gags: string[];
  styles: string[];
};

export type CatalogProp = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  aliases: string[];
  rank: number;
};

const propLabel = (id: string): string =>
  id
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");

/** Picker and writer view of one prop. Missing metadata falls back so an old JSON file still catalogs. */
export const propMeta = (def: PropDef): CatalogProp => ({
  id: def.id,
  name: def.name ?? propLabel(def.id),
  category: def.category ?? "other",
  tags: [...def.tags],
  aliases: [...def.aliases],
  rank: def.rank,
});

const TEMPLATE_DESCRIPTION: Record<TemplateId, string> = {
  exchange: "Two characters trade lines; the last one lands the joke.",
  interview: "A street interview: the first character holds the mic, the second answers.",
  "me-vs-me": "One character argues with a labelled version of themselves.",
  "pov-monologue": "One character talks straight to camera under a POV caption.",
  "text-slam": "Words slam on screen while one face reacts.",
  explainer: "A short hook, a narrator concept, and a twist the characters say.",
  family: "A kid asks. An adult answers badly. One or two kids.",
  fable: "Dash is sure and leaves. Moss has the last true line.",
  trio: "Three people in one room. One of them lands it.",
  "myth-flip": "Science: the skeptic states a common myth, the host shows the truth with a prop or a diagram, then why it felt true and a takeaway.",
};

/** JSON with object keys sorted, so the hash does not depend on key order. */
const stable = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v) ?? "null";
};

/** Two independent 32-bit FNV-1a lanes: 64 bits, pure JS (no Node or Web crypto), stable across runtimes. */
const fnv64 = (s: string): string => {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193 + 2);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
};

/**
 * The registry's content version: `c1-<16 hex>`. The render service reports it and a client pins
 * it; a mismatch means the skit would be checked or drawn against different characters or sets.
 */
export const catalogVersion = (src: CatalogSource): string =>
  `c1-${fnv64(stable({ lib: src.lib, sets: src.sets, sfx: src.sfx, reactions: src.reactions, safeArea: src.safeArea, wideSafeArea: WIDE_SAFE_AREA, styles: src.styles ?? STYLES, gags: src.gags ?? GAGS }))}`;

export const buildCatalog = (src: CatalogSource): Catalog => ({
  version: catalogVersion(src),
  aspects: ASPECTS.map((id) => ({ id, width: FRAME[id].width, height: FRAME[id].height, label: ASPECT_LABEL[id] })),
  characters: Object.values(src.lib.characters).map((c) => ({ id: c.id, name: c.displayName ?? c.id, aspect: c.aspect ?? "9:16" })),
  sets: setCatalog(src.sets),
  templates: TEMPLATES.map((id) => ({
    id,
    cast: TEMPLATE_CAST[id],
    castMax: TEMPLATE_CAST_MAX[id],
    defaultSet: defaultSet(id, "9:16"),
    defaultSets: { "9:16": defaultSet(id, "9:16"), "16:9": defaultSet(id, "16:9") },
    description: TEMPLATE_DESCRIPTION[id],
  })),
  expressions: Object.keys(src.lib.expressions),
  props: Object.keys(src.lib.props),
  propInfo: Object.values(src.lib.props)
    .map(propMeta)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)),
  gags: (src.gags ?? GAGS).map((g) => g.id),
  styles: Object.keys(src.styles ?? STYLES),
});
