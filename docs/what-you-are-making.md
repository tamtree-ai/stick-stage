# What you are making

For anyone starting with Stick Stage. You do not need the install page yet. Read this, then follow [Your first video](your-first-video.md).

## The video

A Stick Stage video is a vertical short, 1080 by 1920, the shape of a phone screen. The people are original stick figures with big heads. The rooms are drawn in code, the same way every time. The words on screen are the words in the script, including the captions.

A normal two-person joke lands around 15 to 30 seconds. A piece with a narrator, where someone off screen names the idea, can run 30 to 60 seconds. The first line should be understandable inside the first second. Strangers do not wait for a hello.

You get four things back when a video is packaged:

- An MP4.
- A subtitle file (`.srt`) that matches the script word for word.
- A text file with a one-line description, hashtags, a note that the voices are synthetic, and the script.
- A small JSON file with the title, the length, and the result of the automatic check.

Stick Stage does not upload that bundle. Whoever runs the channel posts it.

## What you decide

You decide the situation, the people, the room if you care, and the lines. The last line is the joke. A title and a one-line description help the person who posts, and the description should not spoil the last line.

You can also decide, when the joke needs it:

- A caption at the top that starts with `POV:`.
- One or two words that slam onto the screen on the punchline, repeating a word that was just said.
- A named physical gag, such as a double-take or a walk-out. The list is in [People, rooms, and shapes](cast-rooms-and-shapes.md).
- How the cut should feel: ordinary, deadpan, snappy, chaotic, or like a sitcom. Leave this out and you get the ordinary cut.

## What you leave alone

Stick Stage decides the timing between lines, where people look, the listener's reaction, and the camera. The ordinary plan opens on both people, stays there while they trade lines, and gives the punchline a close view of the face or a push-in on the last word. After the punchline it holds on the other person's reaction.

You write a camera instruction only when the joke fails without one. The same goes for gestures. One gesture on the word it belongs to is enough. Two people should not gesture on the same frame.

Mouths come from the audio. Stick Stage does not invent a performance on top of a silent script. Until real voices exist, the Mac reads the lines so you can watch a timed preview.

## What this is not

Stick Stage will not call a language model, will not call a text-to-speech service, and will not post. Those stay in the tamtree harness. No provider keys live in this folder.

It will not fetch anything while it renders. Voices and mouth shapes are prepared first and saved on disk. A second render of the same audio skips that work.

The characters are the six drawn for this show. You can supply an extra character document for a one-off, and it is drawn with the same rig. It is not added to the permanent cast. There is no seventh house face.

The picture is the house look: sticks, flat colour, code-drawn rooms. Stick Stage does not generate photographs or painted frames.

## The two ways to start a joke

**You write every line.** You pick a shape (two people talking, an interview, one person to camera, and so on), fill in `premise.json`, and Stick Stage stages a first cut. This is the path in [Your first video](your-first-video.md). Use it when you already know the joke.

**You write a topic.** A brief names the subject and who is in it. Stick Stage writes the instructions a writer must follow, checks the writer's reply, and stages the result. The writer may be a person or a model. The writer is only allowed to return words, a title, and a few marks such as a slam. Cameras and timing stay here. That path is in [Writing the joke](writing-the-joke.md).

Both paths end at the same place: a `skit.json`, then voices, then an MP4.

## A show, when you have one

Two shows are already named.

- `milo-june`. Milo and June. Home rooms: the living room, the office, the cafe. Opens with a POV card.
- `park-fables`. Dash and Moss. Home rooms: the two parks. Opens with a POV card.

An episode can carry a season number and an episode number. That information is copied into the JSON you hand over, so the harness can tell YouTube which episode it is. Stick Stage does not create the series on YouTube.

Next: [Your first video](your-first-video.md).
