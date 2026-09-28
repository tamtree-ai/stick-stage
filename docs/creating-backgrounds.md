# Creating backgrounds

A background is a **set**: a list of parts, a palette, a ground line, and standing marks. Parts are React components. A new room is usually a new JSON file that places parts that already exist.

Schema: `SetSchema` in `src/engine/set/schema.ts`. Examples: `src/data/sets/`. Palettes: `src/engine/set/palettes.ts`. Part registry: `src/engine/set/parts/registry.ts`.

The short living room:

```json
{
  "schemaVersion": 1,
  "id": "living-1",
  "kit": "interior",
  "palette": "lilac",
  "description": "A home living room: window, picture, bookshelf, plant. Standing.",
  "tags": ["home", "family", "roommates", "couple", "parents", "chores", "weekend"],
  "groundY": 1480,
  "figureHeightPx": 720,
  "layers": [
    { "part": "wall", "pattern": "halftone" },
    { "part": "floor" },
    { "part": "window", "x": 0.26, "y": 0.17 },
    { "part": "frame", "x": 0.78, "y": 0.2 },
    { "part": "shelf", "x": 0.74, "y": 0.36 },
    { "part": "plant", "x": 0.93 }
  ],
  "foreground": [],
  "marks": { "left": 0.27, "center": 0.5, "right": 0.73 }
}
```

## The document

| Field | Meaning |
|---|---|
| `schemaVersion` | `1`. |
| `id` | The string a skit puts in `"set"`. Unique. |
| `aspect` | `"9:16"` (default) or `"16:9"`. Must match the skit. |
| `kit` | `plain`, `interior`, `office`, `park`, `street`, or `beach`. Groups parts in SetLab and picks a starting backdrop. |
| `palette` | A key in `PALETTES`. Unknown names throw when the set is drawn. |
| `description` | A sentence for a person or a model choosing a room. `GET /sets` returns it. |
| `tags` | Topic words (`work`, `date`, `morning`). Default `[]`. |
| `groundY` | The floor line, in pixels from the top of the frame. |
| `figureHeightPx` | Standing height in pixels at this set's scale. Default `760`. Furniture sizes come from this. |
| `layers` | Parts behind the people, in order. |
| `foreground` | Parts in front of the people. Default `[]`. |
| `marks` | Named standing positions as fractions of width. Default `left` 0.3, `center` 0.5, `right` 0.7. |

`description` and `tags` are not drawn. A set with neither still renders. The catalog then describes it as `"<kit> set"`.

## Size of the frame

Shorts are 1080×1920. The house rooms use `groundY: 1480` and `figureHeightPx: 720` (the schema default for figure height is 760; the shipped rooms use 720).

Widescreen sets set `"aspect": "16:9"` and use a shorter frame. `wide-living` uses `groundY: 900` and `figureHeightPx: 620` on a 1920×1080 frame. Marks stay fractions, so `0.28` is still "left", just in a wider picture.

A skit may not stand a `9:16` character in a `16:9` room. Compile with a matching cast. The widescreen rooms are `wide-plain`, `wide-living`, `wide-lounge`, `wide-office`, `wide-park`, `wide-street`, `wide-cafe`, and `wide-classroom`. Template defaults for that frame are in `WIDE_TEMPLATE_SET` (`src/engine/templates/stage.ts`).

## Kits and the backdrop

Each kit has a minimum backdrop in `KIT_BACKDROP`. Start a new room from that list, then add furniture.

| Kit | Backdrop parts |
|---|---|
| `plain` | `plain-wall`, `floor` |
| `interior` | `wall`, `floor` |
| `office` | `wall` with `pattern: "stripes"`, `floor` |
| `park` | `sky`, `hills`, `grass` |
| `street` | `sky`, `buildings`, `sidewalk` |
| `beach` | `sky`, `sea`, `sand` |

`plain` is the meme room and the stage curtain lives there too (`curtain`). `interior` is home: couch, bed, kitchen, TV. `office` is desks and whiteboards. Outdoor kits do not use `wall` or `floor`.

## Parts you can place

`PART_INFO` is the list. A name that is not in it throws when the set draws. SetLab shows every part, in three palettes and three seeds, as soon as you add it to `PART_INFO`.

