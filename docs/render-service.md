# Render service API

The walk-through of one video over these routes, with curl, is [One video, end to end](end-to-end.md). This page is the reference for every route.

StickStage as an HTTP service, for the tamtree `stickstage` plugin nodes (`validate`,
`render_submit`, `render_collect`). The service owns timing, lip-sync and rendering. Tamtree owns
the script LLM, the TTS and the credentials. The service never calls a TTS or LLM API.

```
pnpm serve                       # needs STICKSTAGE_API_TOKEN (or --insecure-local)
pnpm serve:smoke [baseUrl]       # validate + render public/skits/fine over HTTP, downloads to out/smoke/
docker build --platform linux/amd64 -t stickstage-render .
```

All endpoints except `/healthz` need `Authorization: Bearer <STICKSTAGE_API_TOKEN>`. Errors are
JSON: `{ "error": { "code", "message", "diagnostics"?: [{ level, code, path, message, expected?, example? }] } }`.
Diagnostic codes are the compiler's own, and they are stable (`voice-stale`, `unknown-pose`, …).

## `POST /validate`: before any TTS

Body (JSON): exactly one of `{ "premise": <premise.json> }` (staged with its template, like
`pnpm new`), `{ "skit": <skit.json> }`, `{ "reply": "<model text>", "brief": <brief> }` or
`{ "reply": "<model text>", "skit": <skit.json> }`. Optional: `"catalog_version"`, the `version` from `GET /catalog`
that the client pinned; when it differs from the service's, the answer is `409 catalog-mismatch`
(`error.expected`, `error.got`) before anything is staged.

