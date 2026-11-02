# ToneTalk for iOS

Speak Mandarin to your phone. It works out what you said, checks the tone of every syllable, and answers out loud.

- **Talk**: a spoken conversation with a tutor from DeepSeek or Kimi, with corrections in English.
- **Practice**: say a target phrase, see each tone graded, and compare your recording with the model voice.
- **Hands-free**: Talk runs as a continuous conversation, and Practice as a listen-repeat-feedback drill. Say 停止 to stop, or 再说一遍 to hear the last reply again.

## How it works

DeepSeek and Kimi only handle text, so the audio work happens on the phone:

- **Recognition** (`App/Listener.swift`): Apple's Speech framework in `zh-CN`, on-device where supported, with silence detection to end each utterance.
- **Tones** (`ToneKit/`): no API, just signal processing. A YIN pitch tracker measures the voice, each syllable's curve is normalized to the speaker's own range and compared with the four tone shapes. Expected tones come from pinyin, with sandhi applied (3+3, 不, 一). A syllable it cannot measure is shown as unclear, never as wrong. The neutral tone is not graded.
- **Playback** (`App/Speaker.swift`): the device's Chinese voice, which also plays with the silent switch on. Download an Enhanced Chinese voice under Settings > Accessibility > Spoken Content > Voices for better audio; the app picks it up automatically.
- **Tutor** (`App/Tutor.swift`): the OpenAI-compatible API of the service you choose.

The recognizer tends to "correct" what it hears towards real words, so a wrong tone can come back as the right word. The tone check measures your actual pitch, so it still catches that. Character timing is split evenly within a recognized word, which makes grading less exact in fast speech. Practice is the most reliable way to check tones.

## API keys

Paste your key into Settings. It is kept in this phone's Keychain. This repository and its releases are public, so a key must never be added to the source.

## Building

`.github/workflows/tonetalk-ios.yml` runs on a macOS runner whenever `ToneTalk-iOS/` changes on `main`, or by hand from the Actions tab:

1. `swift test` runs the `ToneKit` tests, which grade synthesized voices. A failure stops the release.
2. `xcodegen generate` makes `ToneTalk.xcodeproj` from `project.yml`.
3. `xcodebuild` builds unsigned, and the app is ad-hoc signed and zipped into `ToneTalk.ipa`.

The IPA goes to the run's `ToneTalk-ipa` artifact and to the `tonetalk-ios` GitHub release.

To build on a Mac: `xcodegen generate && open ToneTalk.xcodeproj`, then pick your team.

## Installing

The IPA is unsigned, so install it with AltStore, SideStore or Sideloadly (a free Apple ID needs re-signing every 7 days). Allow the microphone and speech recognition on first use. If recognition is unavailable, add Mandarin under Settings > General > Keyboard > Dictation.
