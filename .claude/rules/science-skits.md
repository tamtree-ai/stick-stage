---
paths:
  - "public/skits/**"
  - "src/engine/viz/**"
  - "src/engine/director/science*.ts"
  - "src/data/images.json"
  - "src/data/pronunciations.json"
---

# Science skits and figures

Applies to any skit with `claims` or `"template": "myth-flip"` (today: `fine-print`, `coin-due`,
`old-light`, `slow-electrons`). Workflow: the `science-short` skill (`skills/science-short/SKILL.md`).

- **Owner-only fields:** never write `checkedBy`, `approval`, or run `pnpm approve --by=`. Report
  with `pnpm approve <id> --check`.
- Every fact or number on screen or in a line needs a claim with a source, and the claim's `beats`
  name the lines that state it. Mark sources you wrote from memory in your hand-back.
- Any edit to an approved skit clears the approval. Say so if you edit one.
- `fine-print` is hand-staged: never `pnpm new fine-print --force`. The same goes for any skit
  whose `skit.json` differs from what `pnpm new` would produce. Check `git log` for that file
  before you regenerate it.
- Figures are frame-pure drawers in `src/engine/viz/draw/`; equations are typeset in prep
  (`src/node/equations.ts`), never in the engine. A new figure kind gets params in `params.ts`, a
  drawer, an entry in `docs/figures.md`, and a page in `VizLab`.
- Images are licensed NASA/ESA inserts with credits; never AI images.
