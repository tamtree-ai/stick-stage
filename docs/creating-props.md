# Creating props

A prop is an object in a character's hand. Five coded kinds ship, each with a React component: `phone`, `mic`, `cup`, `laptop`, `sign`. A new object is a JSON document with `"kind": "drawn"` and a list of shapes. You add a component only when those shapes cannot draw it.

Schema: `PropSchema` in `src/engine/props/schema.ts`. Coded drawings: `src/engine/props/draw.tsx`. Examples: `src/data/props/`.

```sh
pnpm still PropLab out/PropLab.png --frame=20
pnpm render PropLab out/PropLab.mp4
```

## The document

```json
{
  "schemaVersion": 1,
  "id": "cup",
  "kind": "cup",
  "colors": { "body": "#ffffff", "accent": "#f2a7a0" },
  "align": "upright",
  "size": 1.25
}
```

| Field | Meaning |
|---|---|
| `schemaVersion` | `1`. |
| `id` | The string a beat uses in `hold`. Unique in the library. The id and the kind are different: many documents may use `kind: "cup"`. |
| `kind` | `phone`, `mic`, `cup`, `laptop`, `sign`, or `drawn`. A coded kind selects a component. `drawn` uses the `parts` array. |
| `size` | Multiplier on the kind's default size, which is a fraction of figure height. `0.3`–`3`. Default `1`. |
| `colors.body` | Main fill, hex. |
| `colors.accent` | Optional second fill (mic head, cup band, sign stick). |
| `colors.screen` | Optional glass. Phone and laptop fall back to a lightened body. |
| `align` | `forearm`: the prop's up axis follows the forearm. `upright`: it stays vertical (a cup, a sign, an open laptop). |
| `angle` | Extra degrees. Positive is clockwise in the right-facing view. Default `0`. |
| `text` | Sign words. One line, 1–24 characters, no newline. A `hold` action may override it for that use. |
| `screen` | Laptop words. Up to 3 lines, each 1–24 characters, broken with `\n`. A `hold` may override it. |
| `name` | Picker label. Omitted: the id with capitals (`red-cup` → `Red Cup`). |
| `category` | Prompt group and picker tab (`drinks`, `tech`, `office`). Omitted: `other`. |
| `tags` | Topic words. Default `[]`. |
| `aliases` | Other names the writer and the picker accept. Shared aliases are allowed. Ids are not. Default `[]`. |
| `rank` | Lower comes first in the prompt and the picker. Default `1000`. |
| `parts` | Required when `kind` is `drawn`. One to 24 shapes. See below. |

The prop is drawn in the character layer with **the character's stroke and stroke width**, not its own ink. `colors` are fills. A white cup in June's hand still has June's near-black outline.

Shipped props:

| Id | Kind | Category | Rank | Align | Notes |
|---|---|---|---|---|---|
| `phone` | phone | tech | 1 | `forearm` | `size` 1.2. Aliases include mobile, cell |
| `cup` | cup | drinks | 2 | `upright` | `size` 1.25. Aliases include mug, coffee. The spit-take gag holds this id |
| `laptop` | laptop | tech | 8 | `upright` | Grey body, blue screen |
| `mic` | mic | office | 16 | `forearm` | `angle` −40, so it points forward in a raised hand |
| `sign` | sign | party | 70 | `upright` | Default text `HELP` |

Register a new document in `src/data/index.ts`: import it and add it to the `props` array passed to `createLibrary`. `PROP_IDS` is the list PropLab walks. Add your id there if the lab should show it.

A new colorway of a coded kind does not need a new component. Copy `cup.json`, change `id` and `colors`, register it. Beats name the id, and `kind` stays `"cup"`. `catalog.propInfo` picks up `name`, `category`, `tags`, `aliases`, and `rank` for the writer and the picker. `catalog.props` stays the id list.

## A prop drawn in JSON

`"kind": "drawn"` stores the geometry on the document. The grip is the origin. Up is negative Y. Every coordinate is in prop units, the same space as `size`, and must sit within ±0.6 of the origin. At most 24 parts.

```json
{
  "schemaVersion": 1,
  "id": "key",
  "kind": "drawn",
  "name": "Key",
  "category": "office",
  "rank": 40,
  "align": "forearm",
  "angle": -20,
  "colors": { "body": "#e6c56a", "accent": "#8a8f9c" },
  "parts": [
    { "shape": "circle", "x": 0, "y": -0.04, "r": 0.028, "fill": "body" },
    { "shape": "rect", "x": 0.01, "y": -0.012, "w": 0.09, "h": 0.012, "fill": "accent" },
    { "shape": "rect", "x": 0.07, "y": -0.012, "w": 0.012, "h": 0.03, "fill": "accent" }
  ]
}
```

| Shape | Fields |
|---|---|
| `rect` | `x`, `y` (top-left), `w`, `h` (each positive, at most 1.2). Optional `rx`. The far corner must stay inside ±0.6. |
| `circle` | `x`, `y` (center), `r` (at most 0.6). The circle must stay inside ±0.6. |
| `ellipse` | `x`, `y`, `rx`, `ry`. Same bounds as a circle. |
| `poly` | `points`: 3–32 pairs `[x, y]`. |
| `line` | `x1`, `y1`, `x2`, `y2`. |
| `path` | `d`. Commands `M L H V C Q Z` and the lowercase forms. `A` and `S` are rejected. Each number must be within ±0.6. After `M`, further pairs are treated as `L`. |

