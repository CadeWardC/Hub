# Mandarin Reader

A Flutter graded-reader app for web, Android, and iOS. It presents levelled
Taiwan Mandarin stories with optional pinyin and English, vocabulary,
per-segment audio, full-story playback, speed controls, and local reading
progress.

## Taiwan Mandarin

The reader teaches the Mandarin of Taiwan, in Traditional characters (正體字).
That decision runs through the whole pipeline rather than sitting in the UI:

* stories are **authored** in Traditional and the Simplified rendering is
  derived from it at publish time, never the other way round — 干 is 乾, 幹, or
  干 depending on meaning, so converting upward would invent errors;
* the bundled dictionary is keyed by traditional headword, with a
  `simplifiedIndex` so a simplified query still resolves;
* pinyin is Taiwan-standard, which is why 垃圾 is lèsè, 星期 is xīngqí, and 喜歡
  is xǐhuān, while 東西 correctly stays dōngxi;
* there is no 兒化 anywhere — 這裡 and 一點, not 這兒 and 一點兒;
* speech recognition asks for `zh_TW` before any mainland locale.

A **繁/简** chip in the reader switches the displayed script, and the choice is
remembered across stories. It is hidden for stories published without a
Simplified rendering. Switching only changes what is drawn: saved words,
dictionary lookups, and audio all stay keyed to the traditional form, so
flipping the toggle never orphans anything you saved.

Note that the Simplified view is Taiwan Mandarin *written in Simplified
characters*, not mainland Mandarin — 軟體 becomes 软体, not 软件. Only the script
converts; the vocabulary is the same.

## Levels

Stories are graded against **TOCFL** (華語文能力測驗), Taiwan's proficiency test,
rather than the mainland's HSK: Novice 1 and 2 (準備級), then Level 1 (入門級),
Level 2 (基礎級), and Level 3 (進階級). The `level` field is free text, so the
labels can change without a migration.

## Run

```text
flutter pub get
flutter run
```

## Build

```text
flutter build web --release --base-href /Hub/mandarin/
flutter build appbundle
```

Story assets live under `assets/content/`. The local-only Story Workshop creates
and publishes the story JSON, Qwen narration, and library index into this
folder. The GitHub Pages workflow publishes only the built Flutter bundle, never
the local models or workshop.

## Books

A published story may carry a `book` block naming its book and chapter number.
The library groups those chapters into one book card leading to a chapter list
with read progress; stories without one stay standalone. See the workshop's
README for how books are written.

## Dictionary

`assets/dictionary/cedict.json` is [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict),
a community Chinese-English dictionary published by MDBG under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). It powers the
Dictionary tab and the **Dictionary** action when a word is held in the reader.
The attribution is shown in the app, as the licence requires.

Rebuild it from the current upstream release with:

```text
python tool/build_dictionary.py
```

Entries are keyed by **traditional** headword. Two extras come out of the same
build:

* every reading records its simplified form when it differs, which is what the
  Story Workshop reads to convert Traditional to Simplified — no OpenCC
  dependency, one source of truth; and
* `simplifiedIndex` maps a simplified headword to the traditional ones it could
  be, so typing 学习 finds 學習 and a mainland recogniser's Simplified transcript
  still glosses. The value is a list because the mapping is many-to-one: 发 is
  both 發 (fā, to send) and 髮 (fà, hair).

CC-CEDICT also records Taiwan readings where they differ ("Taiwan pr. fǎ"), and
the build renders those in tone marks like any other reading.

The file is about twelve megabytes, so it is decoded once on a background
isolate the first time a lookup happens and then kept in memory.

## Speak

The Speak tab records a phrase and reports three things: the characters the
device recognised, what they mean back in English, and how each syllable's tone
came out.

* **Recognition** uses the platform recogniser through `speech_to_text`, asking
  for `zh_TW` first and falling back through the other Chinese locales the
  device offers. Android may need Chinese (Taiwan) added in the Google app's
  voice settings; iOS can run it on device. A mainland recogniser transcribes
  into Simplified, which still glosses — the dictionary's `simplifiedIndex`
  resolves it — but it also scores Taiwan pronunciation against mainland
  expectations, so Taiwan is preferred wherever it is installed.
* **Meaning** is a word-by-word gloss from the bundled CC-CEDICT everywhere,
  plus a whole-sentence translation where the platform provides one: Google ML
  Kit on Android and iOS (a ~30 MB model downloads on first use, then works
  offline), and the browser's own
  [Translator API](https://developer.chrome.com/docs/ai/translator-api) on the
  web, asked for as `zh-Hant`. The browser API is desktop Chrome and Edge only
  and needs a lot of free disk, so the gloss is what carries the web when it is
  absent. ML Kit ships only one Chinese model with no Traditional variant, so
  Traditional input goes through a Simplified-oriented model there; the gloss is
  what the tab actually relies on. Which engine is used is picked at compile
  time by conditional import, which is also why a mobile-only plugin does not
  break the web build.
* **Tones** come from the microphone, not from the transcript: the recogniser's
  language model will happily "correct" a wrong tone, so the pitch is measured
  separately. `PitchRecorder` runs YIN over the raw PCM, and `ToneAnalyzer`
  splits the pitch track into syllables, normalises it to the speaker's own
  range, and classifies each contour as flat, rising, dipping, or falling.

Tone scoring is deliberately cautious: if the number of voiced syllables does
not match the number of syllables recognised, it says so instead of guessing an
alignment and marking good tones wrong. It is most reliable on slow, clear
speech and is presented as a hint rather than a grade.

Both platforms need permissions: `RECORD_AUDIO` in the Android manifest, and
`NSMicrophoneUsageDescription` plus `NSSpeechRecognitionUsageDescription` in the
iOS `Info.plist`.

On the web the tab works in Chrome and Edge, which are the browsers with the
Web Speech API; Firefox has none and Safari's is partial. The page must be
served over HTTPS (or localhost) for the microphone. Recognition there runs
through the browser vendor's servers rather than on device. If a browser refuses
to give the microphone to both the recogniser and the pitch recorder at once,
the tab keeps the transcript and meaning and says that tones could not be
measured.
