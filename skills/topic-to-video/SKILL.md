---
name: topic-to-video
description: Turn a topic into a finished ~30 second StickStage comedy video, end to end. Input is just a topic ("group chats", "returning a gift", "Monday meetings"); output is a postable MP4 in out/posts/<id>/ plus the script. Asks StickStage for the writer prompt, writes only the words, stages them with the skit-director skill, renders, self-checks and packages. Use when asked to make, generate or create a video/skit/short about a topic.
---

# Topic → 30 s video

The person gives you a **topic**. You deliver a **~30 s two-person skit** as a postable MP4, without
asking questions along the way. You own every step: premise, script, staging, render and packaging.

StickStage writes the prompt and turns the reply into a premise. You write only the words the
prompt asks for. `skit-director` still never writes or changes a line. Everything after the
premise follows `skills/skit-director/SKILL.md`. **Read that file before staging.**

Run everything from the repo root (the folder with `package.json`).

## 0. Before you start

- Pick a skit id: a lowercase slug of the topic, e.g. `group-chat`. If
  `public/skits/<id>/` already exists, add `-2`, `-3`, and so on. Never overwrite another skit.

## 1. Ask StickStage for the words, then write only those

Write `public/skits/<id>/brief.json`. A brief is the topic and the cast, plus anything you have
already decided. Leave `template`, `set` and `scenes` out when you want the reply to choose them.

```json
{
  "topic": "group chats",
  "cast": [ { "id": "milo", "character": "milo" }, { "id": "june", "character": "june" } ]
}
```

```
pnpm write prompt --brief=public/skits/<id>/brief.json
```

Read `system` and `prompt`. Write one JSON object that answers that prompt and nothing else:
no schema version, no roles, no cameras, no timing. Save it as `public/skits/<id>/reply.json`.

```
pnpm write draft --brief=public/skits/<id>/brief.json --reply=public/skits/<id>/reply.json
```

Stdout is the premise. Write it to `public/skits/<id>/premise.json`. Warnings on stderr
(`mood`, `line-count`, `set-fallback`, …) are corrections StickStage already applied; keep going.

Exit 2 means the reply cannot be used. Stderr is one repair prompt. Answer that prompt once,
overwrite `reply.json`, and run `draft` again. Do not invent a third try.

## 2. Stage it

```
pnpm new <id>              # premise.json → draft skit.json
```

Then refine `public/skits/<id>/skit.json` exactly as `skills/skit-director/SKILL.md` describes:
comedic pauses before the turn and the punchline, one silent reaction beat at the key realization,
one gesture per line anchored on its word, 1–3 SFX, and leaving `shot` out unless it's needed. From
this step on, the line text is fixed. Staging never rewrites it.

## 3. Render and check (loop, at most 4 rounds)

```
pnpm direct <id> --say --json
```

Read `public/skits/<id>/generated/direct.json`:

- Fix every validation or compile diagnostic at the `path` it names.
- Fix every `check` finding at the `error` level, and deal with the warnings (see skit-director).
- **Length:** `compile.durationSec` must land between **26 and 33 s**.
  - Too short: first add pauses or a silent beat where the joke needs air. If it's still more than
    3 s short, go back to step 1 and add an escalation line (edit `premise.json`, then run
    `pnpm new <id> --force` and redo the staging).
  - Too long: cut the weakest escalation line in `premise.json` the same way. Never trim the hook or
    the punchline.
- Look at the contact sheet `out/<id>-sheet.png` (read it as an image) and use the skit-director
  checklist: faces readable, text not covering faces, the punchline has its camera event, the
  reaction face reads.

## 4. Package

```
pnpm batch <id>
```

This writes `out/posts/<id>/<id>-<slug>-<hash>.{mp4,srt,txt,json}`. The `.txt` file holds the post
description, hashtags, the AI-voice note and the script.

## 5. Hand back

Keep the reply short:

- The MP4 path (in `out/posts/<id>/`) and its duration.
- **The script**, one line per row with the speaker, so the person can judge the joke without
  watching.
- The angle in one sentence, and one or two staging choices worth knowing about.
- **Voices:** this render uses the macOS `say` dev voices. For a version to post, the tamtree
  harness generates real TTS (`voice.json`, see `docs/voice-contract.md`) and runs
  `pnpm render <id>`. Then run `pnpm batch <id>` again.
- Don't claim it's funny. A person judges that by watching it.

If the person asks for changes ("punchier ending", "make June lose it"), ask for a lines-only
prompt and apply the reply. Staging you already did stays, except on lines whose words changed.

```
pnpm write revise --skit=public/skits/<id>/skit.json --note="punchier ending"
pnpm write apply --skit=public/skits/<id>/skit.json --reply=public/skits/<id>/reply.json
```

Write stdout over `skit.json`. Exit 2 is one repair pass, the same as draft. Then repeat steps 3–5.

## Failure modes

- `pnpm direct` says a voice is missing or stale: you forgot `--say`.
- Rhubarb or ffmpeg errors: report the exact error. Don't work around it by skipping the mouths.
- You can't get within 26–33 s after 4 rounds: deliver the closest version and say how long it is.
