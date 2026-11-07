# Changelog

## 0.2.2

- A name only the transcript heard stays off, and the name card still goes in with what is sure. In trials on 0.2.1 the agent left the whole card out.
- `evals/README.md`: the requests it was tried on, with and without it, and the scripts that measured them.

## 0.2.1

- `openfilm.json` says what the skill needs: FFmpeg on the PATH and a transcription service.
- The brief says the script runs the `ffmpeg` on the person's PATH.

## 0.2.0

- Cuts come from pauses measured in the sound, not from the transcript's gaps, and `scripts/cuts.mjs` checks each one.
- The joined sound is transcribed again.
- A name only the transcript heard stays off the card; the cover is the picture shown before the film plays, in a line they said.

## 0.1.0

- First version.
