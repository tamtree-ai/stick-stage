# Decisions

Decisions not covered by the plan. Newest last.

## 2026-09-26 (M0/M1)
- **Repo root is `repo/`** inside the project folder, next to `planning/`, `reports/` and `research_notes/`.
- **Pinned versions:** Remotion 4.0.529 (all `@remotion/*` exact). `zod` is pinned to 4.5.4 because Remotion's version check requires exactly that. TypeScript is 5.7.3 and ESLint 9 because `@remotion/eslint-config-flat` bundles typescript-eslint 8.21 (peer range `<5.8`, `eslint ^9`).
- **Contact sheet:** Remotion's bundled ffmpeg has no `tile` filter. `scripts/sheet.ts` renders frames with `renderFrames`, then tiles them in a `ContactSheet` still composition (frames are passed as data URLs). This needs no system ffmpeg and gives frame-number labels.
- **Pose transitions:** a custom `easeOutBack` (overshoot 1.2) over 4 frames instead of Remotion `spring()`, so the move length is exact and testable. Anticipation adds a 2-frame, 12% opposite dip, only for poses flagged `anticipation: true` (`arms-up`, `recoil`).
- **Expression transitions:** numeric channels (lids, brows, gaze, mouth params) blend over 3 frames with ease-out. Eye shape and symbols snap on the key frame.
- **Mouths are parametric** (`w, open, curve, skew, round, top, teeth, tongue`). Presets and, in M2, Rhubarb visemes are points in one space, so they blend instead of swapping SVGs.
- **Limbs:** a quadratic Bézier with the control point 0.55× past the joint (it passes near the elbow and rounds sharp bends instead of looping), plus a constant bow of `limbCurve × span × 0.14`. Legs use 0.6× the character's curve.
- **Legs are world-relative** (not torso-relative), so torso lean never tips the stance. Arms are torso-relative.
- **Case-insensitive filesystem:** the pure state module is `rig/actorState.ts` so it can't collide with `rig/Actor.tsx`.

## M1 tuned numbers (pending the taste gate)
| Parameter | Milo | June |
|---|---|---|
| height (× figure) | 1.0 | 0.93 |
| headRadius | 0.17 | 0.185 |
| torso | line, 0.27 | bean 0.13 wide, 0.25 |
| arms (upper/fore) | 0.15 / 0.14 | 0.14 / 0.13 |
| legs (thigh/shin) | 0.17 / 0.17 | 0.16 / 0.16 |
| strokeWidth @1080w | 12 | 12 |
| limbCurve | 0.3 | 0.3 |
| eyes | big-pupil (0.21R × 0.27R) | dot + round glasses |

- Set figure height is 720 px at 1080×1920, groundY is 1480, and marks are 0.27 / 0.5 / 0.73.
- Idle: breath ±0.8% torso length at 0.25 Hz, sway ±1°, head drift ±1.5°, blinks every 2.5–5 s (4 frames).

## 2026-09-26 (face close-ups)
- **Face framings are tighter than the plan's first guess.** Because the characters are big-headed, a `close` with the head at 45% of frame width showed almost the whole body in 9:16. Tuned values (head width / eye line): `medium` 0.40 / 0.30, `close` 0.62 / 0.36, `extreme` 0.84 / 0.42. `extreme` stops at 0.84 so the head outline and hair stay inside the frame.
- **Face shots center the head, not the eyes.** The eyes sit forward on the head, so centering on them clipped the back of the head and June's bun. There is 3% lead room in the facing direction.
- **Closeups are a real camera zoom.** Line weight scales with the shot; there is no stroke compensation. The close-up sheets are the check on whether the 12 px strokes still look right at 3–4× zoom.
- **Emotion → framing lives in the expression data** (`closeup` hint), so the director (M4) and the skill (M5) read one source.

## 2026-09-26 (M2 talking)
- **M1 taste gate passed** (team approval, 2026-09-26). The M1 tuned numbers above are final for now.
- **TTS comes from the tamtree agent harness, not this repo.** The plan's `TtsAdapter` + provider became an input contract: the harness writes `voice/<line>.wav` + `voice.json` (`docs/voice-contract.md`). Provider choice, keys, cost tracking and TTS caching live in the harness. `pnpm voice:say` (macOS `say`) is the local stand-in and writes the same contract.
- **`pnpm prep`, not `pnpm prepare`.** npm/pnpm run a script named `prepare` on every install.
- **Prep cache key** = sha256(audio bytes, line fields, mouth tool + version, `PREP_VERSION`). One JSON per line in `generated/cache/`. Bump `PREP_VERSION` when prep output changes for the same inputs.
- **Rhubarb 1.14.0** is run with `--extendedShapes GHX` and the line text as the dialog file. The macOS release is x86_64 and runs under Rosetta on Apple Silicon. Audio is normalized to mono 16-bit 22.05 kHz WAV with Remotion's bundled ffmpeg (no system ffmpeg). That ffmpeg can't read AIFF, so `voice:say` asks `say` for WAV directly.
- **Visemes are points in the parametric mouth space** (`face/visemes.ts`). While talking, the viseme supplies opening/shape and the expression keeps 70% of its corner lift and smirk, so a happy line is smiling speech and an angry one is a frowning shout. Rest (X) and silence show the expression mouth itself. Shapes blend over 45 ms.
- **Estimated word timings use the audio.** When the voice source gives no word timings, prep detects pauses (10 ms RMS windows, −32 dB of peak, pauses ≥ 140 ms), matches them to punctuation breaks with a small least-squares DP, and spreads each phrase by syllables over its spoken span. Rhubarb's own rest cues were too sparse to find pauses.
- **Word anchors prefer the exact token.** "Forty!" matches the second token `Forty!` before the normalized match `forty` (the first "Forty"). The skit schema in M4 still adds `occurrence`.
- **Subtitles:** Montserrat variable font (OFL) vendored in `public/fonts/`, loaded with `@remotion/fonts`. 74 px, weight 800, white with a black outline and drop shadow. The spoken word turns yellow and lifts 0.1 em at 1.05× (the second cue besides color). Pages hold ≤ 26 chars and ≤ 1.2 s of speech, never span two lines, and linger 350 ms after the last word. The block is centered at 62% of frame height.
- **Slam text** sits at 64% height (below the face in every framing) and subtitles hide while a slam is up, since the slam is the word.
- **Safe area** starts as one profile in `src/data/safe-area.json`: top 14%, bottom 30%, left 4%, right 12%.
- **TalkLab shots are locked off:** the camera is framed from the actor at the line's first frame, not per frame, so gestures don't drag the camera.

