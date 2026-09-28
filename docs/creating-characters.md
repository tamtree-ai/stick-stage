# Creating characters

A character is a JSON document the rig draws. Poses, expressions, and mouth shapes are shared. You pick proportions, colors, a torso, and accessories. You add a new drawing only when none of the accessory ids fit.

Schema: `CharacterSchema` in `src/engine/rig/schema.ts`. Examples: `src/data/characters/`. The library loads them in `src/data/index.ts`.

Preview a pair in Remotion Studio as `CharacterLab`, or:

```sh
pnpm still CharacterLab out/characters.png --frame=40 --props='{"left":"milo","right":"your-id","set":"living-1"}'
```

`CharacterLab` only knows ids registered in `src/data/index.ts`. A workspace character that exists only inside one skit is previewed by rendering that skit.

## The document

Milo, the plain stick figure:

```json
{
  "schemaVersion": 1,
  "id": "milo",
  "displayName": "Milo",
  "proportions": {
    "height": 1.0,
    "headRadius": 0.17,
    "neck": 0.02,
    "torso": 0.27,
    "upperArm": 0.15,
    "forearm": 0.14,
    "thigh": 0.17,
    "shin": 0.17
  },
  "style": {
    "stroke": "#1b1b1f",
    "strokeWidth": 12,
    "headFill": "#ffffff",
    "torso": { "style": "line" },
    "limbCurve": 0.3,
    "hands": "nub",
    "feet": "oval",
    "footFill": "#ffffff"
  },
  "face": {
    "eyes": "big-pupil",
    "brows": true,
    "mouthSet": "default",
    "offsetX": 0.14,
    "eyeSpacing": 0.46,
    "eyeY": -0.04,
    "mouthY": 0.44
  },
  "accessories": [{ "slot": "hair", "id": "tuft-01" }],
  "voice": { "say": "Daniel" }
}
```

| Field | Meaning |
|---|---|
| `schemaVersion` | `1`. |
| `id` | Stable id. Lowercase, used by cast entries and by `voice.json`. Unique in the library. |
| `displayName` | The name captions and the catalog show. Defaults to `id` when omitted. |
| `aspect` | `"9:16"` or `"16:9"`. Omit it on a catalog character and the loader stamps `"9:16"`. Reed, Nell, and Pip set `"16:9"`. |
| `proportions` | Lengths as fractions of standing height. See below. |
| `style` | Stroke, fill, torso, limb bow. |
| `face` | Where the features sit on the head. The expression chooses the shape. |
| `accessories` | Hair, glasses, shell, tail. Each `id` must exist in the accessory registry. |
| `energy` | `0` to `1`. How much speech motion this person does. Omitted means `0.55`. Dash is `0.92`. Moss is `0.22`. |
| `personality` | One line, at most 160 characters. The writer reads it. It is not drawn. |
| `voice` | Hints for speech. Stick Stage does not call the provider. |

`hands` accepts only `"nub"`. `feet` accepts only `"oval"`. `mouthSet` is stored and defaults to `"default"`. The drawn mouth comes from the expression and from the viseme, not from `mouthSet`.

## Proportions

All lengths are fractions of the figure's standing height on that set (`figureHeightPx`, times `proportions.height`).

| Field | Range | What to change |
|---|---|---|
| `height` | 0.5–1.5 | Overall scale against the other people. Milo is `1`. Lila is `0.68`. Dash is `1.05`. |
| `headRadius` | 0.08–0.25 | Head size. Kids read larger (`0.20`–`0.22`). Reed, the widescreen adult, is `0.135`. |
| `neck` | 0–0.1 | Gap between torso and head. Default `0.02`. Moss is almost none (`0.008`). |
| `torso` | 0.1–0.5 | Shoulder-to-hip length. |
| `upperArm`, `forearm` | 0.05–0.3 | Arm segments. |
| `thigh`, `shin` | 0.05–0.35 | Leg segments. Dash's legs are long (`0.20` / `0.19`). |

The rig solves the joints, then lifts the figure so the lowest foot sits on the set's ground. You do not set a ground coordinate on the character.

## Style

`stroke` and `strokeWidth` are the ink. The house cast uses `#1b1b1f` and `12`. `headFill` is the face. `footFill` fills the ovals. `cheek` is optional.

`limbCurve` is `0` (straight segments) to `1` (a strong rubber-hose bow). The house range is about `0.2` (Moss) to `0.45` (Dash).

The torso is one of:

```json
{ "style": "line" }
```

```json
{ "style": "bean", "fill": "#ffb09f", "width": 0.13 }
```

`line` is a stroke from hip to neck (Milo, Dash). `bean` is a filled body. `width` is a fraction of figure height, `0.04`–`0.3`, default `0.13`. June, Lila, Theo, Moss, and the widescreen cast use a bean. The self-check treats a line torso and a bean torso as different silhouettes.

## The face

Features are placed in units of the head radius. Positive `offsetX` shifts the face toward the direction the character is facing, which reads as a three-quarter view. The canonical view faces right. `facing: "left"` mirrors the whole rig, and text on a prop is counter-flipped so it stays readable.

