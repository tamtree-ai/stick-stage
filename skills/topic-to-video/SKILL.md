---
name: topic-to-video
description: Turn a topic into a finished ~30 second StickStage comedy video, end to end. Input is just a topic ("group chats", "returning a gift", "Monday meetings"); output is a postable MP4 in out/posts/<id>/ plus the script. Writes the premise and jokes, stages them with the skit-director skill, renders, self-checks and packages. Use when asked to make, generate or create a video/skit/short about a topic.
---

# Topic → 30 s video

The person gives you a **topic**. You deliver a **~30 s two-person skit** as a postable MP4, without
asking questions along the way. You own every step: premise, script, staging, render and packaging.

This skill writes the jokes, which is the one thing `skit-director` refuses to do. The team chose
that on purpose (see `DECISIONS.md`, "topic-to-video"). Everything after the script follows
`skills/skit-director/SKILL.md`. **Read that file before staging.**

Run everything from the repo root (the folder with `package.json`).

## 0. Before you start

- Read `src/data/characters/milo.md` and `src/data/characters/june.md` (the cast bible). Every
  line must sound like the person saying it.
- Pick a skit id: a lowercase slug of the topic, e.g. `group-chat`. If
  `public/skits/<id>/` already exists, add `-2`, `-3`, and so on. Never overwrite another skit.

## 1. Write the premise (the part that makes it funny)

Work it out in your head first. The person sees only the result.

1. **Find the angle.** List 5 relatable, specific truths about the topic (things people do but don't
   say). Pick the one with the sharpest gap between what someone *says* and what they *mean or do*.
   Specific beats generic: "replying 'haha' with a straight face" beats "texting is weird".
2. **Cast it.** Milo is the sincere straight man who asks the reasonable question. June is deadpan,
   says the quiet part out loud, and gets the last word. Usually Milo sets up and June lands it. Flip
   that only if the angle needs it.
3. **Shape: setup → escalation → punchline → (reaction).**
   - Line 1 is the **hook**: the situation, clear within the first second. No greetings or preamble.
   - **Escalate** with 2 or 3 turns that each push the same idea further (the rule of three works:
     normal, normal, absurd). Every line is either a setup or a laugh. Cut anything that is only
     connective tissue.
   - The **punchline** is the last spoken line. Put the funniest word **last**. Short beats long.
   - Draft **3 candidate punchlines**, pick the strongest, and throw the others away.
4. **Size it for 30 s.** Target **11–13 lines, about 70–85 spoken words**. Keep each line to 12
   words or fewer so the subtitles stay readable. Measured with dev voices: 10 lines and 62 words
   came to 22 s as a draft and 25 s once staged; 12 lines and 73 words, staged with one silent beat,
   came to 29.3 s. Real TTS may run a little faster or slower, so recheck the length after the first
   harness-voiced render.
5. **Keep it safe to post.** Use original material only: no real people, brands, song lyrics or
   memes quoted word for word. Nothing cruel, sexual, political or about a protected group. Milo is
   never mean (see the cast bible's "Never" lists).

Write `public/skits/<id>/premise.json` directly. The format is in `src/engine/templates/premise.ts`,
with an example in `public/skits/exchange-lab/premise.json`:

```json
{
  "schemaVersion": 1,
  "template": "exchange",
  "title": "Short title",
  "logline": "Who wants what, and what goes wrong.",
  "pov": "POV: the situation in a few words",
  "description": "One line for the post; don't spoil the punchline.",
  "hashtags": ["stickfigure", "relatable", "<topic>"],
  "set": "living-1",
  "cast": [ { "id": "milo", "character": "milo" }, { "id": "june", "character": "june" } ],
  "lines": [
    { "who": "milo", "text": "…", "role": "setup", "expression": "neutral" },
    { "who": "june", "text": "…", "role": "escalation", "expression": "deadpan", "delivery": "flat" },
    { "who": "june", "text": "…", "role": "punchline", "expression": "smug", "slam": "ONE WORD" }
  ]
}
```

- **Template:** `exchange` is the default. `interview` is Milo with a mic on the street,
  `me-vs-me` is one character arguing with themselves, `pov-monologue` is one character talking to
  the camera, and `text-slam` is meme text only. Use a different template only when the topic
  clearly calls for it.
- **Set:** pick the one that matches the topic: `living-1` (home), `office-1` (work; Milo starts
  seated), `lounge-1`, `park-1`, `street-1`, `plain-1` (abstract).
- **Expressions:** `neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe,
  confused, deadpan`. Use strong ones (`shocked`, `cringe`, `crying`) on one or two peak lines only.
- **Slam:** one or two words from the punchline, in capitals.

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

If the person asks for changes ("punchier ending", "make June lose it"), edit `premise.json`, run
`pnpm new <id> --force`, restage, and repeat steps 3–5.

## Failure modes

- `pnpm direct` says a voice is missing or stale: you forgot `--say`.
- Rhubarb or ffmpeg errors: report the exact error. Don't work around it by skipping the mouths.
- You can't get within 26–33 s after 4 rounds: deliver the closest version and say how long it is.
