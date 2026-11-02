---
name: talking-head
description: Cut a recording of someone talking to camera into the version they would give on a good day - ums, false starts, repeats, retakes and dead air gone with cuts nobody notices, their key words on screen as they say them, a name card and a cover. Use when the person gives a talking-head recording, a vlog, a course or a long rough take and asks to clean it up, tighten it or cut it down, or to add key words, a name card or a cover (口播剪辑, 剪口播, 去口癖, 去气口, 粗剪, 精剪, 重点词, 人物名片, 封面).
---

# Talking head

Cut the person's recording into the version they would give on a good day: the same person and their own words,
with nothing a viewer would skip and nothing missing that mattered.

## What defines it

No one can tell where it was cut. A cut that clips a syllable, jumps the picture or swallows a breath is heard at
once, and a sentence spliced from words they never said in that order is no longer theirs. Taking out every pause is
not tightening: breath and emphasis stay.

## What has to be true

- **Their words, in their order.** Only ums, false starts, repeats, abandoned takes and dead air go, unless they ask
  for more; of a line said twice, the last whole one stays. Report the length before and after, and every cut longer
  than two seconds with the words it took out.
- **Every cut falls in a pause of 0.12 s or more in the sound**, never inside a word, and sounds continuous when heard
  across it. A transcript's times run a few tenths off and its gaps can hide an um, so cut points come from the pauses
  measured in the recording, and every one passes the check below. A filler with no pause on either side stays. Where
  the picture would jump, it is covered: by a change of framing, by something they talk about, or by their key word
  filling the screen. Check the frames on both sides of every cut.
- **Heard again, it is their words.** The joined sound, transcribed once more, reads as what they said in their order,
  less only what was meant to go. A cut that left the repeat in or took a word with it is moved or put back.
- **What is on screen is what they said.** A key word lands within two frames of being said and leaves when they move
  on; the name card carries the name and title they gave, spelled their way; subtitles come from the transcript.
- **The cover says what the film is about** in their words, readable at the size a feed shows it.

## What you have

Their recording, cut by trims of the same file, never re-encoded; its transcript with every word's time and the pause
before each line (`npx openfilm get asr --src <file>`). Subtitles follow every trim on their own, so transcribe once.
`node <this skill's folder>/scripts/cuts.mjs` measures the sound, with the ffmpeg OpenFilm uses: `pauses <recording>`
lists every pause with the words around it, and the gaps in the transcript that hold sound (an um it left out);
`check` tests every cut point in film.html; `joined --out <file>` writes the recording's clips back to back, to
transcribe again. Keep that file out of `assets/` and delete it after. A version you treat (noise taken out through a
service the person has, the level evened) is a new file under `assets/`, and the cuts stay trims of it. Anything you
can make titles, cards and motion with, your own built-in tools, and the services the person has keys for. Each key
word, the card and the cover is a page of its own (a page's address takes no query); `npx openfilm look <page> 0`
gives the cover's picture. Transcribing an hour costs an hour of their service, and hearing the cut again costs its
length once more: say so before you start.

## With the person

What they ask for comes first. How long it should end up, where it will be watched, their name and title for the
card, and whether tangents may go as well. Ask without holding up the work. When done, tell them in a few lines the
length before and after, how many cuts, the longer ones with their words so they can put any back, and what of theirs
would make it better.
