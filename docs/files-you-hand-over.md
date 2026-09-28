# The files you hand over

For the person who takes a finished short to whoever posts it. Stick Stage writes the files. It does not upload them.

## Make the bundle

From the Stick Stage folder, after `skit.json` exists and the voices match the lines:

```sh
pnpm batch my-skit
```

Add `--say` only when you still want the Mac voices. Leave it off when `voice.json` already holds the real voices. If the voices are missing, the command fails and tells you. It will not invent audio.

You should see:

```text
batch:
  rendered  my-skit  → out/posts/my-skit/my-skit-<title>-<eight letters>.mp4
```

The folder `out/posts/my-skit/` contains four files that share that name:

| File | Hand it to | What it contains |
|---|---|---|
| `.mp4` | The person who uploads | The video, 1080 by 1920, with picture and sound. |
| `.srt` | The same upload, as captions | The script, timed. Captions are the written line, not a transcript of the audio. A narrator line is prefixed with the narrator's name. |
| `.txt` | Whoever writes the post | The description, the hashtags, a note that the voices are synthetic, and the script. |
| `.json` | The harness, or your own records | Title, length, season and episode if you set them, and a summary of the check. |

Open the `.txt` before anyone posts. Confirm the description does not spoil the punchline, and that the script in the file is the script you approved.

Run the same command again after nothing has changed and the status is `unchanged`. The eight-letter ending is a hash of the picture and of the renderer. A new picture gets a new name, so an old upload is not silently replaced.

`--force` renders again even when the hash matches. `--all` packages every skit under `public/skits/` except folders whose id ends in `lab`. Those are internal tests. If any skit in a batch fails, the command exits with an error after it has reported which ones. The ones that succeeded are still in `out/posts/`.

A skit that fails the check is skipped, and the reason is printed. `--skip-check` renders it anyway. Use that only when a person has looked at the finding and decided to ship it. Do not use it to hide an error you have not read.

## What you tell the person who posts

Send them:

- The MP4 path.
- The `.txt` and the `.srt`.
- The length, from the first line of `pnpm compile my-skit` or from the `.json`.
- Whether the voices are draft or real. Say this in the message. A file made with `--say` must not go up as the public video.
- The show, season, and episode, if `meta.series` was set. The `.json` repeats them so the harness can pass them to YouTube.

Stick Stage does not choose a thumbnail by hand. A render through the service also writes a cover still and a thumbnail still, from the punchline reaction. The batch command on your machine writes the four files above. If you need the stills, ask for a service render with covers left on, which is the default. Details are in [The render service](render-service.md).

## Draft voices and real voices

| | Draft | Real |
|---|---|---|
| Who makes the audio | The Mac, via `pnpm direct my-skit --say` or `pnpm batch my-skit --say` | The tamtree harness, one audio file per spoken line |
| Where it is written | `public/skits/my-skit/voice/` and `voice.json` | The same paths |
| Safe to post | No | Yes, after you have watched the new MP4 |
| How you render | `--say` is enough | `pnpm render my-skit`, then `pnpm batch my-skit` |

If you change a line after the real voices exist, that line's audio is stale. The next render refuses it until the harness speaks the new text. The error says `voice-stale` and names the line. Do not point the old wav at the new sentence. The captions would lie, and the mouth would be timed to the wrong words.

## A season and an episode

On the skit, inside `meta`:

```json
"series": { "id": "milo-june", "season": 1, "episode": 3 }
```

`id` must be a show that exists: `milo-june` or `park-fables`. The post JSON copies `series` through. YouTube can then file the short as that episode. Creating the series on the channel is the harness's job.

## What you keep, and what you can delete

Keep `public/skits/my-skit/premise.json`, `skit.json`, and, once they are real, `voice.json` and the audio files. Those are the short.

`public/skits/my-skit/generated/` is a cache: mouth shapes, the compiled timeline, the check report. It is rebuilt. It is gitignored.

`out/` is output. The posting bundle under `out/posts/` is the thing you archive if you need the exact file that went up. The hash in the filename is how you tell two renders apart.

Finished jobs on the render service are deleted after 24 hours unless that timer is changed. Copy the files off the service when the job succeeds. Do not assume they will be there tomorrow.

Next, if you are done making videos: hand over the folder and stop. If you run the computer or another program calls Stick Stage, read [Set up the machine](set-up.md) and [One video, end to end](end-to-end.md).
