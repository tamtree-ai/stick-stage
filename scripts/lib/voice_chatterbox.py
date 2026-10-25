"""Chatterbox (Resemble AI, MIT) for `pnpm voice:tts --tts=chatterbox`: an expressive local voice.

Dev tool only (standalone mode, D1): the engine and the render service never call a TTS.
Run by scripts/lib/tts.ts through uv, which keeps it in its own Python env:

    uv run --python 3.11 --with chatterbox-tts==0.1.7 --with "setuptools<81" scripts/lib/voice_chatterbox.py jobs.json

`jobs.json` is a list of {text, out, ref?, exaggeration, cfg, seed}. The model loads once (Apple
GPU when there is one) and every job is written as 16-bit mono WAV. `ref` is a short clip of the
voice to clone, so each character keeps its own voice; `exaggeration` is the emotion dial
(0.25 flat … 1 big) and `cfg` the pacing (lower is slower and more deliberate). Seeds keep re-runs
the same.
"""

import json
import sys

import torch
import torchaudio as ta

device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
# Checkpoints were saved on CUDA; map them onto whatever this machine has.
_load = torch.load
torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": torch.device(device)})

from chatterbox.tts import ChatterboxTTS  # noqa: E402  (after the torch.load patch)

jobs = json.load(open(sys.argv[1]))
model = ChatterboxTTS.from_pretrained(device=device)
for i, job in enumerate(jobs):
    torch.manual_seed(int(job.get("seed", 0)))
    wav = model.generate(
        job["text"],
        audio_prompt_path=job.get("ref"),
        exaggeration=float(job["exaggeration"]),
        cfg_weight=float(job["cfg"]),
    )
    ta.save(job["out"], wav.cpu(), model.sr, encoding="PCM_S", bits_per_sample=16)
    print(f"  chatterbox {i + 1}/{len(jobs)}: {job['text']}", flush=True)
