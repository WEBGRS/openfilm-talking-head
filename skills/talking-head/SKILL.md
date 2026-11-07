---
name: talking-head
description: Cut a recording of someone talking to camera into the version they would give on a good day - ums, false starts, repeats, retakes and dead air gone with cuts nobody notices, their key words on screen as they say them, a name card and a cover. Use when the person gives a talking-head recording, a vlog, a course or a long rough take and asks to clean it up, tighten it or cut it down, or to add key words, a name card or a cover (口播剪辑, 剪口播, 去口癖, 去气口, 粗剪, 精剪, 重点词, 人物名片, 封面).
---

# Talking head

Cut the person's recording into the version they would give on a good day: the same person and their own words,
with nothing a viewer would skip and nothing missing that mattered.

## What defines it

No one can tell where it was cut, and what a viewer would skip is gone. A cut that clips a syllable or swallows a breath is
heard at once, and a sentence spliced from words they never said in that order is no longer theirs. Taking out every pause is not tightening: breath and emphasis stay.

## What has to be true

- **Their words, in their order.** Only ums, false starts, repeats, abandoned takes and dead air go, unless they ask
  for more; of a line said twice, the last whole one stays. A silence over 0.8 s is cut to about half a second.
- **Every cut falls in a pause of 0.12 s or more in the sound**, never inside a word. A transcript's times run a few
  tenths off and it leaves ums out, so cut points come from the pauses measured in the recording. Where the picture
  would jump, something covers it; look at the frames on both sides of every cut.
- **What can come out does.** They asked for the ums, restarts and dead air out. One that stands between two pauses is
  cut there, and `check` fails while it is in. One that runs straight into a word has no pause to cut in: it stays, and
  you tell the person how many and which.
- **Heard again, it is their words.** The joined sound, transcribed once more, reads as what they said in their order,
  less only what was meant to go; a cut that left a repeat in or took a word is moved.
- **What is on screen is what they said.** A key word lands as they say it, within 0.25 s, and leaves when they move
  on. The name card carries the name and title they gave, spelled their way, and goes in with what is sure (a name only
  a transcript heard is a guess: that part stays off until they spell it). Subtitles come from the transcript.
- **The cover** is a line they said that says what the film is about, readable at the size a feed shows it, shown
  before the film plays, not a shot in it.

## What you have

Their recording and its transcript with every word's time
(`npx openfilm get asr --src <file>` writes `<name>.vtt` beside it). Keep the two together, in `assets/` too:
subtitles follow every trim from that file. `node <this skill's folder>/scripts/cuts.mjs`
measures the sound, with the `ffmpeg` on the person's PATH:
- `pauses <recording>`: every pause, with the words around it;
- `slips <recording>`: every um, repeat, restart and long silence, with the cut that takes only it, or why it stays;
- `joined --out <file>`: the clips back to back, to transcribe again; keep that file out of `assets/` and delete it after;
- `check`: run it last. Cut points, what is still in, order, the transcript, key words against the words, the numbers for
  your report. It exits 1 and ends with what to do.

Each key word, the card and the cover is a page of its own (a page's address takes no query); `npx openfilm look <page> 0`
gives the cover's picture. Transcribing costs the length of the recording in their service, and hearing the cut again
costs its length once more: say so before you start.

## With the person

What they ask for comes first. How long it should end up, where it will be watched, their name and title for the
card, and whether tangents may go as well: ask without holding up the work. When done, tell them in a few lines the
length before and after, the cuts over two seconds with their words so they can put any back, what stayed and why,
any word taken that was not an um or a repeat, and what of theirs would make it better.
