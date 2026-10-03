---
name: science-short
description: Make or fix a science/maths short for the science channel: a myth-flip dialog with Vera (host) and Gus (skeptic) as toons, figures that change on the spoken word, claims with sources, and the owner's approval gate. Covers the premise, figures, hook card, sets, staging, render and the hand-back. Use when asked for a science video, an explainer short, a myth-busting short, or to restage/fix fine-print, coin-due, old-light or slow-electrons. Never approves a skit or marks a claim as checked.
---

# Science short

A science short is a ~30 s **myth-flip**: Gus states something most people believe, Vera shows
what really happens with a figure or prop, says why, says why the myth felt true, and lands a
takeaway the viewer can repeat. Read these first:

- `docs/science-channel.md`: format, roles, steps, accuracy, the look
- `docs/figures.md`: every figure kind, its params and cues
- `src/data/characters/vera.md`, `gus.md`: the cast bibles
- `skills/skit-director/SKILL.md`: the general staging rules (one thing at a time, pauses, the
  loop). They all apply here.

Reference skit: `public/skits/fine-print/` (hand-staged to a storyboard; the storyboard and its
retention reasons are in `../planning/2026-10-02-toon-characters/plan.md`). Channel plan and gate:
`../planning/2026-09-29-science-channel/`.

## Hard rules

1. **Never approve, never mark a claim checked.** `checkedBy`, `approval` and `--by=` belong to
   the owner. You may run `pnpm approve <id> --check` to report status.
2. **Every number or fact on screen or in a line has a claim with a real source.** A spoken
   number with no claim is a `claim-missing` warning: fix it, don't ignore it. If you wrote a
   source from memory, say so in the hand-back so the owner checks it first.
3. **Say where the picture breaks** in `simplifications` (it goes in the pinned comment).
4. **No AI images.** Images are NASA/ESA (or similarly licensed) inserts with credits
   (`src/data/images.json`). Everything else is drawn.
5. **Don't rebuild a hand-staged skit.** If `skit.json` was edited by hand (fine-print is),
   never run `pnpm new <id> --force`. Edit `skit.json` directly.
6. Any edit after approval clears it. The owner approves again.

## Steps

```bash
pnpm new <id> --template=myth-flip     # premise.json from src/data/templates/myth-flip.json
# write lines (with roles), claims, simplifications and figures in premise.json
pnpm new <id>                          # stage it into skit.json
# refine skit.json (below)
pnpm voice:say <id>                    # dev voices; the harness writes the real voice.json
pnpm compile <id>                      # diagnostics, shots and why, length
pnpm render <id>                       # out/<id>.mp4 (draft renders are not gated)
pnpm approve <id> --check              # what the owner still has to check
```

The owner then checks the sources, runs `pnpm approve <id> --by=<name>`, and posts with
`pnpm render <id> --post`.

## Writing the premise

- **Roles in order:** `myth`, `pushback`, `prediction`, `demo`, `reaction`, `why`,
  `why-it-felt-true`, `takeaway`, optional `loop`. A myth-flip needs `myth` and `takeaway`.
- **Hook in 0–2 s.** The premise is clear by line 2, and the first laugh lands by ~10 s.
- **`spoken`** when the caption and the voice differ (`"5%"` vs `"five percent"`, equations).
  Names and jargon get `pronounce` hints on the voice request from `src/data/pronunciations.json`.
  Add a missing word there instead of misspelling the line.
- **Length:** aim for 30 s with the real voice. Dev voices run long; cut filler words before cutting a beat.

## Staging: one visual event per beat

Every line gets one change on screen, anchored on the word it illustrates
(`"at": { "word": "matter" }`). Tools, all used in `fine-print`:

| Need | Use |
|---|---|
| Muted viewers know the premise at frame 0 | `overlay.hook`: a short card that leaves when line 1 ends |
| A number grows on its word | a figure `set` cue with `durationMs` (tweens) |
| Shares of a whole (they add to 100) | `progress`, not `histogram`; `readout`, `ask` ("?"), `dim`, `here` chip |
| An object the line names | `galaxy`, `orbit`, `wave`, `particles`, `image`, … (`docs/figures.md`) |
| An impact | `burst` figure + one SFX (`thud`, `pop`, `zap`) |
| An inset that survives a punch-in | figure `layer: "screen"` |
| A prop that changes state | swap props with a second `hold` (`book-open` → `book`); start state via cast `holding` |
| The first laugh | the `reaction` line: `close` shot on the skeptic, `double-take` gag, `exclaim` symbol |
| The punchline | slam text repeating the punch word; the director adds the punch-in and the reaction |

Keep the screen changing every 3–5 s, one pause at most (≤ 0.6 s) and no dead air.

**Sets:** `space-2` (Nebula night, dark sky; the palette's `rim` keeps the cast readable),
`space-1`, `lab-1`, `blueprint-1`, `void-1`. Props: categories `maths` and `science`
(`docs/skits.md`, prop table).

## Checking it

1. `pnpm compile <id>`: no errors. Every warning other than `approval-unapproved` is fixed or
   explained.
2. Render, then look at frames at the hook (frame 0–15), the first laugh, and the punchline. To
   get stills from the MP4:
   `ffmpeg -i out/<id>.mp4 -vf "select='eq(n\,0)+eq(n\,330)',scale=540:-1,tile=2x1" -frames:v 1 out/check.png`.
3. Text never covers a face; captions, the hook card and figures don't overlap.
4. `pnpm test && pnpm typecheck && pnpm lint` if you changed anything outside `public/skits/`.

## Hand back

The MP4 path, the length, the list of claims with the ones whose sources you wrote from memory
marked, the simplifications, and what the owner should judge: does the hook read muted, does the
first laugh land by ~11 s, and is it accurate? Say plainly that it is **not approved**.
