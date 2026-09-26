# stickstage

Stick-figure comedy skits from JSON on [Remotion](https://www.remotion.dev): a rig with
expressive faces, code-drawn sets, a director that turns beats into timing, reactions, shots and
cuts, and self-checks (safe areas, overlay collisions, contrast, comedy-staging rules).

> **Status:** extracted from a private project; not published. The package boundary, export map
> and a packed-tarball consumer test exist; the license is not chosen yet.

## Entry points

| Import | What | Never |
|---|---|---|
| `stickstage` | Pure core: types, zod schemas, `compileSkit`, diagnostics, `checkSkit`, templates (`fromPremise`), `createLibrary`, migrations, math | React, Node APIs, side effects |
| `stickstage/schema` | Schemas for every document kind, `jsonSchemaFor(kind)`, `migrate` | React, Node APIs |
| `stickstage/remotion` | `StickStageComposition` (`SkitProgram`), `calculateStickStageMetadata`, `Skit`, `Stage`, `Actor`, text overlays, `ContactSheet` | `registerRoot`, file paths |
| `stickstage/node` | `workspace`, adapters (`AudioNormalizer`, `MediaProbe`, `LipSyncer`, `Transcriber`), `prepSkit`, `compileSkitIn` / `checkSkitIn`, `remotionBackend` | Side effects on import, downloads |

Anything else (for example `stickstage/dist/...`) is private and not importable.

## Use

```tsx
// Root.tsx (the consumer owns registerRoot and the compositions)
import { Composition, staticFile } from "remotion";
import { createLibrary, createSets } from "stickstage";
import { StickStageComposition, calculateStickStageMetadata, skitCompositionSchema } from "stickstage/remotion";

const lib = createLibrary({ characters, poses, expressions, props }); // your JSON documents
const sets = createSets(setDocs);
const load = async (f: string) => { const r = await fetch(staticFile(f)); return r.ok ? r.json() : undefined; };

export const Root = () => (
  <Composition id="Skit" component={(p) => <StickStageComposition program={p.program!} sets={sets} lib={lib} safeArea={safeArea} fontFamily="sans-serif" showLabels={p.showLabels} />}
    schema={skitCompositionSchema} defaultProps={{ skit: "demo", showLabels: false }}
    calculateMetadata={calculateStickStageMetadata({ load, lib, sets, sfx, reactions })}
    durationInFrames={1} fps={30} width={1080} height={1920} />
);
```

Skits live in `public/skits/<id>/skit.json`. Voices are an input (`voice.json`: audio + optional
word timings); `prepSkit(workspace(root), id)` aligns words and runs lip-sync (Rhubarb, optional)
with a content-hash cache. TypeScript consumers need `"moduleResolution": "bundler"` (Remotion's default).

## Remotion license

Remotion is free for individuals and companies of up to 3 people; larger companies need a
[company license](https://www.remotion.dev/license). Using `stickstage` means using Remotion under
those terms.
