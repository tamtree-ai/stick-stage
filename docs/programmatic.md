# Programmatic guide

This is the caller’s guide: validate documents, compile a skit, draw it in Remotion, and prepare audio on disk. It matches package `stickstage` `0.1.0` in this repo. The package is private and not published. Remotion is a peer dependency; companies above three people need a [Remotion company license](https://www.remotion.dev/license).

Inside this repo, tests import from `src/engine`. A separate program imports the package paths below. Deep imports (`stickstage/dist/...`) are private.

TypeScript consumers need `"moduleResolution": "bundler"`.

## Entry points

| Import | What it contains | What it must not do |
|---|---|---|
| `stickstage` | Types, zod schemas re-exported through the core, `compileSkit`, `checkSkit`, `checkDraft`, `placeholderVoice`, `fromPremise`, `createLibrary`, `createSets`, `buildCatalog`, math | React, Node APIs, side effects on import |
| `stickstage/schema` | `DOC_SCHEMAS`, `jsonSchemaFor(kind)`, `migrate`, every document schema | React, Node APIs |
| `stickstage/remotion` | `StickStageComposition`, `calculateStickStageMetadata`, `Skit`, `Stage`, `Actor`, text, `ContactSheet` | `registerRoot`, file paths |
| `stickstage/data` | The shipped registry: `library`, `sets`, `sfxLibrary`, `reactions`, `safeArea`, `catalog`, `series` | React, Node APIs |
| `stickstage/node` | `workspace`, adapters, `prepSkit`, `compileSkitIn`, `checkSkitIn`, `remotionBackend`, `writePostFiles` | Work on import, downloads |

`stickstage/node` peers `@remotion/bundler` and `@remotion/renderer` are optional until you render.

## Build a library

Documents are plain JSON. `createLibrary` migrates each one, parses it, and throws on the first invalid document with its id and every issue. Duplicate ids throw.

```ts
import { createLibrary, createSets } from "stickstage";

const lib = createLibrary({
  characters, // unknown[] of character documents
  poses,
  expressions,
  props,
});

const sets = createSets(setDocs);
```

`lib` is `{ characters, poses, expressions, props }`, keyed by `id`. A character with no `aspect` becomes `"9:16"`.

The shipped registry is `stickstage/data`:

```ts
import { library, sets, sfxLibrary, reactions, safeArea, catalog, series } from "stickstage/data";
```

`catalog` is the picker view: `version`, `aspects`, `characters`, `sets`, `templates`, `expressions`, `props` (ids), `propInfo` (name, category, tags, aliases, rank), `gags`, `styles`. `series` is not part of the hash. A skit may name a series id you added in `src/data/series/`.

Your own registry:

```ts
import { buildCatalog, catalogVersion } from "stickstage";

const version = catalogVersion({ lib, sets, sfx, reactions, safeArea });
const catalog = buildCatalog({ lib, sets, sfx, reactions, safeArea });
```

`version` looks like `c1-` plus 16 hex digits. Same documents, same version, on every runtime. The hash also covers the built-in styles and gags, and the widescreen safe area. Pass `styles` or `gags` only when you replaced those tables.

`setCatalog(sets)` is the set list alone: id, aspect, kit, description, tags, and which marks are seated.

## Validate a document

```ts
import { jsonSchemaFor, migrate, DOC_KINDS, CharacterSchema } from "stickstage/schema";

const schema = jsonSchemaFor("character"); // JSON Schema draft 2020-12, input shape
const { doc, applied } = migrate("character", rawJson);
const character = CharacterSchema.parse(doc);
```

`DOC_KINDS`: `skit`, `premise`, `character`, `pose`, `expression`, `prop`, `set`, `voice`, `preparedVoice`, `reactions`, `sfx`, `safeArea`, `series`, `music`.

Current versions: skit is `2`. Everything else in that list is `1`. Skit v1 migrates to v2 with no field changes (narrator, cards, and list cues were added as optional).

`migrate` leaves a document with no numeric `schemaVersion` untouched, and the zod schema then reports it. A version newer than this engine throws `SkitError` (`schema-version`). A gap in the migration chain throws the same way.

`SkitError` has `diagnostics`: `{ level, code, path, message, expected?, example? }`. `level` is `"error"` or `"warning"`. Format them with `formatDiagnostics` from `stickstage`.

## Compile

```ts
import { compileSkit, parseSkit, checkSkit, checkDraft, placeholderVoice } from "stickstage";

const result = compileSkit({
  skit,            // raw skit.json
  voice,           // prepared voice; omit only when every beat is silent
  lib,
  sets,
  sfx,             // sfx manifest
  reactions,       // speaker expression → listener expression
  safeArea,        // optional; face shots stay inside it
  music,           // optional; required when the skit names "music"
  gags,            // optional; default is the shipped gag library
  style,           // optional DirectingStyle; default classic
  lang,            // optional BCP 47 key into skit.i18n
  series,          // optional { [id]: { style?, coldOpen? } }
});
```

Throws `SkitError` when any diagnostic is an error. Unknown pose, expression, prop, character, set, or sound ids are errors and include the legal list.

Returns:

| Field | Meaning |
|---|---|
| `result.program` | What Remotion plays. `fps`, `width`, `height`, `durationInFrames`, `scenes`, optional `music`, optional cold-open `hook`. |
| `result.scenes` | One compiled scene each: the resolved skit plus its `timeline`. |
| `result.timeline` | The first scene's timeline. |
| `result.skit` | The first scene's resolved skit. |
| `result.doc` | The parsed document, after language apply. |
| `result.warnings` | Diagnostics that did not fail the compile. |

`parseSkit(json)` migrates, fills `meta.aspect` / `width` / `height` (default `9:16`, 1080×1920, 30 fps), and throws `SkitError` on schema errors.

Workspace characters on `skit.characters` (at most four documents) are parsed and merged onto `lib.characters` for that compile. They do not change `catalogVersion`.

### Check

```ts
const report = checkSkit({ result, lib, sets, safeArea });
```

`report.ok` is false when any finding is an error. `report.findings` carry `check`, `level`, `message`, and sometimes `frame` and `scene`. Story checks cover the punchline, close-ups, and pacing. Visual checks cover safe area, overlay collisions, and contrast. `distinct` warns when two cast members read as the same person. `formatReport(report, fps)` is the text form.

### Check a draft before any real voice

`checkDraft` is what `POST /validate` does locally: parse, refuse beats whose audio source is a file, compile on placeholder timings, self-check.

```ts
const draft = checkDraft(skitJson, { lib, sets, sfx, reactions, safeArea }, { lang, series, voice });
```

`draft.ok`, `draft.lines` (one entry per line to voice), `draft.estimatedDurationSec`, `draft.warnings`, `draft.check`, `draft.cuts`, `draft.result`. The duration is the placeholder clock. Real audio changes it. Throws `SkitError` when the skit is invalid.

`placeholderVoice(lines, locale)` builds a prepared voice with estimated word times so a silent preview can play.

## Stage a premise

```ts
import { fromPremise } from "stickstage";

const skitInput = fromPremise(premiseJson, lib, sets);
```

`premiseJson` is a premise document (`schemaVersion: 1`, a template id, cast, lines). `fromPremise` checks the template's cast count, the character aspect, and the set, then writes beats, poses, and the default room. The director still adds listener reactions, shots, and the reaction beat when you compile. Templates and their default rooms are listed in [People, rooms, and shapes](cast-rooms-and-shapes.md).

## Draw in Remotion

The consumer owns `registerRoot`. Stick Stage never registers a root.

```tsx
import { Composition, staticFile } from "remotion";
import { createLibrary, createSets } from "stickstage";
import {
  StickStageComposition,
  calculateStickStageMetadata,
  skitCompositionSchema,
} from "stickstage/remotion";

const lib = createLibrary({ characters, poses, expressions, props });
const sets = createSets(setDocs);

const load = async (file: string) => {
  const r = await fetch(staticFile(file));
  return r.ok ? r.json() : undefined;
};

export const Root = () => (
  <Composition
    id="Skit"
    component={(p) => (
      <StickStageComposition
        program={p.program!}
        sets={sets}
        lib={lib}
        safeArea={safeArea}
        fontFamily="sans-serif"
        showLabels={p.showLabels}
      />
    )}
    schema={skitCompositionSchema}
    defaultProps={{ skit: "demo", showLabels: false }}
    calculateMetadata={calculateStickStageMetadata({
      load,
      lib,
      sets,
      sfx,
      reactions,
      safeArea,
      series,
    })}
    durationInFrames={1}
    fps={30}
    width={1080}
    height={1920}
  />
);
```

`calculateStickStageMetadata` loads `skits/<id>/skit.json` and `skits/<id>/generated/voice.prepared.json` through `load`, compiles, and sets the composition length from the program. Pass `skitsPath` when the folders are not under `skits/`. Composition props:

| Prop | Meaning |
|---|---|
| `skit` | Folder name. |
| `showLabels` | Burn-in labels. The debug composition uses this. |
| `program` | Filled by `calculateMetadata`. You can also pass one you compiled yourself. |
| `omitHook` | Drop the teaser or slam prefix so a scene cache can reuse frames. |
| `lang` | Compile `skit.i18n[lang]`. |

`StickStageComposition` is `SkitProgram`. Lower-level pieces in `stickstage/remotion`: `Stage`, `Actor`, `Rig`, `Face`, `PropView`, `SetLayers`, `PARTS`, `PART_INFO`, `KIT_BACKDROP`, `Subtitles`, `PovCard`, `SlamText`, `CardText`, `ListText`, `ContactSheet`.

This repo's root is `src/app/Root.tsx`. Labs (`CharacterLab`, `SetLab`, `PropLab`, and the others) are app compositions. They are not exported from the package.

## Node: from a folder to an MP4

```ts
import { library, sets, sfxLibrary, reactions, safeArea, series } from "stickstage/data";
import {
  workspace,
  defaultAdapters,
  prepSkit,
  compileSkitIn,
  checkSkitIn,
  summarize,
  remotionBackend,
  writePostFiles,
} from "stickstage/node";

const ws = workspace(root); // public/skits/<id>, tools/
const prep = prepSkit(ws, skitId); // writes generated/voice.prepared.json
const compiled = compileSkitIn({ ws, lib: library, sets, sfx: sfxLibrary, reactions, safeArea, series }, skitId);
const report = checkSkitIn(project, skitId, compiled);
console.log(summarize(compiled.program));

const backend = remotionBackend({
  entryPoint: "src/app/index.ts",
  symlinkPublicDir: true, // long-running servers; no effect on Windows
});
await backend.renderSkit(skitId, `out/${skitId}.mp4`, { debug: false });
writePostFiles(`out/${skitId}`, { skit: skitId, doc: compiled.doc, program: compiled.program, report, lib: library });
```

`workspace(root, { publicDir, skitsDir, toolsDir })` resolves those folders. `skitDir(id)` is `<public>/skits/<id>`. `publicPath(abs)` is the path you hand to Remotion's `staticFile`, with forward slashes.

`prepSkit` reads `voice.json`, normalizes audio to WAV, aligns words to the script, and writes mouth cues. Cache files live in `generated/cache/`. `PREP_VERSION` is part of the cache key; it bumps when the same inputs should produce new output.

```ts
prepSkit(ws, id, { requireLipSync: true, adapters });
```

`requireLipSync: true` fails when Rhubarb is missing. Otherwise mouths are estimated from the word times.

Adapters (`defaultAdapters(ws)`):

| Adapter | Role |
|---|---|
| `AudioNormalizer` | Any audio → 16-bit PCM WAV. The default uses Remotion's bundled ffmpeg. |
| `MediaProbe` | Duration and speech spans. The default reads the WAV. |
| `LipSyncer` | Optional. `rhubarb(bin)` shells out. `findRhubarb` checks `RHUBARB_PATH`, then `tools/Rhubarb-Lip-Sync-*/rhubarb`, then `PATH`. |
| `Transcriber` | Optional whisper.cpp word times. |

Every adapter except the normalizer and the probe may be omitted. Precomputed word times in `voice.json` are a normal path. The voice file itself is specified in [Voices](voice-contract.md).

`compileSkitIn` reads `skit.json` and `generated/voice.prepared.json`, compiles, and writes `generated/timeline.json`. Pass `{ lang }` to read `generated/voice.<lang>.prepared.json` and compile that dub. When the prepared file is missing and `lang` is set, it falls back to `placeholderVoice`.

`checkSkitIn` writes `generated/check.json`.

`summarize(program)` is the one-screen list of beats, cuts, punch-ins, and sound effects.

`remotionBackend`:

| Method | Result |
|---|---|
| `serveUrl()` | Bundles `entryPoint` once and reuses it. |
| `renderSkit(id, out, opts)` | H.264 MP4. `opts.debug` selects the debug composition id. `opts.frames` is `[from, to]`. `opts.lang`, `opts.omitHook`, `opts.scale`, `opts.x264Preset`, `opts.onProgress`, `opts.cancelSignal`. |
| `renderStill(id, frame, out)` | One PNG. |
| `renderSheet(opts)` | Contact sheet. |
| `renderComposition(id, inputProps, out)` | One still of any registered composition (cover, thumbnail). |

Default composition ids are `Skit`, `SkitDebug`, and `ContactSheet`. Override them with `compositions`. `browserExecutable` selects Chrome when you are not using Remotion's download.

`writePostFiles(base, …)` writes `<base>.txt` (the post caption), `<base>.srt` (the script, not the audio transcript), and `<base>.json` (duration, check counts, series, and a synthetic-voice reminder when the skit asks for one).

HTTP for the same steps is [The render service](render-service.md).

## The writer

Stick Stage builds the prompt and parses the model's reply. It does not call the model. `WRITER` is `"w2"`. Import from `stickstage` (the writer is part of the core).

| Function | Role |
|---|---|
| `writerWorld(catalog, notes)` | The closed lists the prompt may use: character ids, sets, expressions, props (`catalog.propInfo`), templates. `notes` is character id → cast note. |
| `parseBrief(json)` | A brief: topic, cast, optional workspace characters, tone. |
| `draftPrompt(…)`, `revisePrompt(…)`, `repairPrompt(…)` | The strings you send. |
| `premiseFromReply(text)` | Model text → a premise, or `ReplyError`. |
| `skitFromReply(text)` | Model text → a revised skit. |
| `fromPremise(premise, lib, sets)` | Premise → skit input, as above. |

Workspace characters on the brief are visible to the writer as cast, with their `personality` line. They are not added to the shipped catalog.

## Frame rules for engine code

Code under `src/engine` that draws:

- Read `useCurrentFrame()` (or a frame argument) and props. Do not store animation in React state.
- Do not call `Math.random()`, `Date.now()`, or `new Date()`. Use `rand(seed, channel)` and `noise()` from `src/engine/lib/seed.ts`.
- Do not read the filesystem or `process.env`.
- Do not call `registerRoot`.
- Set parts take colors from the palette. Character and prop documents are the places that store hex.
- A new persisted field bumps `CURRENT_VERSIONS` for that kind and adds a migration `n → n+1` in `MIGRATIONS`, unless old documents are already valid under the new schema.

`tests/engine-rules.test.ts` enforces the engine boundary.

## Errors you will handle

| Failure | What to do |
|---|---|
| `SkitError` from `parseSkit` / `compileSkit` | Read `diagnostics`. `path` is a JSON path (`beats[2].actions[0].pose`). `expected` is the legal set. `example` is a snippet. |
| `Error: Invalid character "ada":` | The document failed zod. The lines under it are `path: message`. |
| `Error: Duplicate character id "milo"` | Two documents in the array share an id. |
| `Error: Unknown accessory "bob" on character "ada"` | The id is not in `accessories.tsx`. The character parsed; the throw is at draw time. |
| `Error: Unknown palette "fog"` | `getPalette` failed. The set parsed; the throw is at draw time. |
| `aspect-set` / `aspect-character` | The skit, the set, and the catalog character name different frames. |
| `catalog-mismatch` (HTTP 409) | The client's pinned `catalog_version` is not this process's `catalog.version`. |
| Missing `voice.prepared.json` | Run `prepSkit` first, or pass `voice` into `compileSkit`. A spoken beat without a prepared line cannot be timed. |

`pnpm compile <id>` is the same compile, printed. Use it when a diagnostic is easier to read in the terminal than in a stack.

Back to [For developers](developers.md).
