---
paths:
  - "src/engine/rig/shape/**"
  - "src/engine/set/compose.ts"
  - "src/engine/set/parts/story*.tsx"
  - "src/engine/director/places.ts"
  - "src/engine/writer/story.ts"
  - "src/engine/writer/assets.ts"
  - "tests/shape.test.ts"
  - "tests/compose.test.ts"
  - "tests/story.test.ts"
---

# Shape tier, story kit, places

The third drawing tier (`style.build: "shape"`): flat, outline-free figures from a spec. Workflow:
the `story-episode` skill; guide `docs/stories.md`.

- **A shape change must not touch stick or toon drawings.** `tests/shape.test.ts` ("forcing the
  shape tier leaves stick and toon characters as they were") and `tests/toon.test.ts` guard it.
- Characters are specs. A new look is a new **part kind** in `rig/shape/` (`schema.ts` enum + a
  drawer), usable by every character, not a one-off drawing. Keep `reach.ts` in step with any
  part that sticks up (the camera uses it for headroom).
- No outlines. Parts separate by tone: far limbs `backTone`; the near arm (or front leg) casts a
  `castTone` shadow on the body. Tail, ears, legs, torso and head sit inside one `Soft`
  silhouette (`rig/shape/soft.tsx`), so they flow into each other; worn details and emanata are
  drawn outside it (`ShapeHeadSymbols`) so they stay crisp.
- Colours are tokens from `rig/shape/palette.ts` (Apollo / Resurrect 64 ramps). Tones come from
  `shade()` in `lib/color.ts` (OKLCH, hue-shifted), not `darken`/`lighten`. Keep a character to one
  colour family plus one accent. Story palettes are built by rule in `set/palettes.ts` (calm,
  low-chroma backgrounds, 60-30-10, `light` grades the cast); story-kit parts use palette roles,
  never raw hex.
- Props marked `floats` (the balloon) rise when dropped (`risePose` in `props/track.ts`).
- The quadruped runs on the biped's pose angles (back legs = legs, front legs = arms,
  torso = pitch). Don't add quadruped-only poses; map in `quadruped.ts`. Ground contact is
  `supportBottom` (paws count).
- `composePlace` is deterministic per seed. A new feature needs a part, a lane and a `PART_OF`
  row, and must keep clear of the marks (`tests/compose.test.ts`).
- Composed sets, workspace characters and workspace props ride on the program. Anything that
  draws or checks a compiled program merges them (`withProgramAssets`, `program.sets`).
- A new shape character changes the catalog hash. t-shoot needs a re-vendor; say so in the hand-back.
- Looks (new part kinds, palette changes, the style itself) need the owner's OK on a lab video.
