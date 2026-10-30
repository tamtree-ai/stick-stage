---
name: explainer
description: Make a narrated 16:9 data-story explainer with StickStage (`format: "explainer"`) — a topic and its data to a checked, voiced MP4 with charts, maps and counters bound to datasets, chapters, and the anti-template variety rules. Use when asked for an explainer, a business or economics "data story", a long-form YouTube video, a video built from a dataset, or "explain X with charts".
---

# Explainers

Guide: `docs/explainer.md` (format, slots, data binding, focus, chapters, variety rules). Figure
params: `docs/figures.md` (kinds `line`, `bars`, `counter`, `map`, plus `label`, `callout`,
`progress`, `image`…). Worked example: `public/skits/costco-margins/skit.json`. Plan:
`../planning/2026-10-30-explainer-mode/plan.md`.

## Steps

1. **Get the data first.** Every number on screen or in a line comes from a `datasets` table with a
   `source` (name, url, retrieved). In production Tamtree's data nodes fill them. If you are given
   no data, use made-up numbers only with `"illustrative": true`, and say so in the hand-back.
2. **Write the script as scenes.** One idea per scene, a `chapter` title on each (at least three
   chapters, each 10 s or more), lines under ~20 words, all spoken by the `narrator`. No `cast`.
3. **Stage each scene with figures.** Pick a `slot` per figure (`full`, `left`/`right`, `center`,
   `top`, `lower-third`, `inset`), bind params to data (`"@id.column"`, `"@id.column[key]"`), and
   cue them on words: `show`, `state`, `set` (draw a line on, tick a counter, fly the map with
   `zoom`), `focus` / `focus none`. Alternate grounds (`explainer-paper`, `explainer-night`,
   `explainer-grid`) and `variant` (`clean` / `bold`) between scenes.
4. **Tag spoken numbers.** Each number a line says gets `"numbers": [{ "text": "13", "data": "@margins.gross_pct[Costco]" }]`.
5. **Check.** `pnpm voice:tts <id>` (or `voice:say`), then `pnpm check <id>`. Fix every error:
   `number-mismatch` / `number-not-said` (the line or the data is wrong: never "fix" data to match
   a line), `variety-kinds` (use more kinds), `variety-run` (switch kind sooner), `variety-change`
   (a cue at least every 8 s), `variety-hook` (open on a figure moving), `data-ref`, `map-zoom`.
6. **Render and look as video.** `pnpm render <id>`, then a frame sheet:
   `ffmpeg -i out/<id>.mp4 -vf "select='not(mod(n\,150))',scale=640:-1,tile=3x5" -frames:v 1 out/<id>-frames.png`.
   Look for text over captions, crowded labels, and stretches where nothing changes.
7. **Hand back** the MP4, the frame sheet, the chapters from the post text, and which numbers are
   illustrative. Nothing is approved or posted.

## Don't

- Don't type a number into a figure or a line that isn't in a dataset.
- Don't reuse the same scene order, slots and grounds as the last video: the `sameness` check
  compares fingerprints when Tamtree passes `history`.
- Don't put figures where captions go (the bottom ~16 %): use slots.
