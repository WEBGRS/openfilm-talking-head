# Evals

How this skill was tried. Nothing here goes to the agent: only `skills/` is installed.

The skill was not clearly better. On the English request 0.3.0 left 9 of the 14 ums in the recording and the arm without it left 3. On the Chinese request 0.3.0 cut 2 s of silence and kept all three stumbles, and the arm without it took one out, most of another, and left one. In return no cut point of any film made with the skill fell in loud speech and no word was damaged, against 22 of 72 cut points and 6 damaged places in the English film without it, and 4 of 60 and 1 in the Chinese. The films with the skill also carry no wording of their own and no guessed name. Their English mixes are quieter (-24.5 and -24.7 LUFS against -17.5).

The gap comes from cutting where there is no pause. Of the 29 ums, repeats and restarts that `slips` lists in the English recording, 26 have no pause of 0.12 s on one side or both. The skill leaves those in and says so; the arm without it cut through 16 of them. The 3 that can come out whole are the only ones the skill can promise to remove.

Skill version 0.3.0 on both requests, and 0.3.1 on one more run of request 1. Agent: Claude Code 2.1.310, headless, model id `claude-sonnet-5-5` as the init event of every run reports it. OpenFilm 0.3.0, installed at that exact version, Windows 11, 2026-11-06 and 2026-11-07. Each arm ran in a new project with the same files; the only difference was the skill folder, and every `with` arm loaded the skill. Each request ran once in each arm, plus one more `with` run of request 1 after a defect showed (below), kept beside the first. Five runs, 119 minutes of agent time, $5.71.

No transcription service was connected. None of the three `with` arms could transcribe its cut again, and each report says so. The English `without` arm did not either; the Chinese `without` arm ran a Whisper it found on this computer.

## Material

Neither recording is in this repository.

- English: [WIKITONGUES- William speaking English](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_William_speaking_English.webm), Wikimedia Commons, Bogreudell, CC BY-SA 4.0. 210.4 s, one take. The speaker gives a name near the end; the transcripts spell the surname "Diarra" and, in a second run, "Diara".
- Chinese: [WIKITONGUES- Tao speaking Yunnan Mandarin with Thai and Taiwanese accent](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Tao_speaking_Yunnan_Mandarin_with_Thai_and_Taiwanese_accent.webm), Wikimedia Commons, Wikitongues and Teddy Nee, CC BY-SA 4.0. 127.2 s, one take. The transcript hears the name as 朱岛.

A word-timed transcript was supplied beside each recording, the same in both arms: faster-whisper `medium` for William (14 ums in it), `large-v3` for Tao. The `with` arms and the English `without` arm moved the recording into `assets/` with its transcript. The Chinese `without` arm left `tao.vtt` at the project's root, so `check` was run on a copy of its film with the transcript beside the recording.

## Measures

The same scripts ran on every film, whichever arm made it. Films were read from `npx openfilm look` contact sheets and frames (the card, a key word, a join, the cover) and from the second transcripts. No film was played or heard. Each film was rendered with `npx openfilm render` for the picture, loudness and clicks.

```sh
node evals/measure.mjs <film.html> <recording name> --words <recording.vtt> [--spans '27.30-28.28;...'] [--mp4 <render>]
node evals/slips.mjs <film.html> <recording name> <recording> <recording.vtt>
node evals/clicks.mjs <film.html> <recording name> <render.mp4>
node skills/talking-head/scripts/cuts.mjs check <film.html>
node skills/talking-head/scripts/cuts.mjs joined <film.html> --out joined.wav
ffmpeg -i <render.mp4> -af ebur128=peak=true -f null -
```

