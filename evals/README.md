# Evals

How this skill was tried. Nothing here goes to the agent: only `skills/` is installed.

Skill version 0.2.2, with earlier rows from 0.2.1. Agent: Claude Code 2.1.310, headless, model id `claude-sonnet-5-5` as
its init event reports it. OpenFilm 0.2.7, Windows 11, 2026-11-06. Each arm ran once in an isolated project with the same
files; the only difference was the skill folder. Every `with` arm loaded the skill.

The result is mixed. With the skill, no cut point fell in loud speech, at most one word per film was damaged, and every
join changed framing. Without it, the agent removed more of what both requests asked to have removed, and on the English
request that cost seven damaged places.

## Material

Neither recording is in this repository.

- English: [WIKITONGUES- William speaking English](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_William_speaking_English.webm),
  Wikimedia Commons, Bogreudell, CC BY-SA 4.0. 210.4 s, one take.
- Chinese: [WIKITONGUES- Tao speaking Yunnan Mandarin with Thai and Taiwanese accent](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Tao_speaking_Yunnan_Mandarin_with_Thai_and_Taiwanese_accent.webm),
  Wikimedia Commons, Wikitongues and Teddy Nee, CC BY-SA 4.0. 127.2 s, one take.

No transcription service was connected, so a word-timed transcript was supplied beside each recording, the same in both
arms: faster-whisper `medium` for William (from an earlier trial), `large-v3` for Tao. To hear a cut again, five of the six
arms ran a local Whisper they found on this computer or set up themselves; `without` on the English request did not
transcribe again. A person without Whisper would need a connected service.

## Measures

The same scripts ran on all six films, apart from the arm that made them. Films were read from `npx openfilm look` contact
sheets and frames at the joins, and from second transcripts. No film was played or heard in Studio. The agents rendered
three of the films (both `without` arms and 0.2.2 on the Chinese request); the other three were rendered with
`npx openfilm render` for measuring.

```sh
node evals/measure.mjs <film.html> <recording name> --words <recording.vtt> --mp4 <render> --ref <recording.vtt> --heard <render.vtt>
node evals/keywords.mjs <film.html> <recording name> <recording.vtt> '<at>=<word said>;...'
node skills/talking-head/scripts/cuts.mjs check <film.html>
```

- Cuts in speech: `measure.mjs` takes the loudest 10 ms within 30 ms of a cut point. Loud means above 60% of the way from
  the room's level to speech level. Quiet means below 30%. This window is stricter than `cuts.mjs check`, so both are shown.
- Words damaged: `--ref` and `--heard` are the recording and the render, both transcribed by `large-v3` with the same
  prompt, then diffed. I read each difference and counted it when it fell at a cut and took or changed a word that was not a
  filler, false start or repeat. Whisper smooths repeats and drops ums, and it misheard this dialect in places, so a
  difference with no cut near it was not counted.
- Joins with the picture unchanged: correlation of the frames 0.05 s either side of the join at 0.8 or higher.

## Request 1, English

```
This is a one-take recording of me talking to camera about South Africa's data protection law: william.webm, with the transcript beside it (william.vtt). I say um a lot, I start sentences over and I leave some dead air. Clean it up so it sounds like I said it well the first time. Put the important words on screen as I say them, and add a name card and a cover. It's going on YouTube.
```

| | with 0.2.1 | with 0.2.2 | without |
| --- | --- | --- | --- |
| length, from 210.4 s | 186.7 s | 187.2 s | 166.7 s |
| clips | 14 | 12 | 35 |
| cut points in loud speech | 0/28 | 0/24 | 17/69 |
| cut points quiet | 21/28 | 15/24 | 24/69 |
| `cuts.mjs check` passes | 28/28 | 24/24 | 30/69 |
| words damaged at cuts | 0 | 1 | 7 |
| um and uh kept, of 14 in the transcript | 8 | 8 | 1 |
| joins with the picture unchanged | 0/13 | 0/11 | 1/34 |
| name card | none | William, title | William Diarra, title |
| cover line | his | his | its own |
| key word start vs transcript, median | 0.08 s | 0.04 s | 0.15 s |
| longest key word on screen | 1.48 s | 1.46 s | 19.38 s |
| minutes, cost | 25.9, $1.53 | 44.2, $1.50 | 24.9, $1.38 |

Seen, without: the damaged words are "its users or" and "children", both cut out of what he says, and five places the second
transcript heard differently at a cut: "they have", "compliance" then "clients", "enforced", "resort", "require". The key
word card still lists "Children" after the word was cut. The surname on the card and cover came from the transcript only.
Cards are labelled panels with wording of its own ("Applies to", "Dispute resolution takes"). The render measures -14.3 LUFS.
The film is 21 s shorter than either `with` film, with one um left.

Seen, with: most ums and several restarts stay ("they have to, yeah, they have to", "that's - that's me") because the brief
keeps a filler with no pause beside it, and the agent listed them for the person. 0.2.2 took one "and" with a cut and said
so. Level left at -24.5 LUFS. 0.2.1 left the name card out altogether and asked for the spelling, though the request asked for
a card. That sentence of the brief was changed, and 0.2.2 put in "William" and the title he gives.

## Request 2, Chinese

```
tao.webm 是我对着镜头讲的一段自我介绍，讲我自己和我们的书店，tao.vtt 是自动转的字幕，可能有错字。帮我剪一下，卡壳、重复和空档都去掉，听起来要自然。说到重要的词时打在屏幕上，再加个人物名片和封面。我要发视频号。
```

| | with 0.2.1 | with 0.2.2 | without |
| --- | --- | --- | --- |
| length, from 127.2 s | 121.8 s | 119.9 s | 113.2 s, plus a 1.2 s title |
| clips | 10 | 11 | 30 |
| cut points in loud speech | 0/20 | 0/22 | 1/60 |
| cut points quiet | 18/20 | 17/22 | 35/60 |
| `cuts.mjs check` passes | 20/20 | 22/22 | 48/60 |
| words damaged at cuts | 0 | 1 | 0 |
| stumbles cut, of the 3 read in the transcript | 0 | 1 | 3 |
| joins with the picture unchanged | 0/9 | 0/10 | 29/29 |
| name card | none | bookshop and town, no name | 朱涛, a guess |
| cover | apart from the film, his line | apart from the film, his line | also a 1.2 s shot in the film, its own words |
| key word start vs transcript, median | 0.03 s | 0.41 s | 0.14 s |
| longest key word on screen | 2.32 s | 1.60 s | 5.88 s |
| minutes, cost | 27.0, $1.40 | 19.8, $1.22 | 29.1, $1.34 |

The 3 stumbles are 我们家就 before 我住到八岁, 它是以这个 before 可以, and 看这个他们 before 我朋友.

Seen, without: all three stumbles gone and no word damaged. The transcript heard 朱岛; the agent wrote 朱涛 from the file name
and said it was unsure. It told the person that joins alternate with a slight zoom, but no change of framing shows in the
render; the frames at four joins show the head moving in a fixed frame.

Seen, with: this speaker is fluent and his stumbles have no pause beside them, so the brief left them in, and both films are
mostly tightened pauses. 0.2.2's one stumble cut also took 看这个, the words for watching this. 0.2.1 treated the sound into a
new file (noise taken out, -17.1 LUFS); 0.2.2 left it at -20.7 LUFS. 0.2.1 kept a card page with placeholders out of the film.
0.2.2 placed its key words from dips in the sound, and transcript times run a few tenths off, so the key word row is weak here.
