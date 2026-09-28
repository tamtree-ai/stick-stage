# People, rooms, and shapes

A lookup page. Use it while you fill in a premise or a brief. The ids are exact. Copy them.

Personalities below are the working draft the team directs from. They are confirmed by use, and the cast notes in `src/data/characters/` are the longer version.

## The six people

| Id | Who they are | Play them as | Do not |
|---|---|---|---|
| `milo` | Tall, one tuft of hair, the quieter outline. | The straight man. Sincere, a beat behind the joke. He asks the reasonable question. | Make him mean. Things happen to him. He does not shove. |
| `june` | Shorter, hair in a bun, glasses, the louder outline. | Deadpan. She says the quiet part and will not explain it. She gets the last word. | Have her blow up in the first half. The rare blow-up is the punchline. |
| `lila` | A kid, ginger pigtails, clearly shorter than the adults. | She asks the question the adult hoped nobody would ask. She is usually right, and she does not soften it. | Baby talk. A joke whose point is that she is a child. Cruelty toward Theo. |
| `theo` | A kid, a little taller than Lila, blue shirt. | He repeats the dangerous idea as if it were the plan, then does it. Sincere. | Make him the mean one. He follows. Lila asks. |
| `moss` | A short, wide turtle, upright, shell on his back. | Patient and literal. He is right, and late. Stillness is his joke. | Let him win by being fast. He does not run and he does not shove. |
| `dash` | A tall hare, upright, long ears. | Sure of himself, and the sureness is the mistake. He declares the ending and leaves. | Give him the last true line. That line is Moss's. He can have the last loud one. |

Milo and June are the default pair. Use the others when the joke needs them.

- A kid asking an adult: `family`. One of Milo or June, plus Lila, Theo, or both. Room: `classroom-1` or `kitchen-1`.
- A fable: `fable`. Dash first, then Moss. Room: `park-1`. Dash leaves. Moss says the true line.
- Three people in a room: `trio`. Room: `living-1`.

Dev voices, for previews on a Mac, are Daniel (Milo), Samantha (June), Kathy (Lila), Junior (Theo), Fred (Moss), and Superstar (Dash). Posting uses voices chosen by the harness.

## The rooms

If you name no room, the shape picks its usual one. A room with seats starts those people sitting.

| Id | What it is | Who sits |
|---|---|---|
| `living-1` | Home living room. Window, bookshelf, plant. | Standing. Usual room for a two-person exchange. |
| `living-2` | Living room with a TV and a floor lamp. | Standing. |
| `kitchen-1` | Sunny kitchen, counter, fridge. | Standing. |
| `bedroom-1` | Bed, window, lamp. | Both sit on the bed. |
| `lounge-1` | Couch. | Both sit on the couch. |
| `office-1` | Desk and chair. | The person on the left sits. The person on the right stands. |
| `meeting-1` | Meeting room, whiteboard, blinds. | Standing. |
| `cafe-1` | Coffee shop, menu board, counter. | Standing. |
| `classroom-1` | Classroom, chalkboard, clock. | Standing. |
| `street-1` | Daytime street and a shop. Usual room for an interview. | Standing. |
| `street-night-1` | The same street at night. | Standing. |
| `park-1` | Sunny park and a bench. | Both sit on the bench. |
| `park-2` | Autumn park and a path. | Standing. |
| `beach-1` | Sea, sand, a striped umbrella. | Standing. |
| `stage-1` | A curtain and a spotlight. One person to camera, or an announcement. | Standing. |
| `plain-1` | A plain backdrop and a soft circle of light. Memes, text on screen, no real place. | Standing. |

Marks, if you later edit a skit by hand, are `left`, `center`, and `right`. `off-left` and `off-right` are entrances and exits.

Words can be painted into a room for one scene without changing the shared drawing. A chalkboard takes a short line. A laptop or a TV takes up to three short lines. A held sign takes one line, up to 24 characters. The field list is in [The skit file](skits.md).

## The shapes

Pass one of these to `pnpm new <id> --template=<shape>`.

