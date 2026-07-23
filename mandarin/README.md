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
