# 365 for iOS

A native SwiftUI app for tracking hair growth with one photo a day for a year.

- **Today**: Day N of 365, photo count and streak, a big "Take today's photo" button, a checklist of what you're taking (tick what you took today) and a note for the day.
- **Camera** (`CameraScreen.swift`): front or back camera in a 3:4 frame with a thirds grid and the previous photo laid over the preview as an adjustable ghost, so every photo lines up. Retake / Use photo, or pick one from the library (handy for filling in a missed day).
- **Photos** (`HistoryView.swift`): every day since the first photo; tap one to see it with what you were taking that day and its note, retake, share or delete it. Compare puts two days under a drag-to-wipe divider; Timelapse flips through every photo.
- **Taking** (`RegimenView.swift`): what you take for your hair (name, dose, how often, start date, optional last day, notes), split into Taking now and Stopped.
- **Reminders** (`Reminders.swift`): iOS has no notifications that can't be dismissed, so from the first reminder time a notification fires again every interval (15 min to 2 h, until the last reminder time) and none are cleared until today's photo exists, with a badge on the icon. Taking the photo cancels the rest of today's, removes the delivered ones and clears the badge. Tapping one (or its Take photo button) opens the camera. They're scheduled as many days ahead as iOS's 64-notification limit allows and re-planned every time the app opens.

Data stays on the device: `Documents/journal.json` (regimen, ticks, notes) and `Documents/Photos/<day>_<time>.jpg` (1600 px JPEGs), visible in Files → On My iPhone → 365. Deleting the app deletes them.

## Building

`.github/workflows/365-ios.yml` builds on a macOS runner whenever `365-iOS/` changes on `main` (or by hand from the Actions tab): `xcodegen generate` makes `ThreeSixtyFive.xcodeproj` from `project.yml`, `xcodebuild` builds it unsigned, and the ad-hoc signed app is zipped into `365.ipa`, uploaded as the run's `365-ipa` artifact and to the `365-ios` GitHub release.

To build locally on a Mac: `xcodegen generate && open ThreeSixtyFive.xcodeproj`, then pick your team.

## Installing

The IPA is unsigned, so install it with AltStore, SideStore or Sideloadly (they re-sign it with your Apple ID; a free account needs re-signing every 7 days). Allow notifications and the camera on first launch.
