# One video, end to end

For the person who has to know where each file comes from, which command writes it, and which HTTP call does the same job. Read [Set up the machine](set-up.md) first and keep the service stopped until the later section. This page uses the command line, then repeats the same short over HTTP.

The example id is `running-late`. Pick another id if that folder is already yours.

## The order, once

Nothing later in the list is allowed to invent what an earlier step decides.

1. A person writes a **brief** (a topic and a cast) or a **premise** (the actual lines).
2. If there is a brief, Stick Stage builds a **writer prompt**. A model or a person answers with words only. Stick Stage turns that reply into a premise. One repair is allowed.
3. The premise is **staged** into `skit.json`. Lines are copied exactly. Blocking, a pause before the punchline, and a hold after it are added.
4. Something writes **audio** for each spoken line, plus `voice.json`. On a Mac that something can be `say`. For a post, it is the harness.
5. **Prep** measures the audio, aligns the words to the script, and runs Rhubarb. The result is cached by a hash of the audio and the text.
6. **Compile** turns the skit plus those timings into a timeline: beats, cuts, reactions, sound effects. The same skit and the same timings always compile the same way.
7. **Check** looks at that timeline for the hook, the punchline camera, faces, and text collisions.
8. **Render** draws every frame from that timeline. The render reads local files only.
9. **Post** writes the MP4, the `.srt`, the `.txt`, and the `.json` you hand over.

A language model is only in step 2, and only outside this process. Text-to-speech is only in step 4, and only outside this process. Rendering has no network access and no provider keys.

## Path A. Lines you already wrote

Create the premise the way [Your first video](your-first-video.md) describes, or start from the template and edit:

```sh
pnpm new running-late --template=exchange
```

File written: `public/skits/running-late/premise.json`.

When the lines are real:

```sh
pnpm new running-late
```

File written: `public/skits/running-late/skit.json`.

