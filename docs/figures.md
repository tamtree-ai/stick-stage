# Figures: diagrams, equations and images

Figures are the explanation layer for the science channel: graphs that draw themselves, vectors
that add, waves, Kepler orbits, particles, number lines, dice histograms, typeset equations and
credited NASA / ESA images. They sit on the stage next to the cast, under the same camera.

Code: `src/engine/viz/`. Lab: `pnpm render VizLab out/VizLab.mp4` (every kind, with its cues).
Watch it as video; motion is the point.

## Where they go

A scene lists its figures (a single-scene skit puts `figures` at the top level):

```json
"figures": [
  { "id": "drop", "kind": "plot", "at": { "x": 0.5, "y": 0.27, "w": 0.88, "h": 0.22 },
    "params": { "x": [0, 2], "y": [0, 20], "xLabel": "t (s)", "series": [{ "fn": "0.5*9.8*x^2" }] } }
]
```

| Field | Meaning |
|---|---|
| `id` | Cues and anchors name it |
| `kind` | `plot`, `axes`, `vector`, `wave`, `orbit`, `particles`, `label`, `callout`, `numberline`, `scale`, `histogram`, `equation`, `image` |
| `at` | Centre `x`, `y` and size `w`, `h`, fractions of the frame |
| `params` | Per kind (below). Checked at compile with a path to the bad field |
| `states`, `state` | Named param sets (`myth`, `truth`), merged over `params`; a state may set `label` |
| `hidden` | Off until a `show` cue. Default: on from the scene start |
| `reveal` | `draw` (default), `fade`, `pop`, `none` |
| `label` | Caption, drawn as a title above the box |
| `layer` | `back` (behind the cast, default) or `front` |
| `panel` | A soft card behind it, for busy sets |
| `tag` | Corner note: `"not to scale"`, `"cartoon model"` |

**Layout on a 9:16 short.** The cast's heads are around 40% down the frame. Put figures in the band
above them: `y` about 0.27, `h` ≤ 0.24. One wide figure, or two side by side (`w` 0.42 at `x`
0.27 and 0.73). The science sets (`void-1`, `blueprint-1`, `lab-1`, `space-1`) use a smaller figure
height (640 px) to leave that room. A two-shot widens to keep a visible figure in frame, and a beat
that shows a figure or changes its state (or has `role: "demo"`) gets the wide shot.

## Cues

Beats change figures with `figures` cues, timed by the usual anchors:

| Cue | Does |
|---|---|
| `{ "do": "show", "id", "at", "style"? }` | Reveal it |
| `{ "do": "hide", "id", "at" }` | Fade it out. A later `show` brings it back (image → diagram → image works; the credit comes back too) |
| `{ "do": "state", "id", "state", "style": "morph" \| "strike" \| "cut" }` | Switch state. `strike` keeps the old one faded with its caption crossed out in red and draws the new one beside it |
| `{ "do": "set", "id", "params": { … }, "durationMs"? }` | Tween params: numbers interpolate (a pointer moves, `n` dice roll, a graph draws on) |

`by: "<castId>"` on `state` or `set` makes that cast member hold the prop out on the cue, so the die
in the hand and the histogram show the same event.

Anchors on figures: `look` can target `"figure:<id>"` or `"figure:<id>.<anchor>"`, and a callout's
`target` can be `"<id>.<anchor>"`. Every figure has `center`, `top`, `bottom`, `left`, `right`. An
orbit adds `star`, `perihelion`, `aphelion`; a plot `origin`; an equation each term class.

## Kinds

| Kind | Key params |
|---|---|
| `plot` / `axes` | `x`, `y` ranges, `xLabel`, `yLabel`, `grid`, `vars`; `series: [{ fn \| points, color, label, draw, fill, dashed }]`; `markers: [{ x, y?, guides, label }]` |
| `vector` | `x`, `y` ranges (square units), `vectors: [{ from, v, label, components }]`, `sum: { label, tipToTail }` |
| `wave` | `mode`: `travelling`, `sum`, `standing`, `packet`; `components: [{ amp, wavelength, period, phase }]`, `speed` |
| `orbit` | `e`, `period` (s), `sweep` (equal-time sectors), `highlight`: `perihelion` / `aphelion`, `velocity`, `trail` |
| `particles` | `count`, `seed`, `mode`: `gas` (bounces), `drift`, `still`, `fall`; `charged`, `trail`, `twinkle`, `highlight` |
| `label` / `callout` | `text`, `size`, `color`; a callout's `target` is `[fx, fy]` or `"<id>.<anchor>"` |
| `numberline` / `scale` | `min`, `max`, `step`, `log` (powers of ten), `marks`, `pointer`, `view` (zoom window) |
| `histogram` | `source`: `dice`, `two-dice`, `coin`, `normal`, `values`; `n` (animate it), `expected`, `share` |
| `equation` | `tex`, `show` (parts so far), `highlight`, `strike` (term classes) |
| `image` | `image` (id in `images.json`), `frame`: `border`, `eyepiece`, `monitor`, `none`; `from` / `to` pan and zoom |

**Expressions** (`fn`, marker `x`/`y`) are a small safe language: numbers, variables (`x` and the
plot's `vars`), `+ - * / ^`, `pi`, `e`, and `sin cos tan exp ln log sqrt abs min max floor pow …`.
No `eval`. Animate a variable with a `set` cue on `vars`.

**Colours** are theme slots: `ink`, `muted`, `accent`, `a1`…`a5`, `highlight`, `myth`, `truth`,
`paper` (or a hex). The theme follows the set: ink on light grounds, chalk on the mid-tone science
grounds. Accents keep at least 3:1 against the wall (tested).

**The physics is real.** The orbit solves Kepler's equation (the planet speeds up near the star),
waves are the actual superposition, standing waves are `2A sin kx cos ωt`, the gas bounces in
closed form, dice are seeded draws. Everything is a pure function of the frame.

## Equations

Write TeX and tag the terms a beat should point at with `\class{t-name}{…}`:

```json
{ "id": "why", "kind": "equation", "hidden": true,
  "params": { "tex": "a = \\frac{F}{m} = \\frac{\\class{t-m1}{m}\\,g}{\\class{t-m2}{m}} = \\class{t-g}{g}" } }
```

MathJax typesets it in the prepare step (Node, no fonts, no network), cached by a hash of the TeX in
`generated/cache/`, written to `generated/equations.json`. `pnpm compile` and `pnpm render` do this
themselves. `POST /validate` typesets in memory, so bad TeX is a 422 before any voice is made. The
engine never runs MathJax. On `show` the parts appear left to right; `set` cues light up
(`highlight`) or cancel (`strike`) tagged terms.

## NASA and ESA images

Images are downloaded once into `public/images/` and listed in `src/data/images.json` with the
credit exactly as the source gives it, the licence, the source page and the date. Only
`nasa-pd`, `cc-by-4.0` (ESA/Webb, ESA/Hubble) and `cc-by-sa-3.0-igo` load; the ESA Standard Licence
is left out until someone has read it for a monetised channel. Mark a human-made artist's
impression `"impression": true` (it is labelled on screen). AI images are never added.

While an image figure is on screen, its credit is burned in under the captions. The package step
lists it in `<name>.sources.txt`. Keep real images to about a third of a short; put them in a drawn
frame (`eyepiece`, `monitor`) so the channel still looks like itself.
