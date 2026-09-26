# Voice input contract (tamtree harness → StickStage)

StickStage does not call a TTS API. The tamtree agent harness synthesizes each line (for example
with `shortvideo.google_tts` or `shortvideo.openrouter_tts`) and drops the result into the skit
folder. StickStage then handles lip-sync, captions and rendering.

## Files the harness writes

```
public/skits/<skitId>/
  voice/<lineId>.wav        # or .mp3 / .ogg, one file per spoken line
  voice.json                # manifest below
```

`voice.json` (validated by `VoiceManifestSchema` in `src/engine/voice/schema.ts`):

```json
{
  "schemaVersion": 1,
  "lines": [
    {
      "id": "b1",
      "speaker": "june",
      "text": "I'm fine. Totally fine.",
      "audio": "voice/b1.wav",
      "durationMs": 1830,
      "words": [ { "text": "I'm", "startMs": 40 }, { "text": "fine", "startMs": 260, "endMs": 610 } ]
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Beat or line id from the script |
| `text` | yes | **Exactly the script text.** Subtitles show this, never a transcript |
| `audio` | yes | Relative to the skit folder. WAV, MP3 or OGG |
| `durationMs` | no | The harness's measured `duration_seconds × 1000`. Prep measures it when missing |
| `words` | no | Per-word start times, e.g. from Google TTS with one SSML `<mark>` before each word. `endMs` defaults to the next word's start |

**Without `words`** (OpenRouter plain text, macOS `say`), prep estimates word timings. It finds the
pauses in the audio by silence detection, matches them to the script's punctuation, and spreads
each phrase by syllables across its spoken span. Mouths always come from Rhubarb on the real
audio, so estimated word timings only affect subtitle highlighting and word anchors.

**Phrase-level marks** (`captions[{text, start_seconds}]` from the harness phrase-list mode) can
be passed as `words` holding one entry per phrase's first word. The aligner matches those words
and spreads the rest of each phrase between them.

## Which lines

For a skit, the lines are the spoken beats of `skit.json`: `id` = beat id, `text` = `line`,
`speaker` = cast id. The character JSON (`src/data/characters/<id>.json`) carries voice hints in
`voice` (`provider`, `voiceId`, `settings` for the harness; `say` for local dev), and a beat's
`delivery` is a free-form hint ("flat", "whispered"). `skitLines(skit)` in the engine returns
exactly this list.

## Then

```
pnpm render <skitId>      # prep (Rhubarb + word alignment, cached) → compile → out/<skitId>.mp4
```

The harness triggers a render with `pnpm render <skitId>` once `voice.json` is in place. It exits non-zero and prints the diagnostics if the skit doesn't compile. `pnpm prep` does no network I/O. A re-run with unchanged audio and text is a full cache hit.
For local development without the harness, `pnpm voice:say <skitId>` writes the same files from
`script.json` using macOS `say`.
