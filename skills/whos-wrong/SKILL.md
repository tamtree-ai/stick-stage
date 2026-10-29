---
name: whos-wrong
description: Make or fix a "Who's Wrong?" episode: a petty everyday argument where both sides have a point, played fast by Bram and Tess, with the verdict meter tipping as each point lands and a comment ask at the end. Covers the premise rules, the meter, the argument style, wording, staging, render and hand-back. Use when asked for a Who's Wrong episode, an AITA-style skit, a "who's right" debate short, or to restage split-evenly. The team writes the twist; never invent one and present it as final.
---

# Who's Wrong?

An episode is an 18–28 s argument about something small that everyone has an opinion on: the
bill, the armrest, the last fry, the group chat. Both sides have a real point. The verdict meter
(`overlay.verdict`) stamps WHO'S WRONG? on frame 0 and tips toward whoever sounds worse as the
fight goes. The last line flips sympathy, and the episode ends on "Comment: BRAM or TESS?".
The engagement is the comments: if the split isn't real, nobody argues and the short dies.

Read first: `src/data/series/whos-wrong.json` (the bible), `src/data/characters/bram.md` and
`tess.md`, `docs/skits.md` (verdict meter, `argument` style, cut-off lines, wording) and
`skills/skit-director/SKILL.md` (general staging). Reference episode: `public/skits/split-evenly/`.
Channel plan: `../planning/2026-10-29-new-viral-channel-idea/discussion.md`.

## Hard rules

1. **The team writes the twist** (the last line that flips sympathy). You may draft one to
   render a sample, but say in the hand-back that it is a placeholder.
2. **Both sides defensible.** Before staging, write one sentence for each side ("Bram: friends
   split evenly, it's simpler"; "Tess: she had a salad"). If you can't, the premise is wrong.
   The meter should finish between 40 and 60.
3. **Invented situations only.** Never retell a real Reddit post or a real person's story.
4. **Out of bounds:** real people, men-vs-women framing ("women always…"), medical or legal
   advice. Petty is the point; mean is not. Swap who started it from one episode to the next.

## Script shape

| Time | Beat | Meter |
|---|---|---|
| 0–0.3 s | The first line is already the fight ("Sixty-two dollars. Let's split it evenly.") | 50 → slight lean |
| to ~15 s | Point and counterpoint, each line shorter than the last; one cut-off ("—") | swings 30 ↔ 80 |
| ~15–20 s | The setup for the twist: an innocent question ("What was last Friday?") | holds |
| last line | The twist (team-written), `punchline: true`, a slam on the key word | back to 40–60 |
| +1.5 s | Reaction close-up + the comment ask (automatic) | — |

- 8–12 lines. Lines under 10 words; never over 14 (the check warns).
- Contractions, fragments, interruptions. Each has a habit: Bram restates his made-up rule,
  Tess quotes the receipt.
- No narrator, no "fun fact", no moral, no sign-off. The wording check lists phrases that read
  model-written; fix every `ai-wording` warning.
- `verdict` goes on the lines that score a point, not on every line.

## Skit

```jsonc
{
  "schemaVersion": 2,
  "meta": { "title": "…", "description": "<the question> Who's wrong?", "hashtags": ["whoswrong", "aita", "stickfigure"], "series": { "id": "whos-wrong", "season": 1, "episode": 2 } },
  "set": "cafe-1",                // homeSets in the series; pick by the situation
  "style": "argument",            // the series sets it too; say it anyway
  "coldOpen": "none",             // the stamp is the hook
  "cast": [
    { "id": "bram", "character": "bram", "mark": "left" },   // left = the meter's red side
    { "id": "tess", "character": "tess", "mark": "right" }
  ],
  "overlay": { "verdict": {}, "subtitles": true },
  "beats": [
    { "id": "l1", "speaker": "bram", "line": "…", "verdict": 45 }
  ]
}
```

Swap the marks (and so the meter's sides) when Tess starts it. The meter's left side is the
first cast member unless `sides` says otherwise.

## Steps

```bash
pnpm voice:tts <id>          # Kokoro, fast pace from the argument style (or the harness voices it)
pnpm check <id>              # self-check: dead air, speech rate, first word, line length, wording
pnpm render <id> out/<id>.mp4
```

Then watch it as video (not stills): the stamp must not cover a face, the meter should tip
visibly on each point, and the ask must be readable for at least 1.5 s.

## Hand-back

- The video path, the length, and the self-check result (paste any warnings).
- One sentence per side, and where the meter ends.
- Whether the twist is the team's or your placeholder.
