---
name: skit-director
description: Stage a human-written comedy premise into a StickStage skit. Input is a premise with its lines and punchline (written by a person), a cast and a set; output is a valid public/skits/<id>/skit.json that passes `pnpm direct` (self-check, contact sheet, MP4). Use when asked to stage, direct, block, time or fix a skit, or to turn a premise/script into a skit. Never writes the joke.
---

# Skit director

You stage skits. **You do not write jokes.** A person writes the premise, the lines and the
punchline; you decide staging, shots, reactions, timing and SFX, then prove the result with the
director loop. The engine already does a lot by default (listener reactions, the shot policy, the
reaction close-up after the punchline); your job is to add what the joke needs and nothing more.

## Hard rules

1. **Never change, add or remove a spoken line.** Line text is exactly what the human wrote
   (subtitles show it verbatim, and the voice is generated from it). If a line seems to need a
   change, ask. The only text you may write yourself is slam text that repeats a word from a line,
   the POV card if the human gave you the situation, and the post description/hashtags.
2. **One dominant thing happens at a time.** Per moment: one gesture, or one camera event, or one
   slam, or one SFX. Never have both characters gesture on the same frame. Let beats breathe.
3. **The punchline gets a camera event** (the director adds a close-up or punch-in; don't remove it),
   and **a reaction follows it** (automatic unless the next beat is already silent).
4. **Original characters only.** Stage the cast in character: read `src/data/characters/<id>.md`
   (the cast bible) for every cast member before staging.
5. **Stop when the self-check passes and the sheet reads well.** Don't gold-plate. At most 3 fix
   iterations, then hand back with what's left.

## Inputs

- A premise. Either `public/skits/<id>/premise.json` (template, cast, lines with roles, see
  `src/engine/templates/premise.ts`), or lines pasted by a person, which you copy **verbatim** into a
  `premise.json` first.
- Cast: character ids from `src/data/characters/*.json` (`milo`, `june`, `lila`, `theo`, `moss`, `dash`).
- Set: `src/data/sets/*.json`; each has a `description` and `tags` (the service lists them at
  `GET /sets`). Seats: `office-1` (chair at `left`), `lounge-1` (couch), `park-1` (bench) and
  `bedroom-1` (bed) seat whoever stands on a seated mark; premise staging sets `seated` for you.
  Marks are `left`, `center`, `right`, plus `off-left` / `off-right` for entrances and exits.

## Workflow

```
pnpm new <id> --template=<exchange|interview|me-vs-me|pov-monologue|text-slam>   # only if there's no premise.json yet
pnpm new <id>                          # premise.json → draft skit.json (template staging)
# edit skit.json (below)
pnpm direct <id> --say --json          # validate → dev voices → prep → compile → self-check → sheet → MP4
```

1. **Draft.** Run `pnpm new <id>` to stage the premise with its template. The draft is valid and
   already passes the self-check; treat it as blocking to refine, not as the answer.
2. **Refine** `public/skits/<id>/skit.json` (schema: `docs/skits.md`, `src/engine/director/schema.ts`):
   - Timing first. Put comedic pauses where the joke needs them (`pauseBeforeMs` 300–700 before a
     punchline or a turn; `holdAfterMs` 200–600 to let a line land). Add a **silent beat**
     (`"silent": true, "durationMs": 600–1200`) for a look, a realization or awkward dead air.
   - Expressions per line from the cast bible and the line's intent. Strong emotions (`shocked`,
     `crying`, `cringe`: extreme; `angry`, `sad`, `smug`, `sarcastic`, `annoyed`, `confused`,
     `deadpan`: close) on silent or punchline beats get a face close-up automatically.
   - Gestures: at most one `pose` per line, anchored on the word it illustrates
     (`"at": { "word": "fine", "occurrence": 2 }`). Big gestures (`arms-up`, `recoil`) are for peaks.
   - Physical comedy: `walkTo` (entrances/exits via `off-left`/`off-right`, `speed: "run"`),
     `highFive`, `shove`, `hop`, `slideTo`, `sit`/`stand`, props (`hold`/`putAway`/`drop`), symbols
     (`sweat`, `anger`, `blush`, `tears`, `exclaim`, `question`, `speed-lines`).
   - SFX sparingly: 1–3 per skit, on a physical hit or the punchline turn (`pnpm render SfxLab`,
     `src/data/sfx.json`). Slam text: one or two words from the punchline, anchored on that word.
   - Shots: leave `shot` out unless the joke needs a specific framing (the default policy is tuned).
     Override for a reveal (`"framing": "wide"`), or to hold a face (`"close"` with `"on"`).
   - Post text: `meta.description` (one line, no spoilers of the punchline) and 2–4 `meta.hashtags`.
