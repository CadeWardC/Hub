# Task & Schedule for iOS

A native iPhone/iPad wrapper around the `TaskSchedule/` web app, with Home Screen and Lock Screen widgets and native notifications.

- **App** (`App/`): a `WKWebView` serving a copy of `TaskSchedule/` from the app bundle at `taskschedule://localhost/`, so it works offline. An injected bridge:
  - posts a slim snapshot (tasks, events from yesterday on, the running protocol's timed wait) to native code after every save of `taskschedule.v1` / `taskschedule.run`, stored in the App Group `group.com.cadeward.taskschedule`;
  - sends Directus sync requests through `URLSession` (the `taskschedule://` origin isn't one Directus's CORS would allow);
  - stands in for `Notification`, `navigator.vibrate` (haptic) and `alert` / `confirm` / `prompt`, and hides the service worker and install button;
  - applies ticks made on the widgets through the page's own data (`window.TS`), so they sync like any other change.
- **Notifications** (`App/Alerts.swift`): rescheduled from the snapshot whenever it changes: events 10 minutes before they start, work sessions when they start, open tasks at 9am on their due date, and the end of a protocol's timed wait (so it alerts even when the app is closed). At most 60 are pending at once (iOS allows 64), earliest first. Permission is asked on first launch.
- **Widgets** (`Widget/`):
  - **Today**: small / medium / large Home Screen widgets with what's next and today's tasks; Lock Screen rectangular (next event + first open task), inline (next event or tasks left) and circular (tasks-done gauge).
  - **Today's tasks**: small / medium / large checklist plus a Lock Screen rectangular one with three tasks.
  - Tap a task's circle (or a work session's box) to tick it off. The widget updates at once; the app applies it the next time it opens.
- **Shared** (`Shared/`): the snapshot model, App Group storage and the same day maths as `app.js`.

## Building

`.github/workflows/taskschedule-ios.yml` builds on a macOS runner whenever `TaskSchedule/` or `TaskSchedule-iOS/` changes on `main` (or by hand from the Actions tab):

1. `scripts/prepare.sh` copies the web app into `build/web`.
2. `xcodegen generate` makes `TaskSchedule.xcodeproj` from `project.yml`.
3. `xcodebuild` builds unsigned; the app and widget get ad-hoc signatures carrying the App Group entitlement and are zipped into `TaskSchedule.ipa`.

The IPA is uploaded as the run's `TaskSchedule-ipa` artifact and to the `taskschedule-ios` GitHub release.

To build locally on a Mac: `bash scripts/prepare.sh && xcodegen generate && open TaskSchedule.xcodeproj`, then pick your team for both targets.

## Installing

The IPA is unsigned, so install it with AltStore, SideStore or Sideloadly (they re-sign it with your Apple ID; a free account needs re-signing every 7 days). Open the app once (and allow notifications), then add widgets: long-press the Home Screen → Edit → Add Widget → Task & Schedule, or long-press the Lock Screen → Customize → Lock Screen.

Data lives in the app's own web storage, separate from the Safari / Home Screen web app; turn on sync (cloud button) to share it between them.
