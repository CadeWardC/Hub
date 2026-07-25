# Mandarin Reader

A Flutter graded-reader app for web, Android, and iOS. It presents levelled
Mandarin stories with optional pinyin and English, vocabulary, per-segment
audio, full-story playback, speed controls, and local reading progress.

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

The file is about ten megabytes, so it is decoded once on a background isolate
the first time a lookup happens and then kept in memory.

## Speak

The Speak tab records a phrase and reports three things: the characters the
device recognised, what they mean back in English, and how each syllable's tone
came out.

* **Recognition** uses the platform recogniser through `speech_to_text`, asking
  for a Mandarin locale (`zh_CN` and friends). Android may need Chinese added in
  the Google app's voice settings; iOS can run it on device.
* **Meaning** is a word-by-word gloss from the bundled CC-CEDICT everywhere,
  plus a whole-sentence translation from Google ML Kit on Android and iOS. ML
  Kit downloads a ~30 MB model on first use and then works offline. The web has
  no on-device translator, so the gloss stands alone there.
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
