# Changelog

## 0.3.1

- `check` fails a clip shorter than 0.5 s unless the person wants it kept. In the 0.3.0 trial on the English recording a 0.44 s clip of a stray sound sat between two cuts and drew a click.
- `slips` and `check` say when the transcript times the next word inside a cut that is silent there. In that trial the agent kept an um that could come out, for fear the cut took the word after it; the word starts after the pause, where the sound is.

## 0.3.0

- `scripts/cuts.mjs slips <recording>` lists every um, repeat and long silence, each with the cut that takes only it, or why it has no pause on both sides to come out in. Cuts come from the recording's own pauses: in a 3.5-minute take a transcript's word times ran 0.1 to 0.5 s off, and a word after a pause starts where the one before it ended.
- `check` fails while a slip that can come out whole is still in, a silence over 0.8 s is left whole, clips are out of order, no transcript sits beside the recording or the film has no recording clip. It measures each key word against the transcript and against the sound, prints the length before and after, the cuts over two seconds with their words and the words taken that were not slips, and ends with what to do.
- The brief says the ums, restarts and dead air were asked for and what can come out comes out, that the transcript stays beside the recording, and that `check` is the last thing to run. A key word lands within 0.25 s, which `check` can measure, in place of two frames, which nothing did.
- `evals/`: `slips.mjs` and `clicks.mjs` measure any finished film; `keywords.mjs` is gone, because it measured against the transcript the agent had placed from. The trials are redone on OpenFilm 0.3.0.

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
