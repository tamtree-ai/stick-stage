# Writing a skit

A skit is one file: `public/skits/<skitId>/skit.json` (schema: `src/engine/director/schema.ts`).
Humans write the premise and the lines. The director handles timing, listener reactions,
shots and cuts. Override it only where the joke needs something specific.

```
pnpm voice:say <skitId>     # dev voices (the tamtree harness does this for real)
pnpm compile <skitId>       # validate + show the director's choices (beats, cuts, punch-ins, SFX)
pnpm render <skitId>        # prep → compile → out/<skitId>.mp4   (--debug burns in labels)
```

Example: `public/skits/fine/skit.json`.

## Document

```json
{
  "schemaVersion": 1,
  "meta": { "title": "Not being sarcastic" },
  "set": "office-1",
  "cast": [
    { "id": "milo", "character": "milo", "mark": "left", "seated": true },
    { "id": "june", "character": "june", "mark": "right" }
  ],
  "overlay": { "pov": "POV: your coworker says they're fine" },
  "timing": { "leadInMs": 300, "gapMs": 250, "tailMs": 700 },
  "beats": [ … ]
}
```

- **cast:** `mark` is a set mark (`left`, `center`, `right`). `facing` defaults to facing the center. Optional start state: `pose`, `expression`, `seated` (needs a seat at that mark), and `holding: { "prop": "cup" }`.
- **overlay:** `pov` shows a card at the top (hidden on face close-ups). `subtitles` defaults to `true`.
- **timing:** these are the defaults. The hook line starts 0.3 s in.

## Beats

| Field | Meaning |
|---|---|
| `id` | Also names the voice file (`voice/<id>.wav`) |
| `speaker`, `line` | A spoken beat. The line is exactly what the subtitles show |
| `silent: true`, `durationMs` | A beat with no dialog (default 900 ms): reactions, awkward pauses |
| `expression` | Speaker's expression for the line |
| `pauseBeforeMs` | Dead air before the beat (replaces the 250 ms default gap). It holds on the previous shot |
| `holdAfterMs` | Silence after the line |
| `punchline: true` | Marks the punchline. Default: the last spoken beat |
| `reaction` | Listener's expression on the last word (or in the reaction close-up after the punchline). `false` = none |
| `delivery` | Hint for the TTS in the harness ("flat", "whispered") |
| `shot` | Overrides the default camera for this beat (below) |
| `actions`, `sfx`, `text` | Below |

**Anchors** (`at`) place things inside a beat: `{ "word": "fine", "occurrence": 2 }`,
`{ "ms": 400 }` (from the line start; negative reaches into the pause), or `{ "fraction": 0.5 }`.
Default: the beat start.

**Actions** (`{ "who": "june", "do": …, "at": … }`):

| `do` | Fields |
|---|---|
| `pose` | `pose` (idle, point, shrug, facepalm, arms-up, arms-crossed, think, lean-in, recoil, slump, hands-on-hips, hold-phone, sit, hold-out, hold-chest, hold-up), `durationFrames?` |
| `expression` | `expression` (neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe, confused, deadpan) |
| `look` | `to`: a cast id, `"camera"`, or `{ "x": 0.5, "y": 0.2 }` |
| `turn` | `facing?` (default: flip) |
| `hop`, `nod` | |
| `slideTo` | `mark`, `durationFrames?` (default 8) |
| `hold` / `putAway` / `drop` | `prop` (phone, mic, cup, laptop, sign), `hand?` (`R` default) |
| `symbol` | `symbol` (tears, sweat, blush, anger, exclaim, question, speed-lines), `durationMs?` |
| `sit` / `stand` | Needs a seat at the character's mark |

**SFX:** `{ "id": "record-scratch", "at": …, "volume": 1 }`. Sounds: `pnpm render SfxLab out/SfxLab.mp4`, or see `src/data/sfx.json`.
**Text:** `{ "type": "slam", "value": "SURE.", "at": { "word": "Sure" } }`. Subtitles hide while a slam is up, and a slam ends at the next cut.

## What the director does by default

- **Listeners** look at the speaker, sometimes nod on longer lines, and react on the speaker's
  last word. Reactions come from `src/data/reactions.json` (speaker expression → listener expression).
- **Shots** (plan §5):
  - Open on the two-shot, and back-and-forth lines stay there.
  - The punchline gets an emotion close-up if the speaker's expression is a strong one; otherwise it gets a punch-in on its last word.
  - A silent reaction close-up of the listener follows the punchline. It's added automatically unless the next beat is already silent.
  - A strong emotion (`closeup` hint in the expression) on a silent or reaction beat shows in the two-shot first, then cuts to the face ~10 frames later and holds ≥ 1 s.
  - Budget: at most one emotion close-up per 3 s, and at least 1.5 s between punch-ins.
- **Overrides:** `"shot": { "framing": "close", "on": "milo", "at": {…}, "punchIn": { "on": "june", "at": {…} }, "shake": { "at": {…} } }`.
  Framings are `wide`, `two`, `medium`, `close` and `extreme`; the face framings need `on`.

Errors say where the problem is, what was expected, and show an example:

```
✗ beats[2].actions[0].pose: unknown pose "shurg" (did you mean "shrug"?)
    expected: one of idle, point, shrug, …
    example:  { "who": "june", "do": "pose", "pose": "arms-crossed" }
```