Open `skit.json` and confirm the `line` strings match the premise word for word. They should. If you need a field the premise cannot express (a specific camera, a sound effect, a sign's text), edit `skit.json` after this step. The field list is [The skit file](skits.md). If you then run `pnpm new running-late --force`, those edits are replaced by a fresh staging. Keep hand edits in `skit.json`, and keep line changes in the premise or in a revise.

## Path B. A topic, then a writer

File you write: `public/skits/running-late/brief.json`.

```json
{
  "topic": "someone who is always five minutes late",
  "description": "Office. June is late. Milo counted.",
  "cast": [
    { "id": "milo", "character": "milo" },
    { "id": "june", "character": "june" }
  ]
}
```

```sh
pnpm write prompt --brief=public/skits/running-late/brief.json
```

Stdout is `{ "writer": "w1", "system": "…", "prompt": "…" }`. The caller chooses the model, sends `system` and `prompt`, and saves the model's JSON as `public/skits/running-late/reply.json`.

```sh
pnpm write draft --brief=public/skits/running-late/brief.json --reply=public/skits/running-late/reply.json > /tmp/premise.json
echo $?
```

Exit 0: move `/tmp/premise.json` to `public/skits/running-late/premise.json`. Lines on stderr are warnings. Some of them are already applied in the premise: an unknown mood was played as `neutral`, a room the brief does not allow was replaced, a slam on the wrong line was dropped. A `line-count` warning is not a rewrite. It means the reply is outside 11 to 13 lines, and the lines were kept. Exit 2: stderr is the single repair prompt. Replace `reply.json` and run `draft` once more. Exit 1: the brief or the reply file is malformed, and the message says which field. That is the client's bug, not a repair.

Then stage, same as path A:

```sh
pnpm new running-late
```

## Voices

Spoken beats are the lines. Each one needs an audio file and a row in `voice.json`. The row's `text` must equal the line. The row's `id` must equal the beat id. The file is named in `audio`, relative to the skit folder, and must be WAV, MP3, or OGG.

Draft, on a Mac:

```sh
pnpm voice:say running-late
```

Writes `public/skits/running-late/voice/<beatId>.wav` and `voice.json`. There are no word timings. Prep will estimate them from silences. Mouths still come from the real waveform.

Real voices: the harness does this write. The contract, including narrator lines and phrase-level marks, is [Voices](voice-contract.md). Do not commit provider keys. Do not add a text-to-speech client to this repo.

`pnpm direct running-late --say` runs `voice:say` for you when `voice.json` is missing or a line's text has changed. Without `--say`, a stale line stops the command and names the beat ids.

## Prep, compile, check, picture

You can run the pieces, which is what you want when a render failed and you need to see where.

```sh
pnpm prep running-late
```

Writes `public/skits/running-late/generated/voice.prepared.json`. Unchanged audio and text is a cache hit the second time. Prep shells out to ffmpeg and Rhubarb. It does not use the network. A narrator line is aligned for captions and gets no mouth cues.

```sh
pnpm compile running-late
```

Prints the timeline. The first line is the title and the length in seconds. Each beat follows, with the punchline marked. Each cut has a reason in parentheses. Sound effects and slams are listed with times. The same text is the heart of `generated/timeline.json`.

```sh
pnpm check running-late
```

Prints the findings. Errors fail the command. Warnings do not. The names and what to do about them are in [Watch it and change it](watch-and-change.md). The report is also `generated/check.json`.

```sh
pnpm render running-late
```

Writes `out/running-late.mp4`. Add `--debug` for `out/running-late-debug.mp4` with beat and shot labels burned in. Add `--quality=draft` for 540 by 960. Add `--frames=0-90` to render a slice while you are fixing one moment. Add `--lang=es` when `skit.json` has an `i18n.es` block; the picture and the captions use that dub. Japanese, Chinese, Korean, Arabic, Hebrew, Devanagari, and Sinhala use the Noto files in `public/fonts/`.

Or do the whole local loop in one command:

```sh
pnpm direct running-late --say
```

That is validate, voices, prep, compile, check, `out/running-late-sheet.png`, then the MP4 if the check passed. `--json` also prints `generated/direct.json`.

Package:

```sh
pnpm batch running-late
```

Writes `out/posts/running-late/`. See [The files you hand over](files-you-hand-over.md).

## What the director puts in, so you know what not to duplicate

You do not have to author any of this. It is here so a bad cut can be traced.

- Listeners look at the speaker. On a longer line they may nod. On the last word they take a reaction from `src/data/reactions.json`, chosen from the speaker's expression. With three or more people, one listener reacts.
- The camera opens on a two-shot. Back-and-forth lines stay there.
- The punchline gets a face close-up when the expression is a strong one, otherwise a push-in on the last word. A silent reaction of the listener follows, unless the next beat is already silent.
- A strong emotion on a silent beat shows in the two-shot first, then cuts to the face about ten frames later and holds at least a second.
- Close-ups of emotion are budgeted, by default at most one per three seconds, and push-ins stay at least a second and a half apart. A `style` changes those numbers. The numbers live in `src/data/styles/`.
- Speakers nod on a stressed word and make one gesture, unless the skit says `"speechMotion": "off"` or that beat already has a pose, a gag, a fall, or a prop move.
- `"music": "room"` ducks under dialogue and is silent on the punchline.
- `"coldOpen": "teaser"` plays about a second of the punchline reaction, then slides into the first beat. `"pov"` and `"none"` are the other values. A show's cold open applies when the skit does not name one.

`pnpm compile` is how you see which of those fired. The reason string on each cut is the explanation.

## The same short over HTTP

Start the service and copy the token. [Set up the machine](set-up.md) has the command. The examples below use `dev-token` and `http://127.0.0.1:8787`. Every route except `/healthz` needs the header `Authorization: Bearer <token>`.

Wait until this prints `"bundle": "ready"`:

```sh
curl -s http://127.0.0.1:8787/healthz
```

### Catalog, so the client knows what it may name

```sh
curl -s -H "Authorization: Bearer dev-token" http://127.0.0.1:8787/catalog
```

The body includes `version` (a hash, shaped like `c1-` plus 16 hex digits), the characters, the rooms, the nine shapes, the expressions, the props, the gags, and the styles. Pin `version` on later calls as `catalog_version`. If the service has different data, it returns `409` with code `catalog-mismatch` before it stages anything.

Rooms alone:

```sh
curl -s -H "Authorization: Bearer dev-token" http://127.0.0.1:8787/sets
```

### Writer prompt, then validate

```sh
curl -s -H "Authorization: Bearer dev-token" -H "Content-Type: application/json" \
  -d @- http://127.0.0.1:8787/write/prompt <<'EOF'
{
  "mode": "draft",
  "brief": {
    "topic": "someone who is always five minutes late",
    "cast": [
      { "id": "milo", "character": "milo" },
      { "id": "june", "character": "june" }
    ]
  }
}
EOF
```

`200` returns `system`, `prompt`, `writer` (`w1`), and `catalogVersion`. Send `system` and `prompt` to the model. Post the model's text back:

```sh
curl -s -H "Authorization: Bearer dev-token" -H "Content-Type: application/json" \
  -d @- http://127.0.0.1:8787/validate <<'EOF'
{
  "reply": "<the model text, a JSON object>",
  "brief": {
    "topic": "someone who is always five minutes late",
    "cast": [
      { "id": "milo", "character": "milo" },
      { "id": "june", "character": "june" }
    ]
  }
}
EOF
```

A `200` body has `ok`, `catalogVersion`, `skit` (send this to render), `premise` (the record of the staged joke), `lines`, `estimatedDurationSec`, `warnings`, and `check`. `lines` is exactly what to voice. One entry looks like this. `voice` is a hint from the character file. The harness picks a voice when `voice` is absent.

```json
{
  "id": "b1",
  "speaker": "milo",
  "character": "milo",
  "text": "You said nine.",
  "voice": { "provider": "google", "voiceId": "en-US-…", "settings": {} }
}
```

`check` at this moment uses placeholder timing, about 160 words a minute. The real check runs again at render, against the real audio.

Other `validate` bodies, exactly one of: `{ "premise": {…} }`, `{ "skit": {…} }`, `{ "reply": "…", "brief": {…} }`, `{ "reply": "…", "skit": {…} }`. A reply against a brief returns a premise and a skit. A reply against a skit is a revision.

| Status | Code | Meaning |
|---|---|---|
| 409 | `catalog-mismatch` | `catalog_version` does not match. `expected` and `got` are on the error. Nothing was staged. |
| 422 | `invalid-reply` | The model's text cannot be used. `error.repair.prompt` is the one message to send back. |
| 400 | `bad-request` | The brief itself is invalid. |
| 422 | `invalid-skit` | The document failed to parse. `diagnostics` name the path. A file-clip beat (`audio.source` of `file`) is `clip-unsupported`. |

A revise prompt is the same route with `"mode": "revise"`, `"skit"`, and `"note"`.

### Render

Voice every entry in `lines`. Build a `voice.json` as in [Voices](voice-contract.md). Then submit multipart form data.

| Part | What |
|---|---|
| `skit` | The `skit` object from validate, as a text part. |
| `voice` | The `voice.json` text. Each `audio` value is `voice/<filename>`. |
| `options` | Optional JSON. See below. |
| One file part per line | The filename must be the `<filename>` in `voice/<filename>`. WAV, MP3, or OGG. |

```sh
curl -s -D - -H "Authorization: Bearer dev-token" \
  -F "skit=<public/skits/running-late/skit.json" \
  -F "voice=<public/skits/running-late/voice.json" \
  -F "b1.wav=@public/skits/running-late/voice/b1.wav" \
  -F "b2.wav=@public/skits/running-late/voice/b2.wav" \
  http://127.0.0.1:8787/render
```

Add a `-F` for every line. A `202` body is the job, with `status` of `queued`. A `422` with `invalid-render-request` queues nothing.

| Code | Meaning |
|---|---|
| `voice-missing` | A spoken beat has no voice row. |
| `voice-stale` | A row's `text` is not the line. |
| `audio-path` | `audio` is not `voice/<plain name>.wav`, `.mp3`, or `.ogg`. |
| `audio-missing` | No file part with that filename. |
| `audio-format` | The bytes are not WAV, MP3, or OGG. A saved error page lands here. |
| `voice-invalid`, `field-missing`, `bad-json` | A part is malformed. |

`413` means the body is over 100 MB. Voice rows for beats that are not spoken are dropped, and the job records a warning.

`options` may include:

| Field | Effect |
|---|---|
| `skipCheck` | Render even when the check has errors. Default false. |
| `debug` | Burn in labels. |
| `sheet` | Also write the contact sheet. |
| `quality` | `"draft"` is 540 by 960 and a faster encoder. The check still runs. |
| `lang` | A BCP 47 tag. Renders the matching `i18n` block. |
| `variants` | Any of `pov`, `teaser`, `slam`. One MP4 per opening. |
| `covers` | Default on. Writes a cover still and a thumbnail still. |
| `sceneCache` | Default on for multi-scene jobs. |
| `callback` | `{ "url", "secret" }`. The service POSTs the job JSON, signed `HMAC-SHA256` in the header `x-stickstage-signature`. Three tries. The secret is not echoed back on the job. |

Poll:

```sh
curl -s -H "Authorization: Bearer dev-token" http://127.0.0.1:8787/jobs/<id>
```

`status` moves `queued` to `running` to `succeeded`, `failed`, or `cancelled`. `stage` moves `prep` to `compile` to `check` to `render` to `post`. `progress` runs from 0 to 1 during `render`.

Failure `error.code` is one of `prep-failed`, `invalid-skit`, `check-failed`, `render-failed`, `internal`. On `check-failed`, read `check.findings`. Resubmit with `skipCheck` only after a person has accepted the finding.

On success, `outputs` has `mp4`, `srt`, `txt`, and `manifest`. `sheet` is there if you asked for it. Download by key:

```sh
curl -s -H "Authorization: Bearer dev-token" -o running-late.mp4 \
  http://127.0.0.1:8787/jobs/<id>/files/mp4
```

Or listen instead of polling:

```sh
curl -N -H "Authorization: Bearer dev-token" http://127.0.0.1:8787/jobs/<id>/events
```

Each `data:` line is the same JSON as the job route. The stream ends when the job succeeds, fails, or is cancelled.

Cancel and delete the media:

```sh
curl -s -X DELETE -H "Authorization: Bearer dev-token" http://127.0.0.1:8787/jobs/<id>
```

A voiced preview without an MP4 is `POST /prepare`, with the same multipart body as `/render`. It returns when `voice.prepared.json` and the audio are ready. Tamshoot can then play the skit on the real timings.

An 8.9 second skit is about 14 seconds of render on an M-series Mac. A 29 second skit is about 90 seconds in the amd64 container under emulation.

## Where the code for each step lives

| Step | Code |
|---|---|
| Writer prompt, reply, premise | `src/engine/writer/` |
| Premise to skit | `src/engine/templates/` |
| Skit schema and diagnostics | `src/engine/director/schema.ts` |
| Timeline | `src/engine/director/` (`layout.ts`, `tracks.ts`, `shots.ts`, `compile.ts`) |
| Check | `src/engine/qa/` |
| Picture | `src/engine/rig/`, `face/`, `set/`, `shots/`, `text/` |
| Prep, render, post files | `src/node/` |
| HTTP | `src/server/` (`validate.ts`, `submit.ts`, `jobs.ts`, `pipeline.ts`) |
| Commands | `scripts/` |
| Characters, rooms, sounds, styles | `src/data/` |

`src/engine/` does not read the filesystem, does not read environment variables, and does not register a Remotion root. Scripts and `src/node/` do the file work. That split is enforced by the tests.

The library entry point is `packages/stickstage/`. It is private and not published. A client that ships the package can run the same catalog hash in process and know the service will agree.

## A dub, a cover, a hook variant

These are render options, not a second authoring pass.

- **Dub.** `meta.language` is a BCP 47 tag, English when omitted. `i18n.<lang>` holds replacement lines by beat id, plus slams, the POV card, title cards, and room labels. `pnpm render <id> --lang=es` or `options.lang` compiles that text against the same picture.
- **Covers.** The service writes them by default from the punchline reaction. Batch on the command line writes the four post files and does not write those stills.
- **Openings.** `coldOpen` on the skit or the show is `pov`, `none`, or `teaser`. `options.variants` renders extra MP4s of the same voices with different openings (`pov`, `teaser`, `slam`) and one manifest.

## What a failed render is usually about

Work down the list. Stop at the first one that matches.

1. **The JSON is wrong.** `pnpm compile <id>` prints a path, the expected value, and an example. Fix that path. Do not restage.
2. **The voice does not match the line.** `voice-stale` or `voice-missing`. Re-speak that beat. Do not edit `text` inside `voice.json` to silence the error. The captions would show words the audio does not say.
3. **The check failed.** Read `check.findings`. The human page says what each code means. `skipCheck` is a decision, not a fix.
4. **Rhubarb or ffmpeg failed.** The log line is the error. Install the tool. Do not switch on estimated mouths to get past a crash you have not read.
5. **The service has no bundle.** `/healthz` says `bundle` is `building` or `failed`. Wait, or read `out/serve.log`.
6. **The job vanished.** Finished jobs live for `STICKSTAGE_JOB_TTL_HOURS` (24 by default). Download on `succeeded`.

The field-by-field reference for the skit, the voice file, and every route stays in [The skit file](skits.md), [Voices](voice-contract.md), and [The render service](render-service.md).
