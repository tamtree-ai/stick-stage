# Contributing to StickStage

Thanks for looking. Issues and pull requests are welcome, and the easiest way in is a piece of
data: StickStage's characters, sets, props, poses, SFX and skit templates are JSON, not engine code.

## Set up

```sh
pnpm install
pnpm bootstrap     # Rhubarb + headless Chrome
pnpm demo          # renders out/fine.mp4
```

Node 22+ and pnpm. `pnpm diagnose` shows what your machine has and lacks.

## Before you open a pull request

```sh
pnpm test && pnpm typecheck && pnpm lint
```

CI runs the same three. If you changed how something looks or moves, render it and look at the
video, because motion is reviewed as video, not stills. Say what you rendered in the pull request.

## Ground rules

These are enforced by tests and lint, and explained in [CLAUDE.md](CLAUDE.md):

1. **Rendering is frame-pure.** Every visual is a function of `(frame, props)`. No `Date`, no
   `Math.random()`, no state for animation. Use the seeded helpers in `src/engine/lib/seed.ts`.
2. **Everything is data**, validated with zod, and every document carries `schemaVersion`.
3. **No network at render time.**
4. **`src/engine/**` stays app-agnostic**: no `fs`, no `process.env`, no `registerRoot`.
5. **Small modules**: no file over about 300 lines.
6. **Original characters only.** Match a genre, not someone else's cast.

## Good places to start

- A new **prop**: [docs/creating-props.md](docs/creating-props.md)
- A new **set** or background: [docs/creating-backgrounds.md](docs/creating-backgrounds.md)
- A new **character**: [docs/creating-characters.md](docs/creating-characters.md)
- A new **skit template**: [docs/skits.md](docs/skits.md)
- **Docs and typos** are always welcome.

Look for the [`good first issue`](https://github.com/tamtree-ai/stick-stage/labels/good%20first%20issue) label.

## Licensing

StickStage's code is [MIT](LICENSE). By contributing you agree your contribution is MIT too. Do not
add assets you do not have the right to share: SFX and figures carry their licence in the manifest
(`src/data/sfx.json`, [docs/figures.md](docs/figures.md)).