## 2026-09-26 (M3 staging)
- **M2 gate passed** (team approval of `TalkLabClean.mp4`, 2026-09-26). `m2-talking` merged into `main`.
- **Set parts are registered in one table** (`set/parts/registry.ts`, `PART_INFO`) with their kits, whether they fill the frame (`backdrop`) and whether they belong in `foreground`. SetLab and the data tests read it. `KIT_BACKDROP` is the minimal backdrop per kit.
- **25 set parts across 5 kits.** Interior: wall, floor, window (`variant: "blinds"` for offices), shelf, frame, plant, door, couch, clock. Office: whiteboard, cabinet, chair, desk (foreground; variants `monitor`/`laptop`/`clear`). Park: sky (`variant: "sun"`), hills, grass (`variant: "path"`), tree, bush, bench, lamp. Street: buildings, sidewalk (+ curb and road), shopfront (seeded sign icon), hydrant. All colors come from the 7 palette tokens or `derived(palette)` (wood, metal, glass, paper, foliage), which mixes tokens, so there is still no raw hex in any part.
- **Palettes:** added `meadow`, `autumn` (outdoor, green/olive grass) and `city`, `dusk` (streets). A park in `dusk` gave purple grass, so each kit is reviewed in its own 3 palettes (`LAB_PALETTES` in `SetLab.tsx`).
- **Outdoor depth without perspective:** the park ground starts at a horizon `0.34 × figure` above `groundY`, and street facades meet the sidewalk `0.18 × figure` above it. Characters stand on the near ground, and no parts are scaled for depth.
- **Parts can snap to marks** (`mark` + `dx`) instead of `x`, so a desk and chair follow the cast mark. `seatFor: [marks]` says which cast member sits on a seat part.
- **Seating is an actor track, not a pose.** `seatKeys: [{ frame, seatPx | null }]` sits or stands, and the upper body still comes from whatever pose is active, so a seated character can point or facepalm. The `sit` pose is the rest pose for sitting (hands forward on the lap/desk). Seat heights (× figure height): chair 0.19, bench 0.18, couch 0.17. The director resolves them with `seatHeightAt(set, mark)`.
- **Seated legs use a 2-bone IK** (`rig/seat.ts`). The body's underside (hip + half the stroke, or the bottom of the bean torso) rests on the seat top, and each foot is planted on the floor in front (the back foot at 0.82× the front reach). If the seat is too high, the feet dangle. The legs blend FK → IK over 6 frames when sitting (ease-out) and back over 5 when standing up. The hip never drops below the height that keeps the feet on the floor, so feet never sink mid-transition. A "plop" overshoot was tried and dropped: with planted feet there's nothing to overshoot without pushing the feet through the floor.
- **Props are JSON** (`src/data/props/*.json`: kind, colors, size, `align`, `angle`, sign `text`). The geometry per kind lives in `props/draw.tsx`. Props are drawn in the character layer with the character's stroke (0.75× width), between the arm and the hand nub so the nub reads as the grip. `align: "forearm"` (phone, mic) follows the elbow→hand direction; `"upright"` (cup, laptop, sign) stays vertical. Sign text counter-flips on left-facing characters.
- **Prop track:** `propKeys: [{ frame, hand, prop | null, drop? }]`. A pickup pops in over 4 frames. `drop: true` releases the previously held prop from the hand's position at that frame (re-evaluated, so it stays frame-pure): a small up-and-forward arc, gravity 7 × figure/s², one spin, then it lands lying on its side with one small bounce. It stays on the floor until the same prop is picked up again. Dropped props live in figure space, so **when M4 adds `slideTo` they must move to stage space.**
- **Symbol FX:** `exclaim` (!), `question` (?, wobbles and counter-flips when mirrored) and `speed-lines` (radial shock lines that flicker every 2 frames) join sweat, anger, blush and tears. `!` and `?` have a white halo so they read over any set. `symbolKeys: [{ frame, symbol, durationFrames = 30 }]` pops a symbol on top of the expression, with its own entry pop, for the M4 `symbol` action. `?` is hidden while `!` shows (they share a spot).
- **New poses:** `sit`, `hold-out` (mic / offering), `hold-chest` (cup, laptop), `hold-up` (sign; the hand is far enough forward that the stick clears the face). They are `EXTRA_POSE_IDS`, so M1 labs that cycle `POSE_IDS` are unchanged.

## 2026-09-26 (M4 director)
- **M3 gate passed** (team review of `SetLab.png` + `StagingLabClean.mp4`, 2026-09-26). `m3-staging` merged into `main`.
- **Desk height stays at 0.34 × figure height** (team decision), so a seated character's shoulders and pointing gestures clear the desk.
- **Outdoor palettes stay as reviewed:** park uses `meadow` / `autumn` / `mint`, street uses `city` / `dusk` / `peach`. The defaults are `meadow` (park) and `city` (street).
