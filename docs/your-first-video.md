# Your first video

Follow this page from top to bottom. When you finish, you will have watched the sample short and made one of your own.

You need a Mac with Stick Stage already installed: Node 22, the project dependencies, and Rhubarb for the mouths. If `pnpm` is not a command, or a step below says Rhubarb is missing, stop and do [Set up the machine](set-up.md) first. Come back here when `pnpm direct fine --say` can run.

All commands are typed in the Stick Stage folder, the one that contains `package.json`.

## 1. Open the folder

```sh
cd /path/to/stickstage
node -v
```

`node -v` must print v22 or newer. If the prompt is somewhere else, `cd` until `ls package.json` shows the file.

## 2. Watch one that already exists

The sample is called `fine`. It is Milo and June in an office. June says she is fine.

```sh
pnpm direct fine --say
```

The first render can take a minute while the mouths are drawn from the audio. This sample already includes draft voices, so you will not hear the Mac record them again unless a line's words no longer match `voice.json`.

You are done with this step when the last lines look like this (the seconds will vary):

```text
sheet: out/fine-sheet.png
mp4: out/fine.mp4
```

Open the video:

```sh
open out/fine.mp4
```

Watch it once at full frame, then once with the window narrowed to a phone width. You are checking that you can hear the lines, read the words, and see both faces. The voices are the Mac. They are for this preview. A video you post gets real voices later, from the harness, and is rendered again.

Also open `out/fine-sheet.png`. It is a strip of frames from the whole short. Faces should be readable. Words should not sit on top of a face.

If the command stops early, use the table at the bottom of this page.

## 3. Start your own short

The id is the folder name. Use lowercase letters, digits, and hyphens. This walk uses `running-late`. If that folder already exists, pick another id and use it everywhere below.

```sh
pnpm new running-late --template=exchange
```

You should see:

```text
wrote public/skits/running-late/premise.json (exchange). Write the lines (humans write the jokes), then run: pnpm new running-late
```

`exchange` means two people trade lines and the last line is the joke. The other shapes are in [People, rooms, and shapes](cast-rooms-and-shapes.md).

## 4. Replace the placeholder lines

Open `public/skits/running-late/premise.json`. Delete what is there and paste this. It is a complete, valid premise.

```json
{
  "schemaVersion": 1,
  "template": "exchange",
  "title": "Running late",
  "logline": "June is late. Her reason makes it worse.",
  "pov": "POV: your coworker is five minutes late",
  "description": "A short argument about being on time.",
  "hashtags": ["stickfigure", "relatable"],
  "set": "office-1",
  "cast": [
    { "id": "milo", "character": "milo" },
    { "id": "june", "character": "june" }
  ],
  "lines": [
    { "who": "milo", "text": "You said nine.", "role": "setup" },
    { "who": "june", "text": "I said around nine.", "role": "setup" },
    { "who": "milo", "text": "It is nine twenty.", "role": "escalation" },
    { "who": "june", "text": "Then I am early for nine thirty.", "role": "punchline", "slam": "EARLY" }
  ]
}
```

What each part is doing:

- `title` is the name of the video.
- `logline` is a note for you. It is not shown on screen.
- `pov` is the card at the top. It states the situation. It does not tell the joke.
- `description` is the line that goes in the post. It does not spoil the last line.
- `set` is the room. `office-1` is a desk. Milo will be seated on the left because that room has a chair there.
- `who` must match an `id` in `cast`.
- `role` marks the shape of the joke. The last line is `punchline`.
- `slam` is optional. `EARLY` flashes on screen as June says it. Use one or two words, taken from the line.

Save the file.

## 5. Turn the premise into a staged script

```sh
pnpm new running-late
```

You should see a line like:

```text
wrote public/skits/running-late/skit.json (4 beats). Next: pnpm direct running-late [--say]
```

That command reads `premise.json` and writes `skit.json`. The lines stay exactly as you typed them. Stick Stage adds the room blocking, a pause before the punchline, and a hold after it. You do not edit `skit.json` on this first pass.

If you are told `skit.json` already exists, you have run this step before. Running it again with `--force` rebuilds `skit.json` from the premise and throws away any later edits in that file. Do that only when you mean to.

## 6. Render the preview

```sh
pnpm direct running-late --say
```

You should see, near the top of the output, a line like:

```text
"Running late": 8.40s (252 frames)
```

The number will not match this one. Under it, each beat is listed with a start and end time, and the last spoken beat is marked `PUNCHLINE`. Further down, each camera cut is listed with a reason in parentheses. You do not have to act on any of that yet. It is the record of what the director chose.

Then:

```text
sheet: out/running-late-sheet.png
mp4: out/running-late.mp4
```

Open both.

```sh
open out/running-late.mp4
open out/running-late-sheet.png
```

A four-line joke will be shorter than the 15 to 30 second range Stick Stage prefers for a finished short. The check mentions that as information. The MP4 is still written. When you want a length you would post, add one or two more lines in `premise.json` before the punchline, run `pnpm new running-late --force`, then `pnpm direct running-late --say` again.

## 7. Package the files

```sh
pnpm batch running-late
```

You should see a final block like:

```text
batch:
  rendered  running-late  → out/posts/running-late/running-late-running-late-<eight letters>.mp4
```

The folder `out/posts/running-late/` holds the MP4, a `.srt`, a `.txt`, and a `.json`, all with the same name. What each file is for is in [The files you hand over](files-you-hand-over.md).

Run `pnpm batch running-late` again without changing anything and the line will say `unchanged`. Stick Stage skips a video it has already rendered.

## 8. Decide what happens next

Watch `out/running-late.mp4` and answer three questions.

1. Does the first second tell you the situation?
2. Does the last line land, and can you read the face after it?
3. Would you post this joke if the voices were better?

If the joke is wrong, change the lines. That is [Watch it and change it](watch-and-change.md). If the joke is right and you want it posted, the voices still have to be replaced. Draft voices are the Mac. Tell whoever runs the harness which skit id to voice, then they render again. You do not paste a voice key into this folder.

## If a command complains

| What you see | What to do |
|---|---|
| `command not found: pnpm` | The machine is not set up. Follow [Set up the machine](set-up.md). |
| `node -v` is below 22 | Install Node 22, then `pnpm install` in this folder. |
| `Rhubarb not found` | Install Rhubarb as the setup page describes. The mouths cannot be drawn without it, unless someone running the service has deliberately allowed estimated mouths. |
| `voice missing or stale` | You left off `--say`. Run `pnpm direct running-late --say`. |
| `unknown template` | The name after `--template=` is not one of the nine shapes. The error lists them. |
| `premise.json` mentions an unknown set or character | Use an id from [People, rooms, and shapes](cast-rooms-and-shapes.md). The error names the field and shows an example. |
| `skit.json exists; pass --force` | You are about to rebuild the staged script. Add `--force` only if you want the premise to win over edits in `skit.json`. |
| `self-check failed` | Read the lines above that sentence. Each one names a path, what was expected, and an example. Fix that path. On this first video the check should pass. If it does not, the premise was edited into something the template cannot stage. |
| The video has no sound | `--say` did not run, or the Mac speech voice failed. Run `pnpm direct running-late --say` again and read the first error. |

Next: [Writing the joke](writing-the-joke.md), when you want a joke that is yours rather than the sample.