A `reply` is the model's words (`POST /write/prompt`). StickStage turns a draft into a premise
(returned as `premise` alongside `skit`) and a change into a restaged skit. Corrections
(unknown mood, forced scene count, a set the brief already fixed) arrive as `warnings`.
A reply that cannot be used is `422 invalid-reply`: `error.repair.prompt` is the one message
to send the model again. A brief that itself is invalid is `400 bad-request` (the client's fault).
A skit that fails `parseSkit` on a revise is `422 invalid-skit`.

## `POST /write/prompt`: the words the model is asked to write

Body: `{ "mode": "draft", "brief": {…} }` or `{ "mode": "revise", "skit": {…}, "note": "…" }`.
Optional `catalog_version` (409 on mismatch, before a prompt is built).

`200`: `{ "system", "prompt", "writer": "w2", "catalogVersion" }`. The caller picks the model,
sends `system` + `prompt`, and posts the text back to `/validate` as `reply`. `pnpm write` is
the same contract from the repo.

`200`:
```json
{
  "ok": true,
  "catalogVersion": "c1-3f9a…",
  "skit": { "...": "the staged skit.json; send this to /render" },
  "lines": [ { "id": "b1", "speaker": "milo", "character": "milo", "text": "Hey. You okay?", "delivery": "flat",
               "voice": { "provider": "google", "voiceId": "en-US-…", "settings": {} } } ],
  "estimatedDurationSec": 7.8,
  "warnings": [],
  "check": { "ok": true, "errors": 0, "warnings": 0, "findings": [], "ran": ["…"] }
}
```

- `lines` is exactly what to voice: one audio file per entry. Its `text` is what the TTS must
  say, and what `voice.json` must repeat verbatim.
- `voice` holds the character's hints from `src/data/characters/<id>.json`. It is absent when the
  character has none, and then the plugin picks a voice.
- A voice-over line has `"narrator": true`, `speaker` = the narrator's id, and `voice` from the
  skit's `narrator.voice` (not a character). Voice it like any other line; prep skips lip-sync for it.
- `check` runs the self-check with placeholder timings (~160 wpm). The real check runs again at
  render with the real audio.
- `422 invalid-skit` means the premise or skit has errors. File-clip beats (`audio.source: "file"`) are
  rejected with `clip-unsupported`.

## `POST /render`: submit

`multipart/form-data`:

| Part | What |
|---|---|
| `skit` | skit.json (text) |
| `voice` | voice.json exactly as in [voice-contract.md](voice-contract.md), `audio: "voice/<file>"` |
| `options` | optional JSON: `{ "skipCheck": false, "debug": false, "sheet": false }` |
| files | one file part per line; its **filename** is the `<file>` in `voice/<file>` (WAV, MP3 or OGG) |

Mapping `shortvideo.google_tts` output to a voice line: `durationMs = duration_seconds × 1000`.
With one SSML mark per word, `words = marks.map(m => ({ text: <that word>, startMs: m.time_seconds × 1000 }))`.
Phrase captions work too: one entry per phrase, holding the phrase's first word. Without timings,
leave out `words`. The service then estimates them from silences, and mouths still come from Rhubarb.

`202`: the job (below), `status: "queued"`. `422 invalid-render-request` means the upload has problems,
and nothing is queued:

| Code | Meaning |
|---|---|
| `voice-missing` | a spoken beat has no voice line |
| `voice-stale` | a voice line's `text` isn't the skit's line |
| `audio-path` | `audio` isn't `voice/<plain file name>.{wav,mp3,ogg}` |
| `audio-missing` | no file part with that filename |
| `audio-format` | the file isn't WAV/MP3/OGG (e.g. a saved error page) |
| `voice-invalid`, `field-missing`, `bad-json`, `skit.*` paths | malformed parts |

`413` means the body is over 100 MB. Voice lines for non-spoken beats are dropped, with a job warning.

## `POST /prepare`

Same multipart body as `POST /render`. Runs prep only and returns when `voice.prepared.json` (and the audio files) are ready. `options.mode` is forced to `prepare`.

## `POST /render` options

`options` may also set `quality` (`draft` is 540×960, faster encoder), `lang` (BCP 47 dub), `variants` (`pov`, `teaser`, `slam` — one MP4 each), `callback` (`{ url, secret }`, HMAC-SHA256 in `x-stickstage-signature`, three tries), `covers` (default on: `cover` and `thumbnail` stills), and `sceneCache` (default on for multi-scene jobs).

## `GET /jobs/:id/events`

Server-sent events. Each `data:` line is the same JSON as `GET /jobs/:id`. The stream ends when the job succeeds, fails, or is cancelled. The callback secret is not included. While the job is idle between events the service sends a `: ping` comment every 15 s, so a client read timeout does not mistake a long render stage for a dead connection; clients ignore comment lines.

## `GET /jobs/:id`: status

```json
{
  "id": "…", "status": "running", "stage": "render", "progress": 0.4,
  "createdAt": "…", "startedAt": "…", "finishedAt": null,
  "title": "Not being sarcastic", "durationSec": 8.9,
  "warnings": [], "diagnostics": [], "check": { "ok": true, "errors": 0, "warnings": 0, "findings": [] },
  "error": { "code": "check-failed", "message": "…" },
  "outputs": { "mp4": { "url": "/jobs/…/files/mp4", "type": "video/mp4", "bytes": 2306931, "name": "not-being-sarcastic.mp4" } }
}
```

- `status`: `queued` → `running` → `succeeded` | `failed` | `cancelled`.
- `stage`: `prep` → `compile` → `check` → `render` → `post`. `progress` runs from 0 to 1 within `render`.
- Failure codes: `prep-failed`, `invalid-skit` (with `diagnostics`), `check-failed` (see `check.findings`;
  resubmit with `skipCheck` to render anyway), `render-failed`, `internal`.
- `outputs` (on success): `mp4`, `srt` (script-exact subtitles), `txt` (post caption: description,
  hashtags, AI-voice note, script), `manifest` (title, duration, check summary), and `sheet`
  (contact sheet PNG, if requested).

Poll every few seconds. As a guide, an 8.9 s skit takes ~14 s on an M-series Mac, and a 29 s
skit takes ~90 s in the amd64 container under emulation. Real x86_64 hosts are much faster.

## `GET /jobs/:id/files/:name`

Downloads an output by its key (`mp4`, `srt`, `txt`, `manifest`, `sheet`).

## `DELETE /jobs/:id`

Cancels a queued or running job and removes its media. Returns the job.

## `GET /sets`

The set catalog, for whoever writes the premise (a person or the script LLM). Put it in the
prompt and have the premise set `"set"`; without one, every premise of a template gets the
same default set.

```json
{ "sets": [ { "id": "cafe-1", "kit": "interior",
              "description": "A coffee shop: menu chalkboard, espresso counter, pastry case. Standing.",
              "tags": ["cafe", "coffee", "barista", "ordering", "date"], "seated": [] } ] }
```

`seated` lists the marks where a cast member starts sitting (premise staging seats them). An
unknown set id in a premise is a `422` whose diagnostic lists the known ids.

## `GET /catalog`

Everything a brief can pick from, and the registry's content version:

```json
{ "version": "c1-3f9a0c1e7d2b4a56",
  "characters": [ { "id": "milo", "name": "Milo" }, { "id": "june", "name": "June" } ],
  "sets": [ "…as GET /sets…" ],
  "templates": [ { "id": "exchange", "cast": 2, "defaultSet": "living-1", "description": "Two characters trade lines; …" } ],
  "expressions": ["neutral", "…"], "props": ["phone", "…"] }
```

`version` is a hash of the characters, poses, expressions, props, sets, SFX, reactions and safe
area. The `stickstage/data` package entry exports the same `catalog`, so a client that ships
the package can check a draft in-process and know the service will agree.

## `GET /healthz` (no auth)

`{ ok, queue, catalogVersion, bundle: "building" | "ready" | "failed", lipSync: "rhubarb" | "estimated", auth }`

## Running it

| Env | Default | |
|---|---|---|
| `STICKSTAGE_API_TOKEN` | (required) | shared bearer token |
| `PORT` / `HOST` | 8787 / 127.0.0.1 (container: 0.0.0.0) | |
| `STICKSTAGE_JOB_TTL_HOURS` | 24 | finished jobs are deleted after this |
| `STICKSTAGE_BROWSER` | Remotion's Chrome Headless Shell | |
| `STICKSTAGE_RENDER_CONCURRENCY` | Remotion's default | tabs per render |
| `STICKSTAGE_ALLOW_ESTIMATED_MOUTHS` | off | `1` lets it start without Rhubarb |
| `RHUBARB_PATH` | `tools/`, then PATH (container: `/opt/rhubarb/rhubarb`) | |

- **One render at a time.** Renders queue FIFO, since each one already uses every core. Scale by adding
  instances with their own volumes, not threads.
- **State is on disk.** Each job is a skit folder at `public/skits/_jobs/<id>/` with `job.json`. That
  directory is the container's volume. On restart, queued and interrupted jobs are re-queued.
- **TLS** belongs to the host (Fly, Cloud Run, or Caddy in front of a VM). The service speaks plain HTTP.
- **Cloud Run:** the queue lives in memory and renders run outside requests, so use
  `--no-cpu-throttling`, `--max-instances=1` and `--min-instances=1`.
- **x86_64 only**, because Rhubarb has no Linux arm64 build.

## How it's built

- `src/server/`: `http.ts` (router, bodies), `auth.ts`, `validate.ts`, `submit.ts`, `jobs.ts`
  (queue), `pipeline.ts` (prep → compile → check → render → post), `prep-child.ts`, `app.ts`.
  `scripts/serve.ts` wires it up for this repo.
- Prep runs in a child process. It shells out to ffmpeg and Rhubarb synchronously, and in-process it
  would stall status polls.
- The Remotion bundle is built once per process with `symlinkPublicDir: true`, so job folders
  written after the bundle are served. (The default copies `public/` at bundle time.)
- The job pipeline and `pnpm batch` share `src/node/post.ts`, so both produce the same post files.