| Part | Kits | Backdrop | Foreground | Notes |
|---|---|---|---|---|
| `plain-wall` | plain | yes | | Flat wall, soft spot |
| `wall` | interior, office | yes | | |
| `floor` | interior, office, plain | yes | | |
| `window` | interior, office | | | `variant: "blinds"` |
| `shelf` | interior, office | | | |
| `frame` | interior, office | | | Picture. `seed` changes the picture |
| `plant` | interior, office | | | |
| `door` | interior, office | | | |
| `couch` | interior | | | Seat |
| `clock` | office, interior | | | |
| `whiteboard` | office | | | |
| `cabinet` | office | | | |
| `chair` | office | | | Seat |
| `desk` | office | | yes | `variant` below. `screen` paints the monitor |
| `sky` | park, street | yes | | `variant: "sun"` or `"night"` |
| `hills` | park | yes | | |
| `grass` | park | yes | | `variant: "path"` |
| `tree` | park, street | | | |
| `bush` | park | | | |
| `bench` | park, street | | | Seat |
| `lamp` | park, street | | | Street lamp |
| `buildings` | street | yes | | |
| `sidewalk` | street | yes | | |
| `shopfront` | street | | | |
| `hydrant` | street | | | |
| `curtain` | plain | yes | | `variant: "spot"` adds a spotlight |
| `counter` | interior | | | `variant: "cafe"` |
| `fridge` | interior | | | |
| `bed` | interior | | | Seat |
| `tv` | interior | | | `screen` paints the glass |
| `floor-lamp` | interior | | | |
| `board` | office, interior | | | Chalkboard. `text` paints it. `variant: "menu"` |
| `sea` | beach | yes | | |
| `sand` | beach | yes | | |
| `umbrella` | beach | | | |

Backdrop parts fill the frame. The others are objects. `foreground: true` on the registry means the usual place is the set's `foreground` array. `desk` is the one shipped that way, so a seated person's legs go behind it. You may still put any part in either array.

## Placing a part

```json
{
  "part": "window",
  "x": 0.8,
  "y": 0.22,
  "size": 0.85,
  "seed": 2,
  "pattern": "halftone",
  "flip": false,
  "mark": "left",
  "dx": 0.17,
  "variant": "blinds",
  "text": "POP QUIZ",
  "screen": "INBOX\n999",
  "seatFor": ["left"]
}
```

| Field | Range | Meaning |
|---|---|---|
| `part` | A `PART_INFO` key | Which drawing. |
| `x` | −0.5–1.5 | Horizontal center, fraction of width. Ignored when `mark` is set. |
| `y` | −0.5–1.5 | Vertical anchor, fraction of height. Meaning depends on the part (a window's top area, a floor object's base). Omitted: the part's own default, often `groundY` for things that stand on the floor. |
| `size` | 0.2–4 | Multiplier on the part's default, which is tied to `figureHeightPx`. Default `1`. |
| `seed` | string or number | Stable variation (which books, which picture). Same seed, same drawing. |
| `pattern` | `none`, `halftone`, `stripes`, `dots` | Wall and floor patterns. |
| `flip` | boolean | Mirror around the part's own center. Default `false`. |
| `mark` | A key in this set's `marks` | Place at that mark instead of `x`. Unknown marks throw. |
| `dx` | −1–1 | Nudge from the mark or from `x`, fraction of width. Default `0`. |
| `variant` | string | A look the component knows. Unknown variants are ignored by that component. |
| `text` | Up to 3 lines, each 1–24 characters, split with `\n` | Chalkboard words. |
| `screen` | Same limits as `text` | Desk monitor or TV. |
| `seatFor` | Mark names | This part is a seat for cast members standing on those marks. Default `[]`. |

`mark` wins over `x`. The resolved center is `(mark + dx) * width`, or `(x + dx) * width` when there is no mark.

Office, the seated case:

```json
"layers": [
  { "part": "wall", "pattern": "stripes" },
  { "part": "floor" },
  { "part": "chair", "mark": "left", "seatFor": ["left"] }
],
"foreground": [
  { "part": "desk", "mark": "left", "dx": 0.17 }
]
```

A cast member with `"mark": "left", "seated": true` sits because `seatFor` includes `left`. Seat parts are `chair`, `bench`, `couch`, and `bed`. Seat-top height, as a fraction of figure height times part size: chair `0.19`, bench `0.18`, couch `0.17`, bed `0.20` (`SEAT_HEIGHT` in `src/engine/set/parts/seats.ts`). The rig puts the hip on that height and plants the feet. `sit` and `stand` actions need a seat at the character's mark.

`seatFor` values are mark names (`"left"`), not character ids. Whoever is placed on that mark can sit.

### Variants that change the drawing

