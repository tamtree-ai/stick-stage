# Making a science short

The science channel runs on the same engine as the comedy channel, with a different cast, sets
and one main format: the **misconception dialog** (`myth-flip`). The plan is
`../planning/2026-09-29-science-channel/plan.md`.

## The format

Gus (the skeptic) states something most people believe, with confidence. Vera (the host) shows
what really happens with a prop or a figure, Gus sees it, Vera says why, says why the myth felt
true, and lands a takeaway the viewer can repeat. Names are placeholders.

| Role | Who | What the director does |
|---|---|---|
| `myth` | skeptic | Smug face |
| `pushback` | host | Happy; holds the line's prop |
| `prediction` | skeptic | Arms crossed, smug |
| `demo` | host | Points at the first figure, looks at it; wide shot |
| `reaction` | skeptic | `concede` gag for a short line ("…huh."), else `double-take` |
| `why` | host | Points at the figure |
| `why-it-felt-true` | either | Shrug. Compile warns when a myth-flip has none |
| `takeaway` | host | The punchline: pause, hold, a slam if you give one; the skeptic reacts happy |
| `loop` | skeptic | Optional: starts the next myth, no punchline |

Lines without a role follow that order. A myth-flip needs a `myth` and a `takeaway` line.

## Steps

```
pnpm new heat-myth --template=myth-flip   # writes premise.json from src/data/templates/myth-flip.json
# write the lines, claims and figures in premise.json
pnpm new heat-myth                        # stage it into skit.json
pnpm voice:say heat-myth                  # dev voices (the harness does the real ones)
pnpm render heat-myth                     # prep (voices, equations) → compile → out/heat-myth.mp4
pnpm approve heat-myth --check            # what still needs checking
pnpm approve heat-myth --by=<owner>       # sign-off, pinned to the content
pnpm render heat-myth --post              # a render for posting: refused unless approved and unchanged
```

## Accuracy

A science skit (one with `claims`, or a myth-flip) carries:

- `claims: [{ text, source, checkedBy, beats }]`: every fact with a source. `beats` lists the lines
  that state it. A spoken line with a number and no claim behind it is a `claim-missing` warning.
- `simplifications: [...]`: where the picture breaks. It goes in the pinned comment.
- `approval: { approvedBy, hash, at }`, written by `pnpm approve` once every claim has a `checkedBy`.
  The hash covers everything the viewer sees and hears. Any later edit means approving again.

Gates: `pnpm render --post` and a `quality: "final"` render on the render service refuse an
unapproved or changed skit (`approval-unapproved`, `approval-changed`, `approval-unchecked-claims`).
Draft renders are not gated. The post files include `<name>.sources.txt` (claims, sources,
simplifications, image credits) and the manifest records who approved it and whether the content
still matches.

## Voice

Captions show `line`; a beat's `spoken` is what the voice says (`"ħ = h / 2π"` vs `"h-bar equals h
over two pi"`). Word timings are of the spoken words and are mapped back onto the caption.
`src/data/pronunciations.json` lists how to say Schrödinger, muon, Planck and the rest; each voiced
line carries the hints it needs (`pronounce`). See [voice-contract.md](voice-contract.md).

## The look

- Sets: `void-1` (the main stage), `blueprint-1`, `lab-1`, `space-1`. The grounds are mid-tone on
  purpose: dark outlines keep ≥ 3:1 against every tone, and figures switch to chalk colours.
- Props (categories `maths`, `science`): dice, coin, `ball` and `heavy-ball`, chalk, pointer stick,
  protractor, `number-card` (a card with a number: `"text": "7"`), magnifying glass, magnets,
  battery, light bulb, prism, beaker, flask, test tube, laser pointer, telescope.
- Sounds: `ding-idea`, `zap`, `hum`, `whoosh-warp`, `chalk-tap`, `blip`, `pop-annihilate`.
- Figures and equations: [figures.md](figures.md).
