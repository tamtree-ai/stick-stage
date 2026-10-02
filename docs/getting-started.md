# Getting started

The install steps, the service, and the failures you will actually see are in [Set up the machine](set-up.md).

If the machine is already set up and you want to make a video, start at [the manual](README.md) and follow [Your first video](your-first-video.md).

The rest of this page is the short form of that setup.

## 1. Install

```sh
node -v             # must be 22+
pnpm install
pnpm bootstrap      # Rhubarb into tools/ (pinned SHA-256, quarantine cleared) + headless Chrome
pnpm demo           # out/fine.mp4, no TTS needed
```

Lip-sync needs [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync); `pnpm bootstrap`
installs it. By hand: unzip a release into `tools/` (gitignored), e.g.
`tools/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb`, or set `RHUBARB_PATH`, or put `rhubarb` on `PATH`.
The macOS binary is Intel-only (Apple Silicon needs Rosetta), and Linux arm64 has no release
build. Without Rhubarb, `pnpm demo` and `pnpm try` still render, with estimated mouths.
`pnpm diagnose` lists what is there and what is missing.

Optional:

- Kokoro (`kokoro-js`, installed by `pnpm install`): local voices for `pnpm voice:tts` and `pnpm try`
- macOS `say`: dev voices for `pnpm voice:say` (real voices come from the tamtree harness)
- whisper.cpp (`whisper-cli` + `WHISPER_MODEL`): only for lip-syncing to existing audio

## 2. Preview in the Studio

```sh
pnpm dev
```

This opens Remotion Studio. Every skit under `public/skits/<id>/` is listed as a `Skit`
composition, next to the labs (`CharacterLab`, `TalkLab`, `SetLab`, …).

To see a skit end to end:

```sh
pnpm voice:say fine     # dev voices for public/skits/fine
pnpm direct fine        # validate → prep → compile → self-check → contact sheet → out/fine.mp4
```

Your own skit: `pnpm new myskit --template=exchange`, write the lines in the staged
`premise.json`, run the same command again, then `voice:say` and `direct` as above. The
authoring guide is [skits.md](skits.md).

## 3. Run the render service

In the background (what tamtree talks to):

```sh
scripts/start.sh        # 127.0.0.1:8787; prints the URL and the bearer token
scripts/stop.sh
```

`start.sh` generates `STICKSTAGE_API_TOKEN` into `.env.local` (gitignored) the first time and
reuses it afterwards. Paste the printed token into the tamtree client's credential. Logs go to
`out/serve.log`. Set `PORT=9000 scripts/start.sh` to use another port.

In the foreground, for development:

```sh
STICKSTAGE_API_TOKEN=dev-token pnpm serve
pnpm serve --insecure-local            # no auth; localhost only
```

Check it:

```sh
curl http://127.0.0.1:8787/healthz     # wait for "bundle": "ready"
pnpm serve:smoke                       # validate + render public/skits/fine over HTTP → out/smoke/
```

The first start bundles the Remotion project and may download Chrome Headless Shell, so give it a
minute. If Rhubarb isn't installed, the service refuses to start; set
`STICKSTAGE_ALLOW_ESTIMATED_MOUTHS=1` to render with estimated mouths instead.

Other settings (port, host, job TTL, browser, concurrency) are listed at the top of
[`scripts/serve.ts`](../scripts/serve.ts). The API is in [render-service.md](render-service.md).

## 4. Docker

```sh
docker build --platform linux/amd64 -t stickstage-render .
docker run -p 8787:8787 -e STICKSTAGE_API_TOKEN=… stickstage-render
```

The image includes Chrome Headless Shell and Rhubarb.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Set STICKSTAGE_API_TOKEN, or pass --insecure-local` | Use `scripts/start.sh`, or export the token |
| `Rhubarb not found` | `pnpm bootstrap`, or set `RHUBARB_PATH` (see step 1) |
| `Rhubarb … does not run` on an Apple Silicon Mac | `softwareupdate --install-rosetta --agree-to-license` (the macOS build is Intel-only) |
| `Kokoro is not installed` | `pnpm install` (it is an optional dependency), or set `LOCAL_TTS_BASE_URL` |
| `Port 8787 is already in use` | `scripts/stop.sh`, or `PORT=… scripts/start.sh` |
| `No answer on :8787 after 90s` | Read `out/serve.log` |
| `voice-missing` / `voice-stale` on render | Re-voice the skit (`pnpm voice:say <id>`); a line's text changed |