- Cut points: `measure.mjs` takes the loudest 10 ms within 30 ms of each point. Loud is above 60% of the way from the room's level to speech level, quiet is below 30%. `check` asks for a pause of 0.12 s or more instead, so both are shown.
- Slips: `slips.mjs` lists every um, repeat, restart and silence of 0.8 s or more that the recording's sound and transcript show, and says whether a film took each out. "Clean" slips have a pause on both sides, so one cut takes only them; "flush" ones do not.
- Ums: each um in the transcript is judged over its own stretch of the recording, as gone, partly or kept. A transcript's times run a few tenths off, so this row is less sure than the others.
- Stumbles in the Chinese recording, read from its transcript: 我们家就 (27.30-28.28 s), 它是以这个 (87.64-89.46 s), 看这个他们 (116.34-118.06 s). They are judged the same way with `--spans`.
- Words damaged: the recording and the joined sound of each film's clips, both transcribed by `large-v3` with the same settings, then diffed. I read each difference and counted it when it fell at a cut and took or changed a word that was not an um, false start or repeat. The model drops ums and misheard this dialect in places, so a difference with no cut near it was not counted.
- Joins with the picture unchanged: correlation of the frames 0.05 s either side of a join at 0.8 or higher. A small change of scale can read as unchanged.
- Clicks: energy above 4 kHz in 6 ms at a join against the median of the windows around it, flagged at 12 dB. It finds a short noise, not every audible cut.
- Key words: `check` prints each page's start against the transcript and, where the word follows a pause, against the sound.

## Request 1, English

```
This is a one-take recording of me talking to camera about South Africa's data protection law: william.webm, with the transcript beside it (william.vtt). I say um a lot, I start sentences over and I leave some dead air. Clean it up so it sounds like I said it well the first time. Put the important words on screen as I say them, and add a name card and a cover. It's going on YouTube.
```

| | with 0.3.0 | with 0.3.1 | without |
| --- | --- | --- | --- |
| length, from 210.4 s | 191.5 s | 203.2 s | 171.0 s, 2.6 s of it a title card |
| clips | 13 | 7 | 36 |
| cut points in loud speech | 0/26 | 0/12 | 22/72 |
| cut points quiet | 15/26 | 7/12 | 25/72 |
| `check`: cut points in a pause | 26/26 | 12/12 | 26/72 |
| ums gone, partly, kept, of 14 | 5, 0, 9 | 4, 1, 9 | 9, 2, 3 |
| clean slips (3) out, in, partly | 1, 2, 0 | 2, 1, 0 | 1, 1, 1 |
| flush slips (26) out, in, partly | 7, 18, 1 | 4, 22, 0 | 16, 8, 2 |
| silences of 0.8 s or more (2) left whole | 0 | 0 | 0 |
| words damaged at cuts | 0 | 0 | 6 |
| joins with the picture unchanged | 0/12 | 6/6 | 8/35 |
| clicks at joins | 1/12 | 0/6 | 1/35 |
| mix, peak | -24.5 LUFS, -3.5 dB | -24.7 LUFS, -3.5 dB | -17.5 LUFS, -0.6 dB |
| key words | 8 pages, all within 0.04 s of the transcript | 8 pages, all within 0.04 s | 14 plates; 2 are 0.77 and 1.75 s off the transcript's time for their words, 1 is 0.32 s late against the sound |
| name card | William and a title | a title, no name | William Diarra and a title |
| cover | apart from the film, the speaker's line | apart from the film, the speaker's line | a 2.6 s card at the start of the film, and a thumbnail file |
| minutes, cost | 11.6, $1.56 | 16.8, $0.90 | 29.4, $1.32 |

Seen, with 0.3.0: the key word is a yellow plate at the right, over the wall, and the card at the lower left reads "William / Final-year law student / University of Cape Town"; neither covers the speaker's face. Its film.html alternates the box between the full frame and a closer one at every join, and all 12 joins measure as changed. The one click is the join at 81.17 s, where a 0.44 s clip holds a stray sound between two cuts. The agent kept two slips that `check` listed, with `--keep`: "information about children," (an item in the speaker's list of special categories) and the um at 47.46 s, which it said the cut would take "it" with. In the sound that um sits between two pauses and "it" starts after the second one; the transcript times "it" 0.34 s early. It said the mix is quiet and the peaks leave no room to raise it.

Seen, with 0.3.1: the agent took that um out, and said 22 slips remain for want of a pause. The film is 12 s longer than 0.3.0's from fewer cuts: seven clips, six joins. Three of the six joins use a closer frame; correlation reads 0.84 to 0.99 there. The card has the title and no name at all, although "William" is in both transcripts. The cover is a still of the speaker's face with the title and one line from the recording.

