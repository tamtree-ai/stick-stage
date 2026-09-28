# Watch it and change it

For after the first MP4 exists. You are judging the joke and the picture. You are not rewriting the camera plan unless a specific cut is wrong.

## Watch it the way a stranger will

Open the MP4 and the contact sheet.

```sh
open out/my-skit.mp4
open out/my-skit-sheet.png
```

Narrow the video window until it is about the width of a phone, or send the file to a phone. Faces that read on a monitor can disappear on a phone.

Watch once with the sound on, and do not pause. Then answer these, in order.

1. **The first second.** Do you know the situation before you know the people? A hello, a name, or a preamble fails this. The top card can carry the situation if the first line is the hook.
2. **The middle.** Does each line make the problem worse, or is one of them only there to fill time? Cut the one that fills time.
3. **The last line.** Can you hear it, and can you see a face react after it? The reaction is supposed to be there without you asking.
4. **The words on screen.** Captions match the script. A slam should be a word that was just said, not a new joke fighting the line. Nothing important should cover a face. The sheet makes this obvious: look for type sitting on a head.
5. **The length.** A two-person short you would post sits around 15 to 30 seconds. The first line of the terminal output is the length, for example `"Running late": 22.40s`. Under that, the check may print a length note. A note is information. An error stops the MP4.

The Mac voices will sound flat. Judge the joke and the timing. Do not reject a line because Daniel or Samantha cannot act it. Real voices are a later render.

## What the check is telling you

`pnpm direct` prints findings before it writes the MP4. An error stops the file. A warning still writes the file, and you should read it. Information is a measurement, not a failure.

| Check | In plain words | What you usually do |
|---|---|---|
| `hook` | The first line starts after the one-second mark, or a cold open runs past two seconds. | Shorten the opening pause, or start with the line that states the situation. |
| `length` | The short is outside the range for its shape. | Add or cut a middle line. Leave the hook and the punchline. |
| `punchline-camera` | The last line did not get a close view or a push-in, or it got both. | Leave `shot` unset and let the director place one. If you pinned a shot, remove it. |
| `punchline-reaction` | Nothing reacts after the punchline. | Do not put your own silent beat tight against the last line unless that beat is the reaction. |
| `emotion-closeups` | A strong face (shocked, crying, cringe, and the other close-up faces) did not get a close view. | Give that beat a little air with `holdAfterMs`, or move the face earlier so the shot can hold. |
| `closeup-budget` | Too many face close-ups, too close together. | Let one face be the one you see. |
| `closeup-hold` | A close view is up for less than about a second. | Add a short hold after the line. |
| `punch-gap` | Two push-ins are too close. | Remove the one that is not the joke. |
| `one-thing` | Two events land within a few frames: two gestures, or a gesture and a cut. | Move one of them onto a different word, or drop one. |
| `faces-safe` | A face leaves the area that stays visible on a phone. | This is an error when that face is the subject of the shot. Change the framing or where they stand. |
| `overlay-collision` | A caption, POV card, slam, list, or title covers a face. | Shorten the text, or move the slam onto a different word. |
| `overlay-fit` | Text wraps past two lines, or a list or title does not fit. | Shorten it. |
| `contrast` | Text or a character outline does not read against the room. | An error on the cover title means the title treatment failed. A warning on a character means that room is a poor match. |
| `narrator-dominant` | More than 60 percent of the spoken time is voice-over. | Give the people more of the lines. |
| `distinct` | Two people on screen read as the same person. | Change who is cast. Milo and June are built to read apart. Two copies of Milo need labels, which is what `me-vs-me` is for. |
| `cover-contrast` | The cover title does not clear the contrast floor. | Shorten or restage the title. This one is an error. |

Each message includes a time, and the compile errors include a path such as `beats[2].actions[0].pose`, what was expected, and a one-line example. Fix that path. Do not restage the whole short because one pose name is misspelled.

The full record of a `pnpm direct` run is `public/skits/my-skit/generated/direct.json`. The camera reasons are in `generated/timeline.json`.

## Change the words

Say what should change, in one sentence, then ask for a lines-only rewrite.

```sh
pnpm write revise --skit=public/skits/my-skit/skit.json --note="June's last line should be about the calendar, in under eight words"
```

Send the printed `system` and `prompt` to the writer. Save the JSON reply as `public/skits/my-skit/reply.json`.

The reply looks like this:

```json
{
  "lines": [
    { "id": "b1", "who": "milo", "text": "You said nine.", "expression": "neutral" },
    { "id": "b2", "who": "june", "text": "I said around nine.", "expression": "deadpan" },
    { "id": "b3", "who": "milo", "text": "It is nine twenty.", "expression": "annoyed" },
    { "id": "b4", "who": "june", "text": "Your calendar can wait.", "expression": "smug", "slam": "WAIT" }
  ]
}
```

Every line you are keeping must be in the list, in order, with its existing `id`. Leave a line out to drop it. A new line needs a new `id` that no other line uses. The last line is the punchline.

Apply it:

```sh
pnpm write apply --skit=public/skits/my-skit/skit.json --reply=public/skits/my-skit/reply.json > /tmp/skit.json && mv /tmp/skit.json public/skits/my-skit/skit.json
```

If the command exits with code 2, do not move the file. The terminal has printed one repair note. Send it back to the writer once, replace `reply.json`, and run `apply` again.

Then preview again. The line texts changed, so the old audio is stale and `--say` records new draft voices.

```sh
pnpm direct my-skit --say
open out/my-skit.mp4
```

Staging on a line whose words did not change is kept. A line whose words changed is staged again from the new text.

If you would rather edit the premise yourself, change `premise.json` and rebuild. That discards hand edits in `skit.json`.

```sh
pnpm new my-skit --force
pnpm direct my-skit --say
```

## Change the picture, not the joke

Do this only when the words are right and one picture choice is wrong.

- **The room is wrong.** Change `set` in the premise and run `pnpm new my-skit --force`.
- **The cut is too bouncy, or too slow.** Set `style` in `skit.json` to one of `classic`, `deadpan`, `snappy`, `chaotic`, `sitcom`. Render again. You do not restage the lines.
- **You want a specific gag.** Add `"gag"` on that line in the premise, then `--force` and direct again.
- **You want to see the director's labels burned into the picture** (beat names, shot names). Run `pnpm direct my-skit --say --debug`. The file is `out/my-skit-debug.mp4`. Use it to point at a moment. Do not post it.
- **You want a fast look before a full-size render.** `pnpm render my-skit --quality=draft` writes a 540 by 960 file, which is enough to judge on a phone.

Leave the `shot` field alone unless you have watched the cut and you know which beat is framed wrong. The values are `wide`, `two`, `medium`, `close`, and `extreme`. Face framings name who they are on. The field list is in [The skit file](skits.md).

## When the preview is good enough to post

The joke, the length, and the pictures have passed a person. Two things are still true:

- The voices in that MP4 are the Mac, unless the harness has already written `voice.json`.
- Nothing has been uploaded.

Tell the person who runs the harness the skit id. They generate real audio for each spoken line, write `voice.json`, and run `pnpm render my-skit` and then `pnpm batch my-skit`. You watch that second MP4 once, because real speech moves the slams and the captions onto the real word times. Draft timing is an estimate.

Next: [The files you hand over](files-you-hand-over.md).
