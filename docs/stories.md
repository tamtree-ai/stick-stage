# Story episodes (the shape cast)

A story episode is a narrated 16:9 cartoon, 30 seconds to a few minutes long, drawn in the flat,
outline-free **shape** style. Nothing is generated as pictures. The characters are specs, the
places are descriptions, and the engine draws everything in code.

Two finished examples: `public/skits/lost-balloon/` and `public/skits/biscuit-shell/`.

## From an idea to an MP4

```sh
pnpm story prompt "Pim learns to swim" --seconds=60   # system + prompt for any chatbot
pnpm story draft pim-swims --reply=reply.json         # the chatbot's JSON → public/skits/pim-swims/skit.json
pnpm story draft pim-swims "Pim learns to swim" --model   # or your own model (LOCAL_LLM_*, see scripts/lib/llm.ts)
pnpm story assets pim-swims                           # what the story asks for that the catalog lacks
pnpm story prop pim-swims "rubber ring" --model       # draw a missing prop into the story
pnpm voice:tts pim-swims                              # Kokoro voices on this computer
pnpm direct pim-swims                                 # prep → compile → self-check → contact sheet → MP4
```

`draft` writes the file even when something is missing, so you can fix it by hand. It prints the
missing-asset report and the compiler's errors.

## The document

A story is an ordinary skit (`docs/skits.md`) with three differences:

```jsonc
{
  "schemaVersion": 2,
  "meta": { "title": "The Lost Balloon", "aspect": "16:9" },
  "style": "story",                        // slower pacing, no punchline rules, lower captions
  "narrator": { "id": "narrator", "captionStyle": "italic" },
  "cast": [ { "id": "tofu", "character": "tofu", "mark": "left" } ],
  "scenes": [
    {
      "id": "park",
      "place": { "setting": "park", "time": "sunset", "features": ["pond"], "seats": ["left"] },
      "beats": [ { "id": "n1", "speaker": "narrator", "line": "Tofu sat by the pond.", "focus": "tofu" } ]
    }
  ],
  "characters": [ /* new shape characters, as specs */ ],
  "props": [ /* new drawn props */ ]
}
```

### `place` instead of `set`

| Field | Values |
|---|---|
| `setting` | park, garden, meadow, forest, beach, village, clubhouse, bedroom, living-room, kitchen |
| `time` | day (default), sunset, night |
| `season` | summer (default), autumn |
| `features` | tree, apple-tree, tall-tree, bush, flowers, pond, rock, fence, house, clubhouse, bench, path, window, door, rug, bed, table, shelf, sofa |
| `seats` | marks whose cast member sits: a bench outdoors, the bed in a bedroom, a sofa in other rooms |
| `seed` | another number re-rolls the layout |

Each setting brings its own features (a park has trees, a path and flowers). The composer
(`src/engine/set/compose.ts`) puts tall things at the edges and buildings behind, keeps the marks
clear, and produces the same layout every time for the same seed. The composed sets travel inside
the compiled program, so they need no catalog entry. The catalog also has four ready-made story
sets: `story-park`, `story-clubhouse`, `story-garden`, `story-bedroom`.

Marks in a 16:9 story place: `far-left`, `left`, `center`, `right`, `far-right`, plus `off-left` /
`off-right` for entrances (`walkTo`).

### Colour looks

Described places come in three colour looks. Set one for the whole episode with a top-level
`"look"`; a scene's `place` may override it with its own `"look"`.

| `look` | Feel |
|---|---|
| `bright` (default) | Storybook TV: clean, mid-light colours, one colour family per place |
| `retro` | Mid-century screen print: warm paper, mustard, ochre, burnt orange and teal, a fixed ink set shared by every place |
| `pastel` | Soft and quiet, low saturation: calm or bedtime stories |

`pnpm still PaletteLab out/PaletteLab.png` shows all three on the same places. The colour rules
live in `src/engine/set/storyPalettes.ts`.

## The shape cast

| id | What | Plan |
|---|---|---|
| tofu | rabbit kid | biped |
| bobo | bear, round | biped |
| pim | penguin, tiny | biped, beak |
| mabel | cat kid, stripes, glasses | biped |
| otto | hippo grown-up | biped |
| fennel | fox, tall | biped |
| biscuit | puppy | quadruped |
| wren | bird | biped, wings |
| blip | jelly blob | biped, no arms or legs |

Bibles are in `src/data/characters/<id>.md`.

### A new character is a spec

```json
{
  "schemaVersion": 1, "id": "hazel", "displayName": "Hazel", "aspect": "16:9",
  "style": { "build": "shape" },
  "shape": {
    "species": "squirrel", "build": "kid", "color": "tan", "belly": "cream",
    "ears": { "kind": "pointed", "inner": "peach" }, "muzzle": { "kind": "oval" },
    "tail": { "kind": "fluffy" }, "details": [ { "id": "bow", "color": "berry" } ]
  }
}
```

Put it in the story's `characters` (it renders without touching the catalog), or in
`src/data/characters/` with a bible to make it permanent. The full list of part kinds is in
`src/engine/rig/shape/schema.ts`:

| Field | Kinds |
|---|---|
| `plan` | biped, quadruped |
| `build` | kid, adult, tall, tiny, round (`size` scales it) |
| `head.kind` | circle, oval, wide, pear |
| `body.kind` | bean, pear, egg, block, barrel, drop |
| `arms` / `legs` | arms, wings, none / legs, none |
| `ears.kind` | none, round, long, floppy, pointed, small, antennae |
| `muzzle.kind` | none, oval, snout, beak (with `nose`) |
| `eyes.kind` | dot, oval, wide |
| `tail.kind` | none, puff, long, curl, stub, fluffy |
| `hair.kind` | tuft, bob, bun, spikes, curls, pigtails |
| `markings` | eye-patch, spots, stripes |
| `details` | scarf, bow, cap, bobble-hat, glasses, badge, necktie, crown, backpack, flower |

Colours are palette tokens (`sky`, `berry`, `sunflower`… see `rig/shape/palette.ts`) or hex.
Shape figures have no outline, so a figure must differ from the place by colour. The self-check
warns when it doesn't (a sand-coloured dog on a beach).

A quadruped uses the same poses: `wave` lifts a front paw, `sit` drops onto the haunches, and
`hold` puts a prop in the near paw. Wings flap on the arm angles. A blob with no arms can't hold
things.

## When the catalog can't draw it

`pnpm story assets <id>` lists everything a story names that doesn't exist, with the cheapest fix:

| Rung | Means |
|---|---|
| near | Something close exists (`baloon` → `balloon`). Use it. |
| spec | A new character: write it as a shape spec. |
| place | A set that doesn't exist: describe it as a `place`. |
| draw | A small object: draw it once as a drawn prop (`pnpm story prop`). |
| cheat | A pose or action that can't be drawn: narrate it, cut away, or hold a reaction. |

A drawn prop lives in the story's `props` until the owner approves it on video. Then
`pnpm story promote <id> <prop>` moves it into `src/data/props/` (the catalog hash changes, so
t-shoot needs a re-vendor).

## Labs

| Composition | Shows |
|---|---|
| `ShapeLab` | Every shape character through every pose and expression (16:9) |
| `ShapeLineup` | The cast in a row, waving |
| `PlaceLab` | Ten places composed from one-line descriptions |
| `TalkLabShape` | Tofu lip-syncing |
| `SetLab` with `kits: ["story"]` | Every story part in three palettes |