Seen, without: a 2.6 s title card opens the film, with "POPIA", a word never said in the recording, and plates carry small kicker lines of the agent's own. The name card says William Diarra, the surname from the transcript only; the agent asked for confirmation. 22 cut points fall in loud speech and the second transcript differs from the recording at six of them: "it" is missing from "justify it", "so they have to" reads "that to", "require it" reads "required", "not in operation" and "is in operation" read "an", and "the act" reads "that act". Its own mp4, not the film, was brought to -14 LUFS.

## Request 2, Chinese

```
tao.webm 是我对着镜头讲的一段自我介绍，讲我自己和我们的书店，tao.vtt 是自动转的字幕，可能有错字。帮我剪一下，卡壳、重复和空档都去掉，听起来要自然。说到重要的词时打在屏幕上，再加个人物名片和封面。我要发视频号。
```

| | with 0.3.0 | without |
| --- | --- | --- |
| length, from 127.2 s | 125.2 s | 114.7 s |
| clips | 2 | 30 |
| cut points in loud speech | 0/4 | 4/60 |
| cut points quiet | 4/4 | 44/60 |
| `check`: cut points in a pause | 4/4 | 50/60 |
| stumbles (3) gone, partly, kept | 0, 0, 3 | 1, 1, 1 |
| silence of 0.8 s or more (1) left whole | 0 | 0 |
| words damaged at cuts | 0 | 1 |
| joins with the picture unchanged | 0/1 | 29/29 |
| clicks at joins | 0/1 | 0/29 |
| mix, peak | -20.8 LUFS, -2.0 dB | -20.7 LUFS, -2.0 dB |
| key words | 8 pages, 7 at 0.00 s from the transcript, 1 at 0.10 s early | 9 pages; 6 match no words said near them, the card among them; of the other 3, one is 0.70 s and one 1.22 s off |
| name card | the bookshop and the town, no person's name | 朱涛 |
| cover | apart from the film, the speaker's line | apart from the film, its own lines and 朱涛 |
| minutes, cost | 19.9, $0.86 | 41.3, $1.07 |

Seen, with: two clips and one join; the key word plates ("台湾", "越南人") read clearly on the wall at the left, and the card reads "东南亚书店 / 桃园". The cover is 东南亚书店 over the speaker's line 我介绍一下这个书店. The agent named the three stumbles it could see in the transcript and left them, because each runs into a neighbouring word; it took no word that was not silence. It left the person's name off because the transcript's 朱岛 is a guess.

Seen, without: the film has 4 cut points in loud speech and 10 not in a pause. It took out 我们家就 and most of 看这个他们, left 它是以这个, and the second transcript lost 那些 after 青麦. It said every join alternates a 12% zoom; the frames across a join (3.22 s) show the head moving in a fixed frame, and all 29 joins measure unchanged. The name is 朱涛, which the agent took from the file name tao against the transcript's 朱岛 and said it was unsure of. Plates carry small lines of its own such as 出生地. It said it brought its mp4 to about -17 LUFS; the film itself measures -20.7.

## What the fixes changed

The 0.2.2 film from the earlier trial, which ran before 0.3.0 and on a mix of OpenFilm versions, is measured here by the same scripts, for the clean slips only.

| English film | clean slips (3) out, in | cut points in a pause |
| --- | --- | --- |
| 0.2.2 | 1, 2 | 24/24 |
| 0.3.0 | 1, 2 | 26/26 |
| 0.3.1 | 2, 1 | 12/12 |

In 0.3.0 both slips left in were kept with `--keep`: the list item, which is right, and the um, which is not. In 0.3.1 the one left in is the list item.

0.3.0 added `slips`, and `check` fails while a clean slip is in unless the agent says to keep it. The 0.2.2 agent had no list and left both. 0.3.1 fixed two things the first run showed: a clip of 0.44 s with a stray sound, now a failure of `check`, and the transcript timing a word inside a cut that is silent there, now said beside the cut.

## Not tried

- Listening. Every claim about sound is from measures and second transcripts.
- A cut at the bottom of a dip with a short crossfade, which would take out ums that run into words. It would give up the rule that every cut falls in a pause.
- A connected transcription service, so the agents could hear their cuts again.
- Other recordings, other languages, more than one run per cell, or another model. The two 0.3.0 and 0.3.1 runs of request 1 differ by 12 s of length, so one run says little about size.
- Stumbles that repeat no words. `slips` does not find them and the skill leaves them to the agent's reading of the transcript.
- Studio's own playback and export.