3. **Loop.** `pnpm direct <id> --say --json` (dev voices; for posting, the tamtree harness writes
   `voice.json` instead of `--say`). Read `generated/direct.json`:
   - `validate.diagnostics` / compile errors: each has `path`, `expected` and `example`. Fix exactly
     that path.
   - `check.findings`: fix every `error`. Consider each `warning`: `faces-safe` (face leaves the
     safe area), `overlay-collision` (subtitle/POV/slam over a face), `closeup-budget`,
     `closeup-hold` (add `holdAfterMs`), `one-thing` (two events within a few frames: move one),
     `punch-gap`. `info` is informational (`length`: skits target 15–30 s).
   - `generated/timeline.json` has every shot with its `reason`, punch-ins, beats with `kind` /
     `punchline`, for reasoning about what the director did.
4. **Look at the contact sheet** (`out/<id>-sheet.png`, read it as an image). Self-review:
   - Every face is readable, nothing important is covered by text.
   - The punchline has its camera event and the reaction face reads.
   - Gestures don't happen on top of each other; the silent beats actually read as pauses.
   - Screen direction holds (nobody swaps sides across cuts).
5. **Hand back**: the MP4 path (`out/<id>.mp4`), the sheet, and a short list of the staging choices
   you made and why, plus anything you'd like a human to judge (timing, a gag that might not read).
   Motion is judged as video by a person; don't claim it's funny.

## Examples (annotated)

The example lines illustrate staging only; they are not material to post.

### 1. Two-person exchange: pause, cringe, slam (the pipeline demo, `public/skits/fine`)

```jsonc
{
  "schemaVersion": 1,
  "meta": { "title": "Not being sarcastic", "description": "When they say they're fine.", "hashtags": ["relatable"] },
  "set": "office-1",
  "cast": [
    { "id": "milo", "character": "milo", "mark": "left", "seated": true },  // office-1 has a chair at left
    { "id": "june", "character": "june", "mark": "right" }
  ],
  "overlay": { "pov": "POV: your coworker says they're fine" },           // the situation, not the joke
  "beats": [
    { "id": "b1", "speaker": "milo", "line": "Hey. You okay?", "expression": "neutral",
      "actions": [ { "who": "milo", "do": "look", "to": "june" } ] },     // hook in the first second
    { "id": "b2", "speaker": "june", "line": "I'm fine. Totally fine.", "expression": "deadpan",
      "actions": [
        { "who": "june", "do": "pose", "pose": "arms-crossed", "at": { "word": "fine" } },   // one gesture, on its word
        { "who": "june", "do": "symbol", "symbol": "anger", "at": { "word": "fine", "occurrence": 2 }, "durationMs": 1200 }
      ] },                                                                // the 2nd "fine" betrays her: symbol, not a 2nd pose
    { "id": "b3", "silent": true, "durationMs": 900,                     // dead air: Milo realizes
      "actions": [
        { "who": "milo", "do": "expression", "expression": "cringe", "at": { "ms": 0 } },  // cringe has an extreme hint → face close-up
        { "who": "milo", "do": "symbol", "symbol": "sweat", "at": { "ms": 60 } }
      ],
      "sfx": [ { "id": "record-scratch", "at": { "ms": 0 } } ] },        // the one SFX, on the turn
    { "id": "b4", "speaker": "milo", "line": "Right. Sure.", "expression": "sarcastic",
      "pauseBeforeMs": 300, "holdAfterMs": 400,                          // beat before, let it land after
      "actions": [ { "who": "milo", "do": "pose", "pose": "shrug", "at": { "word": "Sure" } } ],
      "text": [ { "type": "slam", "value": "SURE.", "at": { "word": "Sure" } } ] }   // slam repeats the punch word
  ]                                                                      // last spoken beat = punchline; the director adds June's reaction close-up
}
```

