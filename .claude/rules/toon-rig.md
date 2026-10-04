---
paths:
  - "src/engine/rig/**"
  - "src/data/characters/**"
  - "src/data/poses/**"
  - "tests/toon.test.ts"
---

# Rig and characters: two drawing tiers

Every character draws as `stick` (default) or `toon` (`style.build`). Both use one skeleton, pose
library, expression library and track system. Full workflow: the `toon-character` skill
(`skills/toon-character/SKILL.md`).

- **A toon change must not touch the stick drawing.** `tests/toon.test.ts` ("stick characters
  draw exactly as before") guards it. When a pose looks wrong only on toons, add a `toon` block to
  the pose (`shoulderL`, `elbowL`, `shoulderR`, `elbowR`, `handL`, `handR`). Don't edit the base
  angles.
- Read body proportions through `proportionsOf(c)` and the toon block through `toonOf(c)`
  (`rig/build.ts`), never `c.proportions` / `c.toon` directly. Pose lookups for an actor go
  through `evalActor`, which applies the toon overrides.
- Toon sizes are toon units (px on a 610 px figure, `TOON_UNIT_PX`). Colours come from the character
  JSON; kinds (hair, garments, shoes, details) are drawn in code in `rig/toon/`.
- Hand shapes don't tween: they switch mid-blend (`evalHands`). A held prop forces `hold`.
- Mirroring flips everything, so keep clothes free of text and asymmetric marks that would read wrong.
- Changing a character, pose or expression changes the catalog hash. t-shoot then needs a re-vendor; say so in the hand-back.
- Looks (new kinds, colour changes, a character going toon) need the owner's OK on a lab video.