Every part also accepts:

| Field | Meaning |
|---|---|
| `fill` | `body` (default), `accent`, `screen`, `body-dark`, `body-light`, `accent-dark`, `accent-light`, `screen-dark`, `screen-light`, `none`, or a hex. Dark is 28% darker. Light is 40% lighter. A missing accent falls back to a darkened body. A missing screen falls back to a lightened body. |
| `stroke` | `false` skips the character outline. Used for inner detail. |
| `angle` | Degrees, rotated about the part's own center. |
| `opacity` | `0`–`1`. |

Drop bounds are measured from the parts (`drawnBounds`). You do not add a row to `PROP_BOUNDS`. A part that sticks out past ±0.6 fails validation before it can be drawn.

Empty space around the grip is fine. Put the handle on the origin so the hand closes on it, and build the object upward (negative Y) when `align` is `upright`.

## How a prop sits in the hand

The grip is the origin of the drawing. Up is negative Y, in units of `u` (standing figure height times `size`). `align: "forearm"` rotates that axis onto the forearm. `align: "upright"` keeps it vertical in the world, then adds `angle`.

When the rig faces left it mirrors. `FittedLines` and the sign's `<text>` counter-scale so words stay left-to-right. Draw text through those, not a raw `<text>` that ignores `mirrored`.

`PROP_BOUNDS` in `src/engine/props/bounds.ts` is the outline in that same space. A dropped prop falls and then rests on the floor using this box. If you change a drawing's extent, change the box. Fields are `x0`, `x1`, `y0`, `y1`.

| Kind | x0 | x1 | y0 | y1 |
|---|---|---|---|---|
| phone | −0.03 | 0.03 | −0.085 | 0.025 |
| mic | −0.03 | 0.03 | −0.12 | 0.04 |
| cup | −0.02 | 0.1 | −0.05 | 0.035 |
| laptop | −0.1 | 0.1 | −0.13 | 0.012 |
| sign | −0.15 | 0.15 | −0.49 | 0.06 |

## Using one in a skit

On the cast, as the state when the video starts:

```json
{ "id": "june", "character": "june", "mark": "right", "holding": { "prop": "cup" } }
```

During a beat:

```json
{ "who": "june", "do": "hold", "prop": "sign", "hand": "R", "text": "SOLD", "at": { "word": "sold" } }
```

| Action | What it does |
|---|---|
| `hold` | Put `prop` in `hand` (`R` is the default, the front hand). Optional `text` (sign) or `screen` (laptop) for this hold only. |
| `putAway` | Clear that hand. |
| `drop` | The prop leaves the hand and falls. The bounds box lands it on the ground. |

`hand` is `L` or `R` in the canonical right-facing rig. `L` is the back arm.

Poses that lift a hand for a prop: `hold-phone`, `hold-out`, `hold-chest`, `hold-up`. The pose does not imply the object. You still `hold` the prop id. The interview template holds `mic` on the first character.

A sign's `text` is one line. A laptop's `screen` is up to three short lines. The same limits as a chalkboard: `SCREEN_LINES` is 3 and `SCREEN_LINE` is 24 (`src/engine/lib/screenText.ts`).

The compiler checks that the prop id exists in the library. An unknown id is an error with the known list.

## A new coded kind

Use this when the object needs fitted text, a counter-flip, or a shape the part list cannot describe. The sign and the laptop are coded for that reason. `PROP_KINDS` is the closed list of component names.

1. Add the name to `PROP_KINDS` in `src/engine/props/schema.ts`.
2. Draw a component in `src/engine/props/draw.tsx` with `PropDrawProps`: `def`, `u`, `stroke`, `sw`, `mirrored`, `fontFamily`. Scale every length from `u`. Use `def.colors`. Add it to `PROP_DRAW`.
3. Add a `PROP_BOUNDS` entry in the same units, origin at the grip, up = −y.
4. Write `src/data/props/<id>.json` with that `kind`, and register it in `src/data/index.ts`.
5. Hold it in `PropLab` and drop it. The object should land on the floor, not through it, and the words should read when the character faces left.

`PropView` uses `Drawn` when `kind` is `drawn`, and `PROP_DRAW[kind]` otherwise. A coded kind missing from that record cannot be drawn. A coded kind missing from `PROP_BOUNDS` cannot be dropped cleanly. Drawn props measure their own box.

Do not put a raw hex in a component for a fill that should follow the document. `darken` and `lighten` from `src/engine/lib/color.ts` are there for shades of `colors.body`.

## What a prop is not

| You want | Use |
|---|---|
| Words on the wall, a monitor on the desk, a TV | A set part and a label. [Creating backgrounds](creating-backgrounds.md). |
| A word that slams over the picture | A text cue, `"type": "slam"`. [The skit file](skits.md). |
| Hair, a shell, glasses | An accessory on the character. [Creating characters](creating-characters.md). |
| A second cup that is red | A second prop document with `kind: "cup"` and a new id. |

Next: [Programmatic guide](programmatic.md).