| Field | Range | Default | Meaning |
|---|---|---|---|
| `eyes` | `big-pupil` or `dot` | | Pupil style at rest. Expressions still change the lid and the shape. |
| `brows` | boolean | | Draw eyebrows. |
| `offsetX` | −0.5–0.5 | `0.14` | Shift toward the facing side. |
| `eyeSpacing` | 0.2–0.8 | `0.44` | Distance between the eyes. |
| `eyeY` | −0.5–0.5 | `-0.06` | Vertical position. Negative is up. |
| `mouthY` | 0–0.8 | `0.42` | Mouth below the center of the head. |

Expressions and the symbols (`!`, `?`, tears, speed lines) are not on the character. They are named on a beat. See [Expressions](#expressions) below.

## Accessories

An accessory is `{ "slot", "id", "color?" }`. `color` defaults to the character's stroke. The slot must match the drawing's slot. Unknown ids throw when that character is drawn: `Unknown accessory "<id>" on character "<character>"`.

Slots: `hair`, `eyewear`, `headwear`, `neck`, `body`.

Drawings ship in `src/engine/rig/accessories.tsx`. `accessoryIds()` lists them.

| Id | Slot | What it is | Who uses it |
|---|---|---|---|
| `tuft-01` | hair | Three strands from one root | Milo |
| `bun-01` | hair | A bun behind the head and a swept cap | June (`color` set) |
| `spikes-01` | hair | A spiked cap | Reed |
| `pigtails-01` | hair | Two puffs and a fringe | Lila |
| `crop-01` | hair | A short cap on the crown | Theo |
| `ears-long-01` | hair | Two tall ears | Dash |
| `glasses-round` | eyewear | Circles on the eye positions | June |
| `shell-01` | body | An ellipse on the back, following the torso | Moss |
| `tail-puff-01` | body | A small circle at the hip | Dash |

Hair and ears draw in a head space where `0°` is the top of the circle and positive angles move toward the facing side. Body accessories receive the hip, the neck, and the figure height, and they rotate with the torso.

### A new accessory

1. Add a key to `REGISTRY` in `src/engine/rig/accessories.tsx`. Set `slot`. Provide one or more layers: `back` (behind the head), `front` (over the head), `eyewear` (after the eyes), `body` (on the torso).
2. Draw with the `R`, `stroke`, `sw`, and `color` arguments. Scale from `R` or, for a body piece, from `heightPx`. Use `f2()` for path coordinates.
3. Point a character's `accessories` array at that id.
4. Open `CharacterLab` and turn the figure both ways. Left-facing is a mirror of the canonical right-facing view.

`headwear` and `neck` are legal slots. No shipped drawing uses them yet. A new drawing declares the slot it belongs to.

## Voice, personality, energy

```json
"voice": {
  "provider": "minimax",
  "voiceId": "…",
  "settings": {},
  "say": "Daniel"
}
```

`provider`, `voiceId`, and `settings` are for the tamtree harness. `say` is the macOS voice `pnpm voice:say` uses. Dev voices for the short cast: Daniel (Milo), Samantha (June), Kathy (Lila), Junior (Theo), Fred (Moss), Superstar (Dash). Reed uses Alex.

`personality` is a cast note of at most 160 characters. The writer prefers it over the shared notes in `src/data/cast-notes.json` when both exist. Longer direction for the house cast lives in `src/data/characters/<id>.md` and in `cast-notes.json`.

`energy` scales nods and gestures while someone is talking. `0` is nearly still. `1` is Dash.

## Register the character

Catalog characters are imported in `src/data/index.ts` and passed to `createLibrary`. Add the JSON import and the object to the `characters` array. `createLibrary` validates, rejects a duplicate id, and stamps a missing `aspect` to `"9:16"`.

A character that should appear in `GET /catalog`, in briefs, and in templates has to be in that library. After you add one, the catalog version changes. Clients that pinned the old version get `409 catalog-mismatch` until they refresh.

### A character for one skit

Put the same document on the skit, up to four:

```json
"characters": [
  { "schemaVersion": 1, "id": "ada", "displayName": "Ada", "proportions": { }, "style": { }, "face": { } }
]
```

`compileSkit` parses the skit first, so a workspace character that fails `CharacterSchema` is a `SkitError` at parse time. Valid ones are merged over the library before id checks. These people are not copied into `src/data`, and they do not change `catalog.version`. The same array is legal on a brief. The writer treats `personality` as that person's cast note.

A catalog character and a workspace character should not share an id unless you mean the skit copy to win. The skit copy replaces the library entry for that compile.

## Two people must read as two people

`checkSkit` compares every pair of distinct character ids in the cast. `characterDistance` in `src/engine/qa/distinct.ts` scores silhouette and color.

Silhouette is the sum of absolute differences in `height`, `headRadius` (weighted ×4), and `torso`, plus `0.35` when one torso is a line and the other is a bean. Color is the distance between head fills, plus half the distance between body fills (bean fill, or head fill when the torso is a line).

The check warns when silhouette is below `0.08` **and** color is below `28`. The house cast clears both floors. A new person who is Milo with a different name will warn. Change height, head size, torso style, or the fills.

## Poses

A pose is shared. Characters do not carry their own pose list. Documents live in `src/data/poses/` and are registered in `src/data/index.ts` (`POSE_IDS` for the lab cycle, `EXTRA_POSE_IDS` for the rest).

Idle:

```json
{
  "schemaVersion": 1,
  "id": "idle",
  "torso": 0,
  "head": 0,
  "shoulderL": -16,
  "elbowL": 12,
  "shoulderR": 16,
  "elbowR": 14,
  "hipL": -8,
  "hipR": 8
}
```

Angles are degrees. The canonical view faces right. `L` is the back limb (screen-left when facing right). `R` is the front limb.

| Joint | Zero | Positive |
|---|---|---|
| Shoulder | Arm hanging along the torso | Forward. `+90` is straight out. `180` is up. |
| Elbow | Straight | Forearm bends forward. |
| Hip | Straight down (world) | Forward. |
| Knee | Straight | Shin bends back. |
| `torso` | Upright | Leans forward. |
| `head` | Level | Tilts forward. |

`bend` is optional extra bow per limb (`armL`, `armR`, `legL`, `legR`). `anticipation: true` dips the opposite way before a big gesture.

Shipped poses: `idle`, `point`, `shrug`, `facepalm`, `arms-up`, `arms-crossed`, `think`, `lean-in`, `recoil`, `slump`, `hands-on-hips`, `hold-phone`, `sit`, `hold-out`, `hold-chest`, `hold-up`, `high-five`, `shove`, `faint`.

A beat names one with `{ "who": "june", "do": "pose", "pose": "arms-crossed" }`. To add a pose: write the JSON, import it in `src/data/index.ts`, and look at it in `PoseLab`. You do not draw a new limb. The rig already interpolates these angles.

Holding a prop pairs a pose with a prop id. `hold-phone` lifts a hand. The prop document decides how the object sits in that hand. See [Creating props](creating-props.md).

## Expressions

An expression is shared too. Documents live in `src/data/expressions/`. Schema: `ExpressionSchema` in `src/engine/face/schema.ts`.

```json
{
  "schemaVersion": 1,
  "id": "shocked",
  "eyes": { "shape": "shock" },
  "brows": { "raise": 1.1, "tilt": 6 },
  "mouth": "gasp",
  "closeup": "extreme"
}
```

| Field | Meaning |
|---|---|
| `eyes.shape` | `base`, `big`, `dot`, `closed-happy`, `closed`, `squint`, `shock`, `teary`. Default `base`. |
| `eyes.lid` | Upper lid, `0`–`1`. |
| `eyes.lower` | Lower lid, `0`–`1`. |
| `eyes.lidTilt` | Degrees, −40–40. Positive slants the lids down toward the nose. |
| `eyes.pupil` | Scale, `0.3`–`1.6`. |
| `eyes.gaze` | `{ "x", "y" }`. A look action can override this. |
| `brows.raise` | −1.5–1.5. Negative lowers, positive raises. |
| `brows.tilt` | −45–45 degrees. Positive lifts the inner end. |
| `brows.left`, `brows.right` | Optional per-brow override of `raise` and `tilt`. |
| `mouth` | A preset name, `"speech"`, or `{ "preset": "smile", ...overrides }`. |
| `symbols` | `tears`, `sweat`, `blush`, `anger`, `exclaim`, `question`, `speed-lines`, `spray`. |
| `closeup` | `close` or `extreme`. The director may cut to the face when this expression lands. |

Mouth presets, in units of head radius: `neutral`, `flat`, `smile`, `grin`, `smirk`, `frown`, `pout`, `o`, `gasp`, `wail`, `clench`, `grimace`, `shout`, `wobble`. Each preset is `w`, `open`, `curve`, `skew`, `round`, `top`, `teeth`, `tongue`. Expressions blend because every mouth is a point in that space. Speech replaces the mouth with a viseme (`speechMouth` in `src/engine/face/visemes.ts`) layered on the expression.

Shipped expressions: `neutral`, `happy`, `smug`, `sarcastic`, `annoyed`, `angry`, `shocked`, `sad`, `crying`, `cringe`, `confused`, `deadpan`.

Listener reactions (speaker expression → listener expression) are `src/data/reactions.json`, not part of the character.

## A checklist

1. Copy the closest character JSON. New id, new `displayName`.
2. Change height, head size, or torso style, and change a fill, so the pair is not the same person.
3. Pick accessories that already exist, or add a drawing first.
4. Set `aspect` when this face is for `16:9`.
5. Set `voice.say` if you will preview with `pnpm voice:say`.
6. Import the file in `src/data/index.ts`.
7. `pnpm test` and a `CharacterLab` still, facing both directions.
8. Put the id on a cast entry only in a skit of the same aspect.

Next: [Creating backgrounds](creating-backgrounds.md).