| Part | Variant | Result |
|---|---|---|
| `window` | `blinds` | Closed blinds, no open curtains |
| `desk` | `monitor` (default) | A monitor. `screen` fills it |
| `desk` | `laptop` | A laptop on the top, no monitor |
| `desk` | `clear` | No screen. The mug and papers remain. Any value other than `monitor` or `laptop` does this |
| `sky` | `sun` | A sun |
| `sky` | `night` | A darker sky treatment |
| `grass` | `path` | A walkway under the marks |
| `counter` | `cafe` | An espresso machine and cups |
| `board` | `menu` | A café menu (title and priced rows) when `text` is omitted |
| `curtain` | `spot` | A spotlight cone on center |

## Words on the set

Baked into the set JSON, `text` and `screen` show in every skit that uses the room. Prefer scene labels when the words belong to one joke. A label paints the part for that scene and leaves the shared file alone.

On a single-scene skit:

```json
"labels": [
  { "part": "board", "text": "POP QUIZ" },
  { "part": "desk", "screen": "INBOX\n999" }
]
```

`part` matches the part name (`board`, `desk`, `tv`). A label needs `text` or `screen` or both. Limits: 3 lines, each 1–24 characters. A multi-scene skit puts `labels` on each scene, up to 6 entries. See [The skit file](skits.md).

A held sign is a prop, not a set label. See [Creating props](creating-props.md).

## Palettes

Parts call `getPalette(set.palette)` and then `derived()`. They use those tokens, or `darken` / `lighten` / `mix` of them. They do not write a hex literal for a fill.

Tokens: `wallA`, `wallB`, `floor`, `accent`, `shade`, `sky`, `detail`.

Derived: `wood`, `metal`, `glass`, `paper`, `foliage`.

| Id | Use |
|---|---|
| `lilac` | Cool interior (living rooms) |
| `mint` | Office green |
| `peach` | Warm interior |
| `butter` | Kitchen yellow |
| `meadow` | Day park |
| `autumn` | Orange foliage |
| `dusk` | Evening outdoors |
| `night` | Night street. Still light enough that the character stroke reads |
| `city` | Street greys |
| `coast` | Sand and sea |
| `stage` | Curtain red |

To add a palette, add a key to `PALETTES` in `src/engine/set/palettes.ts`. Keep it soft. Character strokes are near-black and have to win. Then set `"palette": "your-id"` on a set. SetLab's review palettes per kit are `LAB_PALETTES` in `src/app/labs/SetLab.tsx`; add the new id there if you want the contact sheet to include it.

## A new part

When no shipped part is the object you need:

1. Draw a component with the `PartComponent` props (`src/engine/set/parts/types.ts`): `part`, `palette`, `W`, `H`, `groundY`, `fig`, `prefix`, `seed`, `marks`, `fontFamily`.
2. Place it with `partX` and `partBase`. Honor `flip` with `flipAt`. Scale from `fig * part.size`.
3. Color with palette tokens and `edge()` for the outline (`SET_LINE` is 3). The outline is a darker tone of the fill, never the character stroke.
4. Variation uses `rand(seed, "some-channel")` from `src/engine/lib/seed.ts`. The same seed always lays out the same books.
5. Export it from the kit file (`room`, `decor`, `office`, `furniture`, `outdoor`, `street`, `home`, or `venue`).
6. Add a `PART_INFO` entry: `draw`, `kits`, and `backdrop` or `foreground` when those apply. If it is a seat, add it to `SEAT_PARTS` and `SEAT_HEIGHT`.
7. If a whole new kit needs it as the empty room, add that kit to `KITS` and `KIT_BACKDROP`. A new kit is also a new value on `SetSchema`'s `kit` enum.
8. Place it from a set JSON.
9. `pnpm still SetLab out/SetLab.png --props='{"kits":["interior"],"tileWidth":200}'`.

`prefix` is a unique string for pattern ids in that tile. Use it in any `<pattern>` or `<mask>` id so two copies of the part on one frame do not clash.

## Register the set

Import the JSON in `src/data/index.ts` and add it to the `createSets` array. `createSets` validates every document and rejects a duplicate id.

The set then appears in `GET /sets` and in `catalog.sets`, including `aspect`, `kit`, `description`, `tags`, and which marks are seated. Adding or editing a set changes `catalog.version`.

A set used by only one experiment can be passed to `createSets` in your own process without editing `src/data`. The Remotion composition in this repo draws `sets` from `src/data/index.ts`, so a file that is not imported there will not appear in Studio.

## A checklist

1. Pick a kit and copy `KIT_BACKDROP`.
2. Set `groundY` and `figureHeightPx` for the aspect.
3. Add parts. Put seats in `layers` and the desk in `foreground`.
4. Set `marks` so people are not inside the furniture.
5. Write `description` and `tags`.
6. Register the import.
7. Open SetLab, then a skit still on that set with two people, one of them seated if the room has a chair.

Next: [Creating props](creating-props.md).
