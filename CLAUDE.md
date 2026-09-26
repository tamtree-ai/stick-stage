# StickStage

Stick-figure comedy-skit engine on Remotion, for our own channel. Plan: `../planning/2026-09-26-revised-plan/plan.md` (milestones, gates, data contracts). Decisions not in the plan go in `DECISIONS.md`.

## Core rules
1. **Frame-pure rendering.** Every visual is a pure function of `(frame, props)`. No `useState`/`useEffect` for animation, no CSS animations, no `Date`, no `Math.random()`. Use seeded `rand()` / `noise()` from `src/engine/lib/seed.ts`.
2. **Everything is data.** Characters, poses, expressions, sets, props and skits are JSON validated with zod, and every document carries `schemaVersion`. Components never hardcode timing.
3. **No network at render time.** TTS and lip-sync run in a prepare step and are cached by content hash. The render reads only local files.
4. **Keep the engine app-agnostic.** `src/engine/**` never calls `registerRoot`, never reads `process.env`, and never touches the filesystem. Only `src/app/**` and `scripts/**` may. (Enforced by eslint and `tests/engine-rules.test.ts`.)
5. **Small, typed modules.** No file over ~300 lines.
6. **Original characters only.** Match the genre, not someone's cast.

## Commands
- `pnpm dev`: Remotion Studio
- `pnpm test` / `pnpm typecheck` / `pnpm lint`: run all three before every commit
- `pnpm still <Comp> out/x.png --frame=N`: single still (layout checks only)
- `pnpm sheet <Comp> <from> <to> <step> [--cols=6] [--scale=0.25]`: contact sheet PNG in `out/`
- `pnpm render <Comp> out/x.mp4 [--frames=a-b]`: MP4. **Motion is reviewed as video, not stills.**

## Layout
- `src/engine/lib`: math (angle convention in `math.ts`), easing, seeds, colors
- `src/engine/rig`: schema, FK skeleton (`solveSkeleton`), pose tracks, idle/blinks, Bézier limbs, accessories, `evalActor` (`actorState.ts`), `<Actor>`
- `src/engine/face`: expression schema, parametric mouths (`mouths.ts`), eyes/brows/mouth/symbols
- `src/engine/set`: set schema, palettes (tokens only, no raw hex in parts), patterns, parts, `<SetLayers>`
- `src/engine/shots/Stage.tsx`: set background, then actors, then set foreground, under one camera
- `src/data`: JSON library + `index.ts` loader (validates on import)
- `src/app`: Remotion root and lab compositions (`CharacterLab`, `FaceLab`, `PoseLab`, `ContactSheet`)

## Rig conventions
Canonical view faces right; `facing: "left"` mirrors. `L` = back limb, `R` = front limb. Arms: 0° hangs along the torso, +90° forward, 180° up; elbow + flexes forward. Legs are world-relative (0° down, + forward); knee + bends back. The rig lifts the figure so the lowest foot touches `groundY`.