| Shape | People | Usual room | Use it when |
|---|---|---|---|
| `exchange` | 2 | `living-1` | Two people trade lines. The last one lands the joke. This is the default. |
| `interview` | 2 | `street-1` | The first person holds the mic. The second answers, and the answer is the joke. |
| `me-vs-me` | 2 | `living-1` | One person argues with a labelled version of themselves. Both cast entries need a `label`. They can be the same character. |
| `pov-monologue` | 1 | `plain-1` | One person talks to camera under a POV card. |
| `text-slam` | 1 | `plain-1` | Words hit the screen. A face reacts. Little or no dialogue. |
| `explainer` | 2 | `living-1` | The pair say the hook and the twist. One narrator line names the idea. |
| `family` | 2 or 3 | `classroom-1` | A kid asks. An adult answers badly. The cast must include Lila or Theo. |
| `fable` | 2 | `park-1` | Dash, then Moss, in that order. Dash is sure and leaves. Moss has the last true line. |
| `trio` | 3 | `living-1` | Three people, one room, one of them lands it. |

`family` is the only shape that accepts a range. The others need exactly the count in the table.

## How the cut feels

Leave this out and the short is cut the ordinary way (`classic`). To set it, add one line near the top of `skit.json` after the file exists:

```json
"style": "deadpan",
```

| Style | What you will notice |
|---|---|
| `classic` | The ordinary cut. Pauses of about a quarter second. Sound effects where they were written. |
| `deadpan` | Longer holds, fewer face close-ups, almost no sound effects except the punchline. |
| `snappy` | Short gaps, more push-ins, a slide between rooms, a rimshot on the punchline. Suited to something under about 25 seconds. |
| `chaotic` | Camera shake and speed lines are allowed. Two people may react. Sound effects ride the actions. A boom on the punchline. |
| `sitcom` | The camera stays wide. A laugh on the punchline. |

A show can name a style. A skit that names none inherits the show's. These five are the ones that exist. A misspelled style is rejected with the list of real ones.

`tone` on a brief is a note to the writer. It does not change the camera. If you want the deadpan cut, set `style` as above.

## Named gags

Put `"gag": "double-take"` on a premise line when you want that bit. One gag on a line. Stick Stage expands it into the poses, the face, and the sound.

| Name | What happens |
|---|---|
| `double-take` | Look at the speaker, look away, snap back, shocked. |
| `look-to-camera` | Turn to the camera and hold a deadpan face. |
| `spit-take` | They are holding a cup. Recoil, a spray, shocked. |
| `faint` | Shocked, then a stiff fall. A thud. |
| `slow-clap` | A slow clap, deadpan. |
| `walk-out` | They turn and leave. |
| `freeze-frame` | The picture holds, a record scratch, and a "yep, that's me" card. |

## Sound effects you can name

When you are editing a skit and you want a sound on a hit or a turn, the ids are: `pop`, `boing`, `whoosh`, `swish`, `zip`, `record-scratch`, `boom`, `ding`, `buzzer`, `crickets`, `rimshot`, `slide-up`, `slide-down`, `sad-trombone`, `thud`, `laugh`, `sparkle`.

One to three in a short is enough. Hear them all with:

```sh
pnpm render SfxLab out/SfxLab.mp4
```

## A quiet bed under the room

`"music": "room"` on the skit is the one music bed. It ducks under speech and goes silent on the punchline. There is no library of tracks, and Stick Stage will not drop in a song from a platform. Cleared audio for a post is attached by the harness at post time.

## Shows

| Id | Title | Cast | Home rooms |
|---|---|---|---|
| `milo-june` | Milo and June | Milo, June | `living-1`, `office-1`, `cafe-1` |
| `park-fables` | Park fables | Moss, Dash | `park-1`, `park-2` |

To put an episode in a show, the staged skit gets:

```json
"meta": {
  "title": "Running late",
  "series": { "id": "milo-june", "season": 1, "episode": 3 }
}
```

Do not invent a third show in a file and expect it to be a series. Add `src/data/series/<id>.json` first if the team has agreed a new one.

Next: [Watch it and change it](watch-and-change.md).
