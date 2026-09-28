# Writing the joke

For the person who decides what the short is about. Two ways through. Use the first when you already have the lines. Use the second when you have a topic and want a writer, a person or a model, to draft the lines inside Stick Stage's rules.

Both ways end with a `premise.json` and then a `skit.json`. Rendering is the same command you used in [Your first video](your-first-video.md).

Run every command from the Stick Stage folder.

## Way A. You write the lines

### Start from a shape

```sh
pnpm new my-skit --template=exchange
```

Change `my-skit` to a new lowercase id. Change `exchange` if another shape fits. The full list, and who each shape is for, is in [People, rooms, and shapes](cast-rooms-and-shapes.md).

That command copies a blank premise to `public/skits/my-skit/premise.json`. Replace the placeholder sentences with the real lines. Keep the JSON shape. A line that still says "Punchline." will be spoken out loud.

### What every premise contains

| Field | What you put there |
|---|---|
| `schemaVersion` | Always `1`. |
| `template` | The shape you started from. Leave it. |
| `title` | A short name. It becomes the filename of the packaged video. |
| `logline` | One sentence for the team: who wants what, and what goes wrong. Not shown on screen. |
| `pov` | Optional. The top card. Start it with `POV:`. At most 80 characters. The situation, not the joke. |
| `description` | One line for the post. Do not spoil the punchline. At most 2000 characters. |
| `hashtags` | Two to four words, without the `#`. |
| `set` | A room id. If you leave it out, the shape's usual room is used. |
| `cast` | Who is on screen. Each entry has an `id` (the name you use in `who`) and a `character` (one of the six drawn people). |
| `lines` | The spoken lines, in order, for a single room. |

A line looks like this:

```json
{ "who": "june", "text": "Then I am early for nine thirty.", "role": "punchline", "slam": "EARLY" }
```

- `text` is spoken exactly, and the captions show it exactly. Write the line you want heard.
- `role` is `setup`, `escalation`, or `punchline`. If you leave roles out, the first line is the setup and the last line is the punchline.
- `expression` is optional: `neutral`, `happy`, `smug`, `sarcastic`, `annoyed`, `angry`, `shocked`, `sad`, `crying`, `cringe`, `confused`, `deadpan`.
- `slam` is optional, mostly on the punchline. One or two words from that line. At most 40 characters.
- `delivery` is optional, a hint for the real voice later, such as `flat` or `whispered`. The Mac preview ignores the subtlety. The harness can use it.
- `gag` is optional. One named bit of physical comedy on that line. Names are in the shapes page.
- `prop` is optional. One catalog id, such as `fries` or `water-bottle`. Staging puts it in a hand. `"none"` puts the previous one away. The list is on the skit-file page.
- `voiceOver` set to `true` means the person is thinking. You hear them. The mouth stays shut. The caption is italic.

`who` must be an `id` from `cast`, or `narrator` in an explainer.

### More than one room

Use `scenes` instead of `lines` when the joke changes place. One to four scenes. Do not include both `lines` and `scenes`.

```json
"scenes": [
  {
    "set": "living-1",
    "pov": "POV: the mug is not for sale",
    "lines": [
      { "who": "milo", "text": "I would not sell this mug.", "role": "setup" },
      { "who": "june", "text": "You bought it for a dollar.", "role": "setup" }
    ]
  },
  {
    "set": "plain-1",
    "card": "THE MUG",
    "lines": [
      { "who": "narrator", "text": "Owning it makes the mug feel rarer." }
    ]
  },
  {
    "set": "living-1",
    "lines": [
      { "who": "milo", "text": "Then why is it in the sink.", "role": "escalation" },
      { "who": "june", "text": "Because it is mine now.", "role": "punchline", "slam": "MINE" }
    ]
  }
]
```

`card` is a title over that scene, at most 60 characters. The room dims behind it.

For an explainer, the people say the hook and the twist. The narrator says the concept, once. If the narrator talks for more than about 60 percent of the spoken time, the check warns you. The short will feel like a slideshow.

### Stage it, then watch it

```sh
pnpm new my-skit
pnpm direct my-skit --say
open out/my-skit.mp4
```

The first command writes `skit.json`. The second makes the preview. If you change a line in `premise.json` after that, stage again:

```sh
pnpm new my-skit --force
pnpm direct my-skit --say
```

`--force` rebuilds `skit.json` from the premise. Edits that lived only in `skit.json` are discarded. Change lines in the premise, not in the staged file, unless you are doing the staging work described in the skit-file page.

### How long, and how the joke is built

Aim for a stranger to understand the situation from the first line. No greeting. The middle lines make it worse. The last line is the turn.

A finished two-person short should sit around 15 to 30 seconds once the voices are real. The topic-to-video path used by the team aims tighter, about 26 to 33 seconds. A four-line test will be shorter. Add a line in the middle when the idea needs another step, and cut the weakest middle line when it drags. Leave the first line and the punchline in place while you do that.

Lines in the writer path below are capped at about 12 words. You can write longer lines yourself. Long lines wrap the captions and are harder to play. If a caption wraps past two lines, the check will say so.

Write lines that are safe to post. No real people, no brands, no song lyrics, no quoted memes. Nothing cruel, sexual, or political, and nothing aimed at a protected group. The same rule is given to the model when you use Way B.

## Way B. You write a topic, and a writer fills the lines

Use this when you know the subject and the cast, and you want the lines drafted for you. Stick Stage does not call the model. It writes the instructions. You, or the harness, send those instructions to a model and bring the reply back.

### 1. Write the brief

Create the folder and the file `public/skits/my-skit/brief.json`:

```sh
mkdir -p public/skits/my-skit
```

```json
{
  "topic": "someone who is always five minutes late",
  "description": "Office. June is late. Milo counted. Keep it dry. Do not spoil the last line in the description.",
  "tone": "deadpan",
  "cast": [
    { "id": "milo", "character": "milo" },
    { "id": "june", "character": "june" }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `topic` | Yes | The subject, in plain words. |
| `description` | No | Extra direction for the writer. Up to 2000 characters. |
| `tone` | No | A note about the writing, such as `deadpan` or `warm`. This is not the camera style. Camera style is set later, on the skit. |
| `cast` | Yes | One to three people. `id` is the speaker name in the lines. `character` is who is drawn. |
| `template` | No | Lock the shape. If you leave it out, the writer picks one that fits the cast. |
| `set` | No | Lock the room for a one-room joke. |
| `scenes` | No | A number from 2 to 4. Leave it out for one room. |
| `sets` | No | One room id per scene. Only when `scenes` is set. Each scene gets its own room. |
| `allowed_sets` | No | Rooms the writer may choose from. Anything else is rejected. |
| `props` | No | Up to twelve catalog ids the writer should put on screen, such as `["fries", "water-bottle"]`. |

`set` and `scenes` together are rejected. Pick one room, or a count of scenes.

A `label` on a cast member is the name shown for them. The `me-vs-me` shape needs a label on each, because both are the same person: `{ "id": "me", "character": "milo", "label": "me" }`.

### 2. Get the instructions

```sh
pnpm write prompt --brief=public/skits/my-skit/brief.json
```

The command prints JSON with two text fields, `system` and `prompt`. Send both to the model. Ask it to reply with one JSON object and nothing else.

If this command fails, the brief itself is wrong. The message names the field. A bad brief is your fix, not the model's.

### 3. Save the reply and turn it into a premise

Save the model's JSON as `public/skits/my-skit/reply.json`. It should look like this. Yours will have different words.

```json
{
  "title": "Around nine",
  "template": "exchange",
  "description": "Milo counted. June has a theory of time.",
  "hashtags": ["stickfigure", "relatable"],
  "scenes": [
    {
      "set": "office-1",
      "pov": "POV: your coworker is five minutes late",
      "lines": [
        { "who": "milo", "text": "You said nine.", "expression": "neutral" },
        { "who": "june", "text": "I said around nine.", "expression": "deadpan" },
        { "who": "milo", "text": "It is nine twenty.", "expression": "annoyed" },
        { "who": "june", "text": "Then I am early for nine thirty.", "expression": "smug", "slam": "EARLY" }
      ]
    }
  ]
}
```

The writer is told to return 11 to 13 lines for a full short. A short sample like the one above is only to show the shape. A real reply should be long enough to play for about half a minute.

Then:

```sh
pnpm write draft --brief=public/skits/my-skit/brief.json --reply=public/skits/my-skit/reply.json > public/skits/my-skit/premise.json
```

Check the exit. If the command prints a premise and exits 0, `premise.json` is ready. Warnings on the terminal, such as a mood it corrected or a room it substituted, are already applied. Keep going.

If it exits with code 2, the reply cannot be used. The terminal prints one repair message. Send that message to the model, replace `reply.json` with the new reply, and run `draft` again. Do that once. If the second reply also fails, the brief or the model is the problem. Do not loop.

A reply that exits 2 can leave `premise.json` empty or half-written, because the shell created the file before the command finished. If that happens, delete `premise.json` and run `draft` again after the reply is fixed. Safer version, if you want to be careful:

```sh
pnpm write draft --brief=public/skits/my-skit/brief.json --reply=public/skits/my-skit/reply.json > /tmp/premise.json
echo $?
```

`echo $?` prints `0` on success. Only then:

```sh
mv /tmp/premise.json public/skits/my-skit/premise.json
```

### 4. Stage and preview

```sh
pnpm new my-skit
pnpm direct my-skit --say
open out/my-skit.mp4
```

From here, the lines are fixed. Staging does not rewrite them. If a line is wrong, change it with the steps in [Watch it and change it](watch-and-change.md). Do not reword it inside `skit.json` and hope the voice still matches. The voice file must contain the same text as the line.

## What the writer is allowed to return

The reply may contain a title, a description, hashtags, a template (only if you did not lock one), a POV card, a room (only for scenes you did not lock), and the lines. Each line has `who`, `text`, and optionally `expression`, `slam`, `gag`, and `delivery`.

The reply must not contain a schema version, a cast list, camera instructions, poses, or timings. If it does, validation fails and you get the repair prompt.

`slam` belongs on the last line only. `gag` is at most one per line, from the named list.

## Asking for a change, in one sentence

When a cut exists and you want different words:

```sh
pnpm write revise --skit=public/skits/my-skit/skit.json --note="shorter last line, same joke"
```

Send `system` and `prompt` to the model. Save the reply over `reply.json`. Apply it only after a clean exit:

```sh
pnpm write apply --skit=public/skits/my-skit/skit.json --reply=public/skits/my-skit/reply.json > /tmp/skit.json && mv /tmp/skit.json public/skits/my-skit/skit.json
```

Then `pnpm direct my-skit --say` again. Lines you did not ask to change keep their staging. A line whose words changed needs a new voice, which `--say` records.

The note should say what to change. "Make it funnier" gives the model nothing to hold. "June gets the last line, and it is about the calendar, not the clock" is a note it can follow.

Next: [People, rooms, and shapes](cast-rooms-and-shapes.md) when you need a different cast or room. [Watch it and change it](watch-and-change.md) when you have a video to judge.
