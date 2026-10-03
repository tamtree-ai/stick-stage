---
name: toon-character
description: Add, redesign or fix a StickStage toon character (the `style.build: "toon"` drawing tier: skin limbs, clothes, hand shapes, ears, nose, eyes with lids). Covers the toon block in the character JSON, new hair/garment/detail kinds drawn in code, toon-only pose overrides, the labs to review as video, and the checks that keep stick figures unchanged. Use when asked to make a character a toon, change how Vera or Gus look, add a hairstyle/jacket/skirt/shoe kind, fix a toon pose or hand, or compare stick vs toon.
---

# Toon characters

A toon is the same character on the same skeleton, drawn with more detail. Poses, expressions,
mouths, blinks, gait, seats, props and the director are shared with the stick tier; only the
drawing in `src/engine/rig/toon/` differs. Guide: `docs/creating-characters.md#the-toon-tier`.
History and the reasons for each choice: `../planning/2026-10-02-toon-characters/` (plan, handover,
mockups) and the "toon characters" entries in `DECISIONS.md`.

Today Vera and Gus (the science cast) ship as toons. Every other character is stick, and the
comedy cast stays stick unless the owner asks.

## Hard rules

1. **Stick figures never change.** Anything you add for toons is ignored by the stick build. The
   test "stick characters draw exactly as before" in `tests/toon.test.ts` must keep passing. If a
   fix seems to need a different pose angle, use the pose's `toon` block (below), not the base
   angles.
2. **Looks are the owner's call.** A new character, hair or garment kind is a proposal: render it,
   show the video, and wait for a yes. Don't change an approved look on your own taste.
3. **Kinds are drawn in code, colours live in JSON.** A new hairstyle or jacket is a kind in
   `src/engine/rig/toon/` plus a schema enum entry. Never put raw SVG in a character file.
4. **Motion is reviewed as video.** Stills are for layout. Sleeves, skirts and hands are judged in
   `pnpm render <Lab> out/x.mp4`.
5. Engine rules apply: frame-pure, no `Math.random`, no filesystem, files under ~300 lines.

## Where things are

| File | What it holds |
|---|---|
| `src/data/characters/<id>.json` | `style.build`, the `toon` block (proportions, skin, body, eyes, brows, lip, hair, glasses, top, outer, bottom, shoes, details) |
| `src/data/characters/<id>.md` | Cast bible; its **Look** section describes the toon design |
| `src/engine/rig/toon/schema.ts` | The toon block schema and the kind enums |
| `src/engine/rig/toon/ToonRig.tsx` | Draw order: back arm, legs, hips, outer back, torso, outer front, head, front arm, prop, hand |
| `clothes.tsx` (tops, outers, bottoms, details), `head.tsx` (hair, ears, nose, glasses), `face.tsx` (eyes, lids), `limbs.tsx`, `hands.tsx`, `shoes.tsx` | One drawing concern each |
| `kit.tsx` | The shared `Pen` (toon block, units → px, outline, ink) and `TOON_UNIT_PX` |
| `src/engine/rig/build.ts` | `toonOf`, `proportionsOf` (always read proportions through it), `withBuild`, `charactersWithBuild` |
| `src/data/poses/*.json` | `handL` / `handR` shapes and the optional `toon` override block |
| `src/engine/rig/actorState.ts` | `toonPoses`: merges a pose's `toon` block for toon characters |

Sizes in the toon block are **toon units**: px on a 610 px figure (the scale the mockups were
drawn at), scaled by the set's `figureHeightPx`.

## Workflows

### Make an existing character a toon

1. Copy `vera.json`'s `toon` block as a starting point and add it to the character. Keep the
   stick `proportions` as they are; the toon body has its own `toon.proportions`.
2. Pick existing kinds first (see `toon/schema.ts`). Change colours, not code.
3. Set `"build": "toon"` in `style` only when the owner wants it to ship. Until then the labs
   can force the tier (`build: "toon"` prop).
4. Rewrite the **Look** section of `<id>.md` to match.
5. Run the checks and the labs below.

### Add a kind (a hairstyle, garment, shoe or detail)

1. Add the enum value in `toon/schema.ts`.
2. Draw it in the matching file (`head.tsx` for hair and glasses, `clothes.tsx` for tops,
   outers, bottoms and details, `shoes.tsx` for shoes). Follow the existing kinds: an outline
   in the character's ink, a flat `fill`, and one `shade` tone on the back side (`shade` falls
   back to a darker `fill`).
3. Remember mirroring: `facing: "left"` flips the whole figure. Keep clothes free of text.
4. Check it in every pose (`PoseLabVera` / `PoseLabGus` grids, or a lab for your character),
   seated (`StagingLabToon`) and walking.

### Fix a toon pose or hand

- Hand shape per pose: `handL` / `handR` in the pose JSON (`open`, `fist`, `point`, `thumb`,
  `wave`, `palmup`, `hold`). A held prop always closes the hand.
- Arms that look wrong only on the wider toon body: add a `toon` block to the pose,
  e.g. `"toon": { "shoulderR": 70, "elbowR": 135, "shoulderL": 10, "elbowL": 120 }` (this is
  `think`). Allowed keys are `shoulderL`, `elbowL`, `shoulderR`, `elbowR`, `handL` and `handR`.
- Thumb side: `thumbFlip` in `toon/limbs.tsx` (the thumb turns with the forearm). It is tested;
  change the rule only with a new test.

To try angles quickly, render the grid and crop the cell:

```bash
pnpm still PoseLabVera out/pv.png    # 4 columns × 270 px, rows of 320 px; same for PoseLabGus
```

## Checks

```bash
pnpm test && pnpm typecheck && pnpm lint
```

`tests/toon.test.ts` covers: the stick drawing is unchanged, feet are on the ground in every pose,
no NaN for any pose × expression, the same frame draws the same thing, the cast don't look alike
(`characterDistance` / `tooAlike`), and the toon ink is ≥ 3:1 against skin and every palette (on a
dark `rim` palette, against the rim). A new toon character must pass the look-alike and contrast
checks against the existing cast.

## Labs (review as video)

```bash
pnpm render CharacterLabToon out/CharacterLabToon.mp4   # all poses × expressions
pnpm render FaceLabToon out/FaceLabToon.mp4             # all 17 expressions, close-up
pnpm render TalkLabToon out/TalkLabToon.mp4             # lip-sync, blinks
pnpm render PropLabToon out/PropLabToon.mp4             # props held in a closed hand
pnpm render StagingLabToon out/StagingLabToon.mp4       # sitting: couch, chair, bench
pnpm render menu-lab                                    # motion test skit: walk-in, gestures, talk
```

Labs show stick and toon side by side when passed `build`, so a regression in either tier shows.

## Hand back

The lab MP4 paths, what changed, and what you want the owner to judge (proportions, colours, how
a garment moves). Add a dated entry to `DECISIONS.md` for any rule you set. If the character
catalog changed, say that t-shoot needs a catalog re-vendor.