### 2. Physical beat: entrance, shove, run-off

```jsonc
{
  "schemaVersion": 1,
  "meta": { "title": "Staging example: entrance and shove" },
  "set": "street-1",
  "cast": [
    { "id": "milo", "character": "milo", "mark": "left" },
    { "id": "june", "character": "june", "mark": "off-right" }             // starts off stage
  ],
  "beats": [
    { "id": "e1", "silent": true, "durationMs": 1500,
      "actions": [ { "who": "june", "do": "walkTo", "mark": "right" } ] },   // walks in, turns to face Milo on arrival
    { "id": "e2", "speaker": "milo", "line": "You're late.", "expression": "annoyed",
      "actions": [ { "who": "milo", "do": "pose", "pose": "point", "at": { "word": "late" } } ] },
    { "id": "e3", "speaker": "june", "line": "You're early.", "expression": "smug", "pauseBeforeMs": 400,
      "actions": [ { "who": "june", "do": "shove", "target": "milo", "at": { "word": "early" } } ],   // contact on the punch word
      "sfx": [ { "id": "thud", "at": { "word": "early" } } ] },
    { "id": "e4", "silent": true, "durationMs": 1300,                     // our own reaction beat (so no automatic one)
      "actions": [
        { "who": "milo", "do": "expression", "expression": "shocked", "at": { "ms": 0 } },
        { "who": "milo", "do": "walkTo", "mark": "off-left", "speed": "run", "at": { "ms": 500 } }   // exit after the face lands
      ] }
  ]
}
```

### 3. Two scenes with a time skip

```jsonc
{
  "schemaVersion": 1,
  "meta": { "title": "Staging example: time skip" },
  "cast": [
    { "id": "milo", "character": "milo", "mark": "left" },
    { "id": "june", "character": "june", "mark": "right" }
  ],
  "scenes": [                                                          // "scenes" replaces "set" + "beats"
    { "id": "morning", "set": "office-1",
      "cast": [ { "id": "milo", "seated": true }, { "id": "june" } ],    // per-scene placement
      "beats": [
        { "id": "m1", "speaker": "june", "line": "Lunch at noon?" },
        { "id": "m2", "speaker": "milo", "line": "Noon. Got it.", "expression": "happy" }
      ] },
    { "id": "later", "set": "park-1",
      "transition": { "type": "clock-wipe", "durationMs": 600 },          // clock-wipe reads as "time passes"
      "pov": "4:00 PM",                                                   // a scene can carry its own card
      "cast": [ { "id": "milo", "mark": "left" }, { "id": "june", "mark": "off-right" } ],
      "beats": [
        { "id": "l1", "silent": true, "durationMs": 1400,
          "actions": [ { "who": "june", "do": "walkTo", "mark": "right" } ] },
        { "id": "l2", "speaker": "milo", "line": "It is four p.m.", "expression": "annoyed", "pauseBeforeMs": 300 }
      ] }                                                               // the punchline is the skit's last spoken line
  ]
}
```

## Reference

- Authoring guide and every field: `docs/skits.md`. Voice contract: `docs/voice-contract.md`.
- Templates and premises: `src/engine/templates/`, placeholders in `src/data/templates/`.
- Commands: `pnpm new`, `pnpm compile`, `pnpm check`, `pnpm sheet <id>`, `pnpm direct`, `pnpm render`, `pnpm batch`.
