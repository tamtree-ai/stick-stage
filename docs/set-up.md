# Set up the machine

For the person who installs Stick Stage and keeps it running. A colleague who only writes jokes does not need this page. They need [Your first video](your-first-video.md) once you can finish the check at the end of this one.

You are done when `pnpm direct fine --say` prints `mp4: out/fine.mp4` and that file plays.

## What you are installing

Stick Stage is a Node project. The preview is Remotion Studio. The thing other programs call is an HTTP service on port 8787. Rendering uses Chrome Headless Shell, which Remotion downloads on first use, and Rhubarb, which turns each line's audio into mouth shapes.

Stick Stage does not call a text-to-speech API. Draft voices on a Mac use the built-in `say` command. Voices you would post are written into the skit folder by the tamtree harness.

Remotion is free for individuals and for companies of up to three people. A larger company needs a Remotion company license. Part-time people and contractors count toward that three.

## 1. Install the tools

You need Node 22 or newer, pnpm, and Rhubarb Lip Sync.

```sh
node -v
```

If that is missing or below 22, install Node 22 and open a new terminal. Then, in the Stick Stage folder (the one with `package.json`):

```sh
pnpm install
```

You should see a normal install finish, with a `node_modules` folder afterwards.

Rhubarb: download a release from [https://github.com/DanielSWolf/rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync) and unzip it into `tools/`. That folder is gitignored. The binary should end up at a path like:

```text
tools/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb
```

Any version folder matching `tools/Rhubarb-Lip-Sync-*/rhubarb` is found. You can instead set `RHUBARB_PATH` to the binary, or put `rhubarb` on your `PATH`.

The first time you run the Mac build, Gatekeeper may block it:

```sh
xattr -dr com.apple.quarantine tools/Rhubarb-Lip-Sync-*
```

Optional, and only for one job:

- whisper.cpp (`whisper-cli`, plus `WHISPER_MODEL` pointing at a model). Use it only when you already have audio and you want word timings from a transcript. Mouths still come from Rhubarb. You do not need this for the normal path.

## 2. Prove the sample renders

```sh
pnpm direct fine --say
```

First run: Rhubarb reads the sample's audio, Remotion may download Chrome, then a video is written. Give it a few minutes. The sample already has draft voices, so this command uses those files.

Success looks like this at the end:

```text
sheet: out/fine-sheet.png
mp4: out/fine.mp4
```

```sh
open out/fine.mp4
```

You should hear speech and see two stick figures in an office, with captions. If you get that, the install works. The rest of this page is the service and the other ways to run it.

## 3. Open the studio, when you want to scrub a shot

```sh
pnpm dev
```

Remotion Studio opens in a browser. Every folder under `public/skits/<id>/` that has a `skit.json` appears as a composition named `Skit`, next to the labs (`CharacterLab`, `TalkLab`, `SetLab`, and the others). The studio is for looking. Rendering a file you can send someone is still `pnpm direct` or `pnpm render`.

Stop the studio with Ctrl-C in that terminal.

## 4. Start the render service

This is what the tamtree plugin calls. In the background:

```sh
scripts/start.sh
```

The first time, the script writes `STICKSTAGE_API_TOKEN` into `.env.local` (gitignored) and prints it. Copy that token into the client's credential. Later starts reuse the same token.

Success:

```text
StickStage on http://127.0.0.1:8787  (log: out/serve.log)
Token: <the token>
```

The first start bundles the project and may download Chrome. `start.sh` waits up to 90 seconds. If the bundle is still building, `curl` the health check until `bundle` is `ready`:

```sh
curl http://127.0.0.1:8787/healthz
```

A ready process looks like this. `lipSync` should be `rhubarb`. `auth` should be on.

```json
{ "ok": true, "bundle": "ready", "lipSync": "rhubarb", "auth": true }
```

Stop it with:

```sh
scripts/stop.sh
```

Another port:

```sh
PORT=9000 scripts/start.sh
```

Logs are `out/serve.log`. The process id is `out/serve.pid`.

In the foreground, for when you want the log in the terminal:

```sh
STICKSTAGE_API_TOKEN=dev-token pnpm serve
```

Local only, with no token, and only on localhost:

```sh
pnpm serve --insecure-local
```

Do not use `--insecure-local` on a machine other people can reach.

A full check that the HTTP path can validate and render the sample. The service has to be up already. `serve:smoke` does not read `.env.local`, so export the token `start.sh` printed:

```sh
export STICKSTAGE_API_TOKEN=<the token>
pnpm serve:smoke
```

That writes `out/smoke/fine/`. The sample skit `fine` must already have `voice.json` and its audio, which it does in this repo.

## 5. Settings

| Variable | Default | What it does |
|---|---|---|
| `STICKSTAGE_API_TOKEN` | Required, unless `--insecure-local` | Bearer token for every route except `/healthz`. |
| `PORT` | `8787` | |
| `HOST` | `127.0.0.1` on your machine, `0.0.0.0` in the container | |
| `STICKSTAGE_JOB_TTL_HOURS` | `24` | Finished jobs are deleted after this. |
| `STICKSTAGE_BROWSER` | Remotion's Chrome Headless Shell | |
| `STICKSTAGE_RENDER_CONCURRENCY` | Remotion's default | Browser tabs used by one render. |
| `STICKSTAGE_ALLOW_ESTIMATED_MOUTHS` | Off | Set to `1` only if you must boot without Rhubarb. Mouths will be guessed. Do not ship that picture if you can avoid it. |
| `RHUBARB_PATH` | `tools/`, then `PATH`. In the container, `/opt/rhubarb/rhubarb` | |

One render runs at a time. Further jobs wait. A render already uses the cores. To do more at once, run more instances, each with its own disk. Do not turn up threads inside one process and expect a faster queue.

Job state is on disk at `public/skits/_jobs/<id>/`, including `job.json`. That directory is the volume you keep if you containerise. On restart, queued and interrupted jobs are queued again.

The service speaks plain HTTP. Put TLS in front of it (a load balancer, Caddy, Fly, Cloud Run). On Cloud Run the queue lives in memory and the render continues after the request returns, so run with CPU always allocated, `--max-instances=1`, and `--min-instances=1`.

The Linux image is x86_64. Rhubarb has no Linux arm64 build.

## 6. Docker

From the Stick Stage folder:

```sh
docker build --platform linux/amd64 -t stickstage-render .
docker run -p 8787:8787 -e STICKSTAGE_API_TOKEN=choose-a-long-token stickstage-render
```

The image contains Chrome Headless Shell and Rhubarb. Then:

```sh
curl http://127.0.0.1:8787/healthz
```

Wait until `bundle` is `ready`. A 30 second skit under amd64 emulation on a Mac can take around a minute and a half. A real x86_64 host is much faster. An 8 to 9 second skit on an M-series Mac, outside Docker, is on the order of 15 seconds.

## 7. The commands you will actually type

| Command | What it does |
|---|---|
| `pnpm dev` | Opens Remotion Studio. |
| `pnpm new <id> --template=<shape>` | Writes a blank `premise.json` when none exists. |
| `pnpm new <id>` | Stages `premise.json` into `skit.json`. `--force` overwrites an existing skit. |
| `pnpm write prompt --brief=<file>` | Prints the writer instructions for that brief. |
| `pnpm write draft --brief=<file> --reply=<file>` | Turns a writer's reply into a premise on stdout. Exit 2 means one repair. |
| `pnpm write revise --skit=<file> --note="…"` | Prints a lines-only change prompt. |
| `pnpm write apply --skit=<file> --reply=<file>` | Prints the restaged skit. Exit 2 means one repair. |
| `pnpm voice:say <id>` | Draft voices with macOS `say`. |
| `pnpm prep <id>` | Mouths and word timings. Cached. No network. |
| `pnpm compile <id>` | Checks the skit and prints the director's choices. |
| `pnpm check <id>` | The self-check only. |
| `pnpm direct <id> --say` | Validate, draft voices if needed, prep, compile, check, contact sheet, MP4. |
| `pnpm render <id>` | Prep, compile, `out/<id>.mp4`. `--debug` burns in labels. `--quality=draft` is 540 by 960. `--lang=es` renders a dub. |
| `pnpm batch <id>` | The posting bundle in `out/posts/<id>/`. |
| `pnpm serve` | The HTTP service in the foreground. |
| `pnpm test && pnpm typecheck && pnpm lint` | Run all three before a commit. |

`pnpm direct <id>` also takes `--no-mp4` (stop after the sheet), `--debug`, and `--json` (print the machine-readable report as well as writing `generated/direct.json`).

## If something fails

| What you see | What to do |
|---|---|
| `Set STICKSTAGE_API_TOKEN, or pass --insecure-local` | Use `scripts/start.sh`, or export the token in the same command as `pnpm serve`. |
| `Rhubarb not found` | Put the binary in `tools/` or set `RHUBARB_PATH`. The service refuses to start until you do, unless `STICKSTAGE_ALLOW_ESTIMATED_MOUTHS=1`. |
| `Port 8787 is already in use` | `scripts/stop.sh`, or start on another port. |
| `No answer on :8787 after 90s` | Read `out/serve.log`. The usual cause is the bundle still downloading Chrome, or Rhubarb missing. |
| `voice-missing` or `voice-stale` | A spoken line has no audio, or the audio was made for different words. Re-voice that line. For a draft, `pnpm direct <id> --say`. |
| Gatekeeper dialog on `rhubarb` | `xattr -dr com.apple.quarantine tools/Rhubarb-Lip-Sync-*` |
| `pnpm direct` prints diagnostics and exits before an MP4 | Each diagnostic has a path, what was expected, and an example. Fix that path in the JSON. The codes are stable (`unknown-pose`, `voice-stale`, and the rest). |
| Health check says `bundle: failed` | Read `out/serve.log` from the start of the process. Fix that error and start again. |
| Health check says `lipSync: estimated` | The process was allowed to boot without Rhubarb. Install Rhubarb and restart if this render is meant to be posted. |

Next: [One video, end to end](end-to-end.md).
