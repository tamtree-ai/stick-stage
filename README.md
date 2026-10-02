# StickStage

Data-driven comedy-skit engine built on [Remotion](https://www.remotion.dev). Big-head stick
characters, sets drawn entirely in code, TTS dialogue with lip-sync, and a director that turns a
`skit.json` into a 9:16 short video frame by frame.

You write the premise and the lines. StickStage handles timing, listener reactions, shots and
cuts (two-shots, punch-ins, emotion close-ups), subtitles, SFX and rendering.

The manual, written so a new person can follow it and so an engineer can trace one video from a topic to the posted files: [docs/README.md](docs/README.md).

## Quickstart

No account, no key, no Docker. You need Node 22+ and pnpm.

> **Licences before you start.** StickStage renders with [Remotion](https://www.remotion.dev),
> which is free for individuals and companies of up to 3 people. Larger companies need a
> [Remotion company licence](https://www.remotion.dev/license); part-timers and contractors count.
> StickStage's own licence is in [License](#license).

<!-- quickstart -->
```sh
pnpm install
pnpm bootstrap
pnpm demo
```
<!-- /quickstart -->

`pnpm bootstrap` downloads Rhubarb Lip Sync (checked against a pinned SHA-256) and Remotion's
headless Chrome, then prints one line per check. `pnpm demo` renders the example skit, whose
voices are in the repo, to `out/fine.mp4`. It never fails because of Rhubarb: without it, the
mouths are estimated from the words. `pnpm diagnose` shows what this machine has and lacks.

Then make your own:

```sh
pnpm try "my cat ignores me"     # stages a two-person premise for you to write
pnpm try my-cat-ignores-me       # voices it with Kokoro on this computer and renders it
```

Voices come from [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0), run in-process
on the CPU. Its weights download once (~90 MB) to `~/.cache/stickstage/kokoro`. They are flatter
than cloud voices on sarcasm; Tamtree's cloud TTS is the quality path.

### Your own model (optional)

You write the jokes. To have a model draft them, point StickStage at any OpenAI-compatible server
or at Anthropic. `pnpm try` and `pnpm write draft --model` then write the premise, with one repair
when the reply can't be used:

```sh
export LOCAL_LLM_BASE_URL=http://localhost:11434/v1   # Ollama; LM Studio, OpenRouter, OpenAI work too
export LOCAL_LLM_MODEL=qwen3:8b
export LOCAL_LLM_API_KEY=…                             # only if the server wants one
```

Without a model, `pnpm write prompt --brief=<file>` prints the prompt to paste into any chatbot,
and `pnpm write draft --brief=<file> --reply=<file>` turns its reply into a premise. The reply's
shape is [`schemas/writer-reply.schema.json`](schemas/writer-reply.schema.json).

## Requirements

- Node 22+, pnpm
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) for mouths: `pnpm bootstrap`
  installs it into `tools/`; or set `RHUBARB_PATH`, or put it on `PATH`. The macOS build is
  Intel-only, so Apple Silicon needs Rosetta (`softwareupdate --install-rosetta`); Linux arm64 has
  no release build (build it from source, or let the mouths be estimated)
- Kokoro (`kokoro-js`, an optional dependency) for local voices; macOS `say` (`pnpm voice:say`) also works
- whisper.cpp (`whisper-cli` + `WHISPER_MODEL`), only for lip-syncing to existing audio (optional)

```sh
pnpm dev            # Remotion Studio
scripts/start.sh    # render service in the background (scripts/stop.sh to stop)
```

Step by step, with the service and troubleshooting: [docs/getting-started.md](docs/getting-started.md).

## Make a skit

```sh
pnpm new myskit --template=exchange   # stage a premise.json; write the lines, then run again
pnpm voice:tts myskit                 # local voices (Kokoro); voice:say uses macOS say; Tamtree does this in production
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

The engine and the render service never call a TTS or an LLM, and no provider keys live in them.
In production the Tamtree harness writes `public/skits/<id>/voice/<line>.wav` and `voice.json`
(audio plus optional word timings); see [docs/voice-contract.md](docs/voice-contract.md). On your
own machine, the dev scripts fill the same contract: `pnpm voice:tts` (Kokoro in-process, or any
OpenAI-compatible `/audio/speech` at `LOCAL_TTS_BASE_URL`) and `pnpm voice:say` (macOS). `pnpm prep`
then aligns words to the script and runs Rhubarb, cached by content hash. Rendering needs no
network access.

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
