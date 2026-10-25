---
name: story-episode
description: Make a narrated 16:9 cartoon story with StickStage's flat shape cast (Tofu, Bobo, Pim, Mabel, Otto, Fennel, Biscuit, Wren, Blip) — an idea to a checked, voiced MP4. Covers the story format (style "story", narrator, scenes with described places), new characters written as shape specs, drawn props for missing objects, the missing-asset report, and the review loop. Use when asked for a story, an episode, a bedtime or kids' cartoon, a Hey Duggee–style video, a new shape character, or "make a cartoon about X".
---

# Story episodes

Guide: `docs/stories.md`. Plan and history: `../planning/2026-10-24-shape-toon-stories/` and the
"shape tier" entries in `DECISIONS.md`. Worked examples: `public/skits/lost-balloon/`,
`public/skits/biscuit-shell/`.

## Steps

1. **Write it.** Run `pnpm story prompt "<idea>" --seconds=<n>` and follow that prompt yourself
   (you are the writer), or use `--model` with the user's own model. Rules that matter: `style:
   "story"`, a narrator, 2–4 scenes each with its own `place`, at most 4 cast, lines under 15 words,
   and a mark in each scene for anyone who speaks there (the skit-level mark may be offstage).
2. **Land it.** Run `pnpm story draft <id> --reply=<file>`. Read the missing-asset report and fix
   each row by its rung: near (use the suggestion), spec (add the character to `characters`),
   place (describe it), draw (`pnpm story prop <id> "<noun>" --reply=<file>`, drawn props only, ±0.6
   bounds), cheat (narrate it, cut away, hold a reaction).
3. **Voice and check.** Run `pnpm voice:tts <id>`, then `pnpm check <id>`. Fix every error:
   `speaker-offstage` (give a mark), `emotion-closeups` (move the expression early in the line),
   `contrast` (a shape figure the colour of the place: change the place or the colour).
4. **Render and review as video.** Run `pnpm render <id>`. Pull frames with
   `ffmpeg -i out/<id>.mp4 -vf "select='not(mod(n\,90))',scale=640:-1,tile=3x5" -frames:v 1 out/<id>-frames.png`
   and look: everyone on stage who speaks, nobody floating, props in paws, captions clear of faces.
5. **Hand back.** Give the MP4 path and the frame sheet. Nothing is approved or posted. New
   characters or props promoted to `src/data/` change the catalog hash, so say t-shoot needs a
   re-vendor.

## Don't

- Don't name a prop, pose or set that isn't in the catalog without drawing or describing it.
- Don't hand-draw a new character in code when a spec will do. New part kinds go in
  `src/engine/rig/shape/` and need the owner's OK on `ShapeLab`.
- Don't copy an existing show's characters. Original designs only (CLAUDE.md rule 6).
