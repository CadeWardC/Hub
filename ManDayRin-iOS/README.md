# ManDayRin for iOS

A native iPhone/iPad wrapper around the `ManDayRin/` web app, plus a Lock Screen widget.

- **App** (`App/`): a `WKWebView` serving a copy of `ManDayRin/` from the app bundle at `mandayrin://localhost/`, so everything (all 52 weeks and every audio pack) works offline. An injected bridge replaces the web Notification API with native notifications: the Reminder tab's settings are mirrored to the App Group and the next 30 days of reminders are scheduled as local notifications (re-scheduled on every launch). Audio uses the `.playback` session, so it plays with the silent switch on.
- **Widget** (`Widget/`): Lock Screen rectangular, inline and circular widgets plus a small Home Screen widget showing a word from the current week's list (hanzi, pinyin, English). It moves to the next word every hour and switches to the new list on Monday. It reads the course start date that the app saves in the App Group `group.com.cadeward.mandayrin`, so open the app once first.
- **Shared** (`Shared/`): course data (`build/course.json`, made from `ManDayRin/weeks.js`) and the week maths, matching `app.js`.

## Building

`.github/workflows/mandayrin-ios.yml` builds on a macOS runner whenever `ManDayRin/` or `ManDayRin-iOS/` changes on `main` (or by hand from the Actions tab):

1. `scripts/prepare.sh` copies the web app into `build/web` and writes `build/course.json`.
2. `xcodegen generate` makes `ManDayRin.xcodeproj` from `project.yml`.
3. `xcodebuild` builds unsigned; the app and widget get ad-hoc signatures carrying the App Group entitlement and are zipped into `ManDayRin.ipa`.

The IPA is uploaded as the run's `ManDayRin-ipa` artifact and to the `mandayrin-ios` GitHub release.

To build locally on a Mac: `bash scripts/prepare.sh && xcodegen generate && open ManDayRin.xcodeproj`, then pick your team for both targets.

## Installing

The IPA is unsigned, so install it with AltStore, SideStore or Sideloadly (they re-sign it with your Apple ID; a free account needs re-signing every 7 days). Then long-press the Lock Screen → Customize → Lock Screen → add the ManDayRin widget.
