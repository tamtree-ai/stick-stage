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
