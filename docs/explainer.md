# Explainers: narrated 16:9 data stories

An explainer is a skit with `"format": "explainer"`: an 8–12 minute narrated widescreen video built
from figures, with no cast on stage. Everything else (voice contract, prep, compile, check, render,
Tamtree's check-only step) works as for any skit. Worked example: `public/skits/costco-margins/`
(a 38 s look sample with made-up numbers).

What the format changes:

- `meta.aspect` defaults to `16:9` (set `9:16` for a Shorts cut-down of the same doc).
- `cast` may be empty when there is a `narrator`.
- The directing style defaults to `explainer`: story pacing, no punchline rules, QA length band 5–15 min.
- QA adds the variety rules below, and the check report carries a `fingerprint`.

## Grounds

`explainer-paper` (light, ink figures), `explainer-night` (dark, chalk figures), `explainer-grid`
(blueprint). No furniture: the frame is for figures. Change grounds between scenes for variety.

## Placing figures: slots

Give a figure `"slot"` instead of `at`. Slots keep the bottom band free for captions.

| Slot | Where (16:9) |
|---|---|
| `full` | the whole picture area |
| `left` / `right` | half each, side by side (a comparison) |
| `center` | a big single number or small chart |
| `top` | a title strip |
| `lower-third` | a name or a fact, bottom left |
| `inset` | a small box top right |

## Data: facts come from code

```json
"datasets": {
  "margins": {
    "columns": ["store", "gross_pct"],
    "rows": [["Costco", 12.6], ["Walmart", 24.1]],
    "source": { "name": "Company 10-K filings", "url": "https://…", "retrieved": "2026-10-01" }
  }
}
```

The first column is the key. Tamtree's data nodes fill these; the writer never types a number into
a figure. Figure params reference them:

- `"@margins.gross_pct"`: the column as `[[key, value], …]` (a series, bars, a choropleth).
- `"@margins.gross_pct[Costco]"`: one number (a counter's `value`).

Beats tag the numbers they say, and the compiler checks each one rounds to its cell (a column in
billions matches "4.8 billion" or "4.8"). A wrong number fails compile with `number-mismatch`; a
number the line doesn't contain fails with `number-not-said`.

```json
{ "id": "n4", "speaker": "narrator", "line": "Costco keeps about 13 cents.",
  "numbers": [ { "text": "13", "data": "@margins.gross_pct[Costco]" } ] }
```

Every dataset's `source` goes in the post text under "Sources", and on screen (bottom right) while
a figure built from it is up. `"illustrative": true` marks made-up numbers, on screen and in the text.

## Moving the camera: focus

```json
{ "do": "focus", "id": "bars", "at": { "word": "Costco" } }
{ "do": "focus", "id": "bars", "part": "right", "zoom": 1.6 }
{ "do": "focus", "id": "none" }
```

A focus eases the camera onto a figure (fitted above the captions) or one of its anchors (`part`,
which may crop), and holds until the next focus. `"none"` pulls back out. Figures on
`layer: "screen"` stay put.

## Chapters

`"chapter": "Thin margins"` on a scene starts a YouTube chapter there. The post text lists them
(`0:00 …`), with an "Intro" at 0:00 if the first scene has none. YouTube needs at least three, each
at least 10 s: the compiler warns otherwise.

## Variety rules (QA)

YouTube demonetises "content that looks like it's made with a template", so these are self-check
**errors** for an explainer:

| Check | Rule |
|---|---|
| `variety-kinds` | at least 6 distinct figure kinds per 8 minutes (pro rata, at least 2) |
| `variety-run` | no kind leads more than 3 spoken beats in a row |
| `variety-change` | something new on screen (a figure shown, changed or focused, a scene change, a card) at least every 8 s |
| `variety-hook` | something moves in the first 3 s |

Across videos StickStage is stateless: a render's `check.fingerprint` (figure order, layout, sets,
opening) is for the caller to keep. Pass the last 30, most recent first, as render option
`history: [fingerprint, …]` and the check warns (`sameness`) when the new video scores 0.8 or more
against one of them, or opens with the same figures as one of the last five.

## Long renders

An 8-minute video is 14,400 frames: more than one 15-minute Lambda. The render cuts the program
into segments at scene changes, at most a minute each. On Lambda the invocation Tamtree calls
fans them out over up to 8 copies of itself and joins the pieces (`lambda/fanout.ts`, setup in
`lambda/README.md`). Locally and in `pnpm serve` they render one after another and are cached, so
editing one scene re-renders only that scene.
