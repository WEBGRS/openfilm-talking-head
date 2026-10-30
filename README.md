# talking-head

An [OpenFilm](https://github.com/openfilm/openfilm) skill for the plainest and most asked-for edit: a recording of
someone talking to camera, cleaned up. The ums, false starts, repeats, abandoned takes and dead air go, every cut
falls in a pause so nobody hears it, and the key words, a name card and a cover go on top.

| | | |
| --- | --- | --- |
| <img src="skills/talking-head/cover.jpg" width="200" alt=""> | [Talking head](skills/talking-head) | Your talking recording without the ums, stumbles and dead air, cut so nobody notices, with key words, a name card and a cover. |

It is a brief and nothing else. The work it asks for already exists in OpenFilm: `npx openfilm get asr` gives every
word's time and the pause before each line, a recording is cut by trimming the same file, and Studio draws the
subtitles of every trim from one transcript. What the brief adds is what an agent gets wrong when nobody says it:

- only what a viewer would skip goes; their words stay in their order, and of a line said twice the last whole one
  stays;
- every cut falls in a pause of 0.12 s or more and is checked by ear and in the frames on both sides;
- a transcript can leave the ums out, so a long gap between two words may hold one;
- every cut longer than two seconds is reported with the words it took out, so the person can put it back;
- transcribing an hour costs an hour of the person's service, said before it starts.

For a recording where slides or screens fill the frame and the person speaks from a corner, use the official
`presenter-pip`; to make short clips from a long one, `long-to-short`.

## Use it

- **In OpenFilm**: open Skills, add one from a link, and paste `https://github.com/WEBGRS/openfilm-talking-head`.
- **In your own agent** (Claude Code, Codex and others): `npx skills add WEBGRS/openfilm-talking-head`.

It needs a transcription service connected in OpenFilm (Settings → Providers).

## Check

```sh
node scripts/check.mjs
```

## 中文说明

口播剪辑用的 OpenFilm 技能：把一段对着镜头说话的录像剪干净。去掉口癖、说错重来、重复、没说完的那一遍和空档；每一刀都落在停顿里，听不出剪辑点；再加上重点词、人物名片和封面。

它只有一份需求书，没有脚本。要用的能力 OpenFilm 都有：`npx openfilm get asr` 给出每个字的时间和每句前的停顿，剪辑就是对同一个文件做裁剪，Studio 按一份转写给每段裁剪出字幕。需求书补的是没人说时智能体容易做错的地方：

- 只剪观众会跳过的部分；话保持原样和原顺序，同一句说了两遍，留最后完整的那一遍；
- 每一刀都落在 0.12 秒以上的停顿里，听一遍、看剪点前后两帧确认；
- 转写可能把「呃」「嗯」省掉，两个词之间空得久，里面可能就有一个；
- 剪掉超过 2 秒的地方连同原话列出来，想要哪段可以放回去；
- 转写一小时录像就要用一小时的转写服务，开始前先说。

PPT、录屏占满画面、人在小窗里讲的，用官方的「小窗人物口播」（presenter-pip）；从长视频里剪短片，用「长视频转短视频」（long-to-short）。

**安装**：在 OpenFilm 的技能页点「添加 skill」，粘贴链接 `https://github.com/WEBGRS/openfilm-talking-head`；用自己的智能体就运行 `npx skills add WEBGRS/openfilm-talking-head`。需要先在 OpenFilm 的设置（左上角的 OpenFilm 标志）→ 服务商里连好一个语音转写服务。
