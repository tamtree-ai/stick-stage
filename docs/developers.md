# For developers

These pages are for people changing Stick Stage, or calling it from another program. If you are making a video, start at [the manual](README.md). Field lists for a finished skit stay in [The skit file](skits.md), [Voices](voice-contract.md), and [The render service](render-service.md).

Read these in order when you are adding art or wiring a caller:

1. This page. How a frame is drawn, and which files you edit.
2. [Creating characters](creating-characters.md).
3. [Creating backgrounds](creating-backgrounds.md).
4. [Creating props](creating-props.md).
5. [Programmatic guide](programmatic.md).

## What Stick Stage is

Stick Stage turns a JSON skit into a vertical or widescreen video on [Remotion](https://www.remotion.dev). A director turns beats into timing, reactions, shots, and cuts. A rig draws the people. Code draws the room. A prepare step writes mouth shapes from audio before the render starts.

The package name is `stickstage`. Inside this repo the source is `src/engine`, the shipped JSON is `src/data`, and the Remotion app is `src/app`. The publishable package is `packages/stickstage`, which re-exports those modules. See [the programmatic guide](programmatic.md) for the five import paths.

## How one frame is drawn

Every picture is a pure function of the frame number and the compiled program. The same inputs always draw the same pixels.

Draw order, back to front, under one camera:

1. Set background layers (`set.layers`): wall, floor, sky, furniture behind the people.
2. Actors. Each actor is a solved skeleton, a face, accessories, and any prop in a hand.
3. Set foreground (`set.foreground`): a desk that should cover a seated person's legs.
4. Text: subtitles, a POV card, a slam, a title card, a list.

The camera (`wide`, `two`, `medium`, `close`, `extreme`) is chosen by the director, then applied to that stack. Nothing animates with CSS, `useState`, `useEffect`, `Date`, or `Math.random()`. Seeded `rand()` and `noise()` in `src/engine/lib/seed.ts` are the random functions.

## What is a file, and what is a drawing

| You are adding | You write | The drawing lives in |
|---|---|---|
| A person who reuses hair, a torso, and the shared poses | `src/data/characters/<id>.json`, then register it in `src/data/index.ts` | `src/engine/rig/` |
| A new hair, shell, tail, or glasses shape | An entry in `src/engine/rig/accessories.tsx`, then a character JSON that names it | That file |
| A pose or a face | `src/data/poses/<id>.json` or `src/data/expressions/<id>.json` | The rig and `src/engine/face/` already draw every angle and every mouth |
| A room made of existing furniture | `src/data/sets/<id>.json` | `src/engine/set/parts/` |
| A new piece of furniture | A component, a line in `PART_INFO`, then a set JSON that places it | `src/engine/set/parts/` |
| A recolor of phone, mic, cup, laptop, or sign | `src/data/props/<id>.json` with that `kind` | `src/engine/props/draw.tsx` |
| A new object in the hand | `src/data/props/<id>.json` with `"kind": "drawn"` and a `parts` list | The drawn renderer. A new coded kind is only for a shape the part list cannot make |
| One video | `public/skits/<id>/skit.json` | The director |

A character, a pose, an expression, a prop, and a set are all documents with `schemaVersion: 1`. A skit is `schemaVersion: 2`. Loading runs `migrate()` first, then the zod schema. An invalid document throws with the id and every problem.

Colors on a person or a prop are hex (`#1b1b1f`). Colors in a room are palette tokens. A set part does not contain a raw hex.

## The path from a topic to a file

```
brief.json  →  premise.json  →  skit.json
                                    ↓
                              voice.json   (the harness, or pnpm voice:say)
                                    ↓
                         generated/voice.prepared.json   (prep: word times + mouths)
                                    ↓
                         compileSkit → Program
                                    ↓
                         checkSkit
                                    ↓
                         Remotion render → MP4, .srt, post .txt, post .json
```

- A **brief** is a topic and a cast, before any lines. `src/engine/writer` builds the prompt and turns the model's reply into a premise.
- A **premise** is the joke: who, the lines, which line is the punchline. `fromPremise` stages it into a skit. The director still chooses the cuts.
- A **skit** is what gets rendered. Humans may edit it. The compiler checks that every character, set, pose, expression, prop, and sound id exists.
- **Voice** is an input. Stick Stage does not call a text-to-speech provider. See [Voices](voice-contract.md).
- **Prepare** aligns words and, when Rhubarb is installed, mouth shapes. It caches by content hash. The render reads only local files.
- **Compile** produces a `Program`: scenes, frame counts, shots, punch-ins, sound, slams. It throws `SkitError` with a path, a message, what was expected, and an example.
- **Check** is the self-check: story rules, safe area, contrast, and whether two people in the cast read as the same person.

`catalog.version` (`c1-` plus 16 hex digits) is a hash of the registry a skit was checked against: characters, poses, expressions, props, sets, sound effects, reactions, the safe area, styles, and gags. `GET /catalog` reports it. `POST /validate` refuses a body whose `catalog_version` differs.

## Where the source sits

| Path | What it owns |
|---|---|
| `src/engine/lib` | Math, easing, seeds, color, screen-text limits |
| `src/engine/rig` | Character and pose schemas, skeleton, limbs, idle, seats, gait, `<Actor>` |
| `src/engine/face` | Expressions, eyes, brows, mouths, visemes, symbols |
| `src/engine/props` | Prop schema, the five drawings, hold and drop |
| `src/engine/set` | Set schema, palettes, parts, seating |
| `src/engine/shots` | The stage stack and `frameShot` |
| `src/engine/director` | Skit schema, compile, shots, camera, gags |
| `src/engine/text` | Captions, POV, slam, cards, safe area |
| `src/engine/voice` | `voice.json` schemas, word alignment, placeholder timings |
| `src/engine/templates` | Premise → staged skit |
| `src/engine/writer` | Brief → prompt → premise or revised skit |
| `src/engine/qa` | `checkSkit` |
| `src/data` | The shipped registry. `index.ts` validates it on import |
| `src/node` | Workspace, prepare, compile-on-disk, Remotion backend |
| `src/app` | Remotion root and the labs |
| `public/skits/<id>/` | One video: `skit.json`, `voice.json`, `voice/*.wav` |

`src/engine/**` does not call `registerRoot`, does not read `process.env`, and does not touch the filesystem. `src/app` and `scripts` do. The package root (`stickstage`) has no React. `stickstage/remotion` has the components. `stickstage/node` has the filesystem.

## Rules that keep a render stable

1. Frame-pure. Animation is `frame` plus props.
2. Data carries `schemaVersion`. Components do not hardcode a gag's timing; the gag library does.
3. No network while rendering. Voices are prepared first.
4. The engine stays app-agnostic, as above.
5. Keep modules small. The convention in this repo is about 300 lines.
6. Original characters. Match the genre. Do not copy another show's cast.

## Two frames

| Aspect | Pixels | Who it is for |
|---|---|---|
| `9:16` | 1080×1920 | Shorts. The default when a document omits `aspect`. |
| `16:9` | 1920×1080 | Widescreen. Characters and sets name it. |

A skit, its set, and every catalog character in the cast must share one aspect. The compiler errors with `aspect-set` or `aspect-character` when they differ. A character document that omits `aspect` is stamped `9:16` when the library loads. A workspace character on a single skit may omit it and follow that skit.

Marks on a set are fractions of frame width. The usual ones are `left`, `center`, and `right`. `off-left` (−0.22) and `off-right` (1.22) are entrances and exits. They are not stored on the set; the director adds them.

## Labs

Remotion Studio (`pnpm dev`) includes labs that draw the registry without a skit.

| Composition | What you are looking at |
|---|---|
| `CharacterLab` | Two people cycle the shared poses and expressions. Props: `left`, `right`, `set`. |
| `FaceLab`, `CloseupLab` | Eyes, brows, mouths, symbols. |
| `PoseLab` | One pose, held. |
| `PropLab` | Every prop in a hand, including a drop. |
| `SetLab` | Every set part, three palettes, three seeds. |
| `SfxLab` | Every synthesized sound. |

Stills, for layout only:

```sh
pnpm still CharacterLab out/characters.png --frame=40 --props='{"left":"milo","right":"june"}'
pnpm still SetLab out/SetLab.png --props='{"kits":["park"],"tileWidth":200}'
pnpm still PropLab out/PropLab.png --frame=20
```

Motion is reviewed as video: `pnpm render CharacterLab out/CharacterLab.mp4`.

## Commands you will actually run

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm compile <skitId>     # validate, print the director's choices
pnpm render <skitId>      # prep, compile, out/<skitId>.mp4
```

Run the three checks before a commit. `pnpm compile` writes `public/skits/<id>/generated/timeline.json`.

Next: [Creating characters](creating-characters.md).
