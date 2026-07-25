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
