# StickStage

Data-driven comedy-skit engine built on [Remotion](https://www.remotion.dev). Big-head stick
characters, sets drawn entirely in code, TTS dialogue with lip-sync, and a director that turns a
`skit.json` into a 9:16 short video frame by frame.

You write the premise and the lines. StickStage handles timing, listener reactions, shots and
cuts (two-shots, punch-ins, emotion close-ups), subtitles, SFX and rendering.

## Requirements

- Node 22+, pnpm
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) for mouths: `RHUBARB_PATH`,
  `tools/Rhubarb-Lip-Sync-*/rhubarb` (gitignored), or on `PATH`
- macOS `say` for dev voices (optional; real voices come from the tamtree harness)
- whisper.cpp (`whisper-cli` + `WHISPER_MODEL`), only for lip-syncing to existing audio (optional)

```sh
pnpm install
pnpm dev            # Remotion Studio
scripts/start.sh    # render service in the background (scripts/stop.sh to stop)
```

Step by step, with the service and troubleshooting: [docs/getting-started.md](docs/getting-started.md).

## Make a skit

```sh
pnpm new myskit --template=exchange   # stage a premise.json; write the lines, then run again
pnpm voice:say myskit                 # dev voices (the tamtree harness does this for real)
pnpm direct myskit                    # validate → prep → compile → self-check → contact sheet → MP4
```

Or step by step:

```sh
pnpm compile myskit    # validate and print the director's choices (beats, cuts and why, SFX)
pnpm check myskit      # self-check: safe areas, overlay collisions, contrast, staging rules
pnpm render myskit     # prep → compile → out/myskit.mp4   (--debug burns in labels)
pnpm batch --all       # post-ready mp4 + srt + txt + json per skit in out/posts/
```

Templates: `exchange`, `interview`, `me-vs-me`, `pov-monologue`, `text-slam`. A full example is
in `public/skits/fine/skit.json`, and the authoring guide is [docs/skits.md](docs/skits.md).

A skit is one JSON file:

```json
{
  "schemaVersion": 1,
  "meta": { "title": "Not being sarcastic" },
  "set": "office-1",
  "cast": [
    { "id": "milo", "character": "milo", "mark": "left" },
    { "id": "june", "character": "june", "mark": "right" }
  ],
  "overlay": { "pov": "POV: your coworker says they're fine" },
  "beats": [
    { "id": "b1", "speaker": "june", "line": "I'm fine. Totally fine.", "expression": "deadpan" },
    { "id": "b2", "speaker": "milo", "line": "Right. Sure.", "pauseBeforeMs": 300,
      "text": [ { "type": "slam", "value": "SURE.", "at": { "word": "Sure" } } ] }
  ]
}
```

## Render service

`pnpm serve` runs StickStage as an HTTP service for tamtree: `POST /validate` (premise → skit + the
lines to voice), `POST /render` (skit + voice.json + audio → job), `GET /jobs/:id`. `Dockerfile`
builds the Linux image (Chrome Headless Shell + Rhubarb). API: [docs/render-service.md](docs/render-service.md).

## Voices

StickStage never calls a TTS API, and no provider keys live here. The tamtree agent harness writes
`public/skits/<id>/voice/<line>.wav` and `voice.json` (audio plus optional word timings); see
[docs/voice-contract.md](docs/voice-contract.md). `pnpm prep` then aligns words to the script and
runs Rhubarb, cached by content hash. Rendering needs no network access.

## Layout

| Path | What |
|---|---|
| `src/engine/` | Pure rendering and compiling: rig, face, props, sets, shots, text, director, QA. No `fs`, `process.env` or `registerRoot` |
| `src/node/` | File and tool adapters (ffmpeg, WAV, Rhubarb, whisper.cpp), prep, render backend, post files |
| `src/server/` | The render service (`pnpm serve`): routes, auth, job queue, render pipeline |
| `src/app/` | Remotion root, `Skit` compositions and the labs (`CharacterLab`, `CloseupLab`, `TalkLab`, `SetLab`, `StagingLab`, …) |
| `src/data/` | Characters (+ cast bibles), poses, expressions, sets, SFX manifest, safe areas |
| `scripts/` | CLI entry points behind the `pnpm` commands |
| `public/skits/<id>/` | `skit.json`, `voice.json`, `voice/*.wav`; `generated/` is gitignored |
| `packages/stickstage/` | Library package boundary (`stickstage`, `/schema`, `/remotion`, `/node`); not published |
| `skills/skit-director/` | Claude skill that stages a human-written premise into a valid `skit.json` |

## Development

```sh
pnpm test && pnpm typecheck && pnpm lint                  # before every commit
pnpm sheet <Comp> <from> <to> <step>                      # contact sheet PNG in out/
pnpm render <Comp> out/x.mp4 --frames=a-b                 # render any lab composition
```

Motion is reviewed as video, not stills. Rendering is frame-pure: every visual is a function of
`(frame, props)`, with seeded randomness only. See [CLAUDE.md](CLAUDE.md) for the core rules and
[DECISIONS.md](DECISIONS.md) for tuned values and design decisions.

## License

No license has been chosen yet. All rights reserved.

StickStage depends on Remotion, which is free for individuals and companies of up to 3 people.
Larger companies need a [company license](https://www.remotion.dev/license), and part-timers and
contractors count toward the limit.
