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
- No outlines. Parts separate by tone: far limbs `backTone`, the near arm or leg `edgeTone`.
  Colours are tokens from `rig/shape/palette.ts`; story-kit set parts use palette roles, never raw hex.
- The quadruped runs on the biped's pose angles (back legs = legs, front legs = arms,
  torso = pitch). Don't add quadruped-only poses; map in `quadruped.ts`. Ground contact is
  `supportBottom` (paws count).
- `composePlace` is deterministic per seed. A new feature needs a part, a lane and a `PART_OF`
  row, and must keep clear of the marks (`tests/compose.test.ts`).
- Composed sets, workspace characters and workspace props ride on the program. Anything that
  draws or checks a compiled program merges them (`withProgramAssets`, `program.sets`).
- A new shape character changes the catalog hash. t-shoot needs a re-vendor; say so in the hand-back.
- Looks (new part kinds, palette changes, the style itself) need the owner's OK on a lab video.
