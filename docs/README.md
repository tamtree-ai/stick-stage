# Stick Stage manual

Stick Stage turns a short comedy script into a vertical video. Big-headed stick people stand in a drawn room, say the lines, and the camera cuts for the joke. You write the situation and the words. Stick Stage times them, aims the camera, draws the mouths, and renders a 9:16 MP4.

There is no website to log into. You work in this folder with a few commands, or another program sends the same work over HTTP.

Read the pages in order for the job you have. Each page says what you need before you start, the exact steps, and what you should see when a step worked.

## If you are making a video

Start here even if someone else set the computer up.

1. [What you are making](what-you-are-making.md). What a Stick Stage video is, what you decide, and what you leave alone.
2. [Your first video](your-first-video.md). One finished file, from a blank folder to an MP4 you can watch.
3. [Writing the joke](writing-the-joke.md). How to write the lines yourself, or hand over a topic and get lines back.
4. [People, rooms, and shapes](cast-rooms-and-shapes.md). The six characters, the rooms, the joke shapes, and the rhythms.
5. [Watch it and change it](watch-and-change.md). What to look for, and how to ask for a new line without losing the staging.
6. [The files you hand over](files-you-hand-over.md). The video, the captions, the post text, and who posts them.

## If you are setting the machine up, or connecting another program

7. [Set up the machine](set-up.md). Install, preview, the render service, Docker, and the errors you will actually see.
8. [One video, end to end](end-to-end.md). Every file and every command from a topic to the posting bundle, then the same path over HTTP.

After that, the field lists:

- [The skit file](skits.md). Every field in `skit.json`.
- [Voices](voice-contract.md). The audio files and `voice.json` a voice service must write.
- [The render service](render-service.md). Every HTTP endpoint.

## If you are writing code

Start here when you are changing Stick Stage, or calling it from another program.

1. [For developers](developers.md). How a frame is drawn, what is a JSON file, and what is code.
2. [Creating characters](creating-characters.md). The character document, the rig, poses, faces, and accessories.
3. [Creating backgrounds](creating-backgrounds.md). Sets, parts, palettes, seats, and a new drawing.
4. [Creating props](creating-props.md). Hand props, the five coded drawings, and a prop drawn from JSON.
5. [Programmatic guide](programmatic.md). The package entry points, compile, check, Remotion, and Node.

## Words used in every page

| Word | Meaning |
|---|---|
| Skit | One short video, stored as `public/skits/<id>/`. The id is a short lowercase name, such as `running-late`. |
| Premise | The joke as you wrote it: who is in it, the lines, which line is the punchline. File: `premise.json`. |
| Brief | A topic and a cast, before any lines exist. File: `brief.json`. |
| Beat | One moment in the video. Usually one spoken line. A silent beat is a pause with no words. |
| Hook | The first thing a stranger understands, inside the first second. |
| Punchline | The last spoken line, unless you mark a different one. The camera treats it as the joke. |
| Draft voices | The Mac speaking the lines. Fine for a preview. A video you post uses real text-to-speech from the tamtree harness. |
| Harness | The tamtree program that calls the language model, makes the real voices, and posts. Stick Stage does none of those three. |
