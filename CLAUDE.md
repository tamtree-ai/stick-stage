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
- `pnpm still SetLab out/SetLab.png [--props='{"kits":["park"],"tileWidth":200}']`: every set part × 3 palettes × 3 seeds
- `pnpm voice:say <skitId>`: dev stand-in for the tamtree harness TTS; macOS `say` → `public/skits/<id>/voice/` + `voice.json`
- `pnpm prep <skitId> [--require-rhubarb]`: voice.json → Rhubarb mouths + script-aligned word timings → `generated/voice.prepared.json` (hash-cached, no network). Rhubarb: `RHUBARB_PATH`, `tools/Rhubarb-Lip-Sync-*/rhubarb` (gitignored), or PATH

## Voice
TTS is **not** called from this repo. The tamtree agent harness generates audio (+ optional word timings) and writes `voice.json`; see `docs/voice-contract.md`. Never add TTS provider keys here.

## Layout
- `src/engine/lib`: math (angle convention in `math.ts`), easing, seeds, colors
- `src/engine/rig`: schema, FK skeleton (`solveSkeleton`), pose tracks, idle/blinks, Bézier limbs, accessories, `evalActor` (`actorState.ts`: pose, expression, speech, seat, prop and symbol tracks), `<Actor>`
- `src/engine/rig/seat.ts`: seat track + seated-leg IK (hip on the seat, feet planted)
- `src/engine/props`: prop schema, per-kind drawings (`draw.tsx`), hold/drop track + fall (`track.ts`), `<PropView>`
- `src/engine/face`: expression schema, parametric mouths (`mouths.ts`), eyes/brows/mouth/symbols (`Emanata.tsx`: !, ?, speed lines)
- `src/engine/face/visemes.ts`: Rhubarb A–H/X → mouth params, `speechMouth` layers speech on the expression mouth
- `src/engine/voice`: voice contract schemas, `tokenize` / `alignWords` / `estimateWordsInSpans`
- `src/engine/text`: `buildCaptionPages` (script tokens + timings → `@remotion/captions` pages), `Subtitles`, `PovCard`, `SlamText`, safe area
- `src/engine/set`: set schema, palettes (tokens + `derived()` tones; no raw hex in parts), patterns, `<SetLayers>`, `seatHeightAt`
- `src/engine/set/parts`: part components by kit (`room`, `decor`, `office`, `furniture`, `outdoor`, `street`) and `registry.ts` (`PART_INFO`, `KIT_BACKDROP`). New part → add to `PART_INFO`; it shows up in SetLab
- `src/engine/shots/Stage.tsx`: set background, then actors, then set foreground, under one camera
- `src/engine/shots/framing.ts`: `frameShot({ framing, on })` → camera for `wide | two | medium | close | extreme`
- `src/data`: JSON library + `index.ts` loader (validates on import), `safe-area.json`
- `scripts/`: `sheet.ts`, `voice-say.ts`, `prep.ts`, `lib/` (Rhubarb + bundled ffmpeg, WAV reading)
- `public/skits/<id>/`: `script.json`, `voice.json`, `voice/*.wav` (committed); `generated/` (gitignored)
- `src/app`: Remotion root and lab compositions (`CharacterLab`, `FaceLab`, `CloseupLab`, `CloseupSheet`, `PoseLab`, `TalkLab`, `SetLab`, `PropLab`, `StagingLab`, `ContactSheet`); `fonts.ts` loads the local text font

## Rig conventions
Canonical view faces right; `facing: "left"` mirrors. `L` = back limb, `R` = front limb. Arms: 0° hangs along the torso, +90° forward, 180° up; elbow + flexes forward. Legs are world-relative (0° down, + forward); knee + bends back. The rig lifts the figure so the lowest foot touches `groundY`.
