import Foundation
import UserNotifications

/// The daily nag. iOS has no truly persistent notifications, so from the start of the reminder
/// window a notification repeats every interval until today's photo exists. They are never
/// cleared until then, so they pile up in Notification Center with a badge on the icon; taking
/// the photo removes today's remaining ones, the delivered ones and the badge.
enum Reminders {
    static let prefix = "365-"
    static let category = "daily-photo"
    static let takeAction = "take-photo"
    /// iOS keeps at most 64 pending notifications per app.
    private static let limit = 60
    private static var center: UNUserNotificationCenter { .current() }

    static func registerCategory() {
        let take = UNNotificationAction(identifier: takeAction, title: "Take photo", options: [.foreground])
        center.setNotificationCategories([UNNotificationCategory(identifier: category, actions: [take], intentIdentifiers: [])])
    }

    static func requestPermissionIfNeeded() {
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in reschedule() }
        }
    }

    static func permission(_ done: @escaping (UNAuthorizationStatus) -> Void) {
        center.getNotificationSettings { settings in
            DispatchQueue.main.async { done(settings.authorizationStatus) }
        }
    }

    /// Re-plans every pending reminder, as many days ahead as the 64-notification budget allows.
    static func reschedule() {
        center.getPendingNotificationRequests { pending in
            center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
            guard SharedState.remindersOn else { return }

            let now = Date()
            let today = Day.key(now)
            let start = SharedState.reminderStart
            let end = max(SharedState.reminderEnd, start)
            let step = max(SharedState.reminderInterval, 5)
            var count = 0

            days: for offset in 0..<30 {
                let dayKey = Day.add(offset, to: today)
                if offset == 0 && SharedState.takenOn(today) { continue }
                guard let midnight = Day.date(dayKey) else { continue }
                let number = SharedState.firstPhotoDay == nil ? 1 : SharedState.dayNumber(on: dayKey)

                for minute in stride(from: start, through: end, by: step) {
                    guard let fire = Day.calendar.date(byAdding: .minute, value: minute, to: midnight), fire > now else { continue }
                    let content = UNMutableNotificationContent()
                    content.title = "Day \(number) photo"
                    content.body = minute == start
                        ? "Time for today's picture. These reminders keep coming until you take it."
                        : "Still no photo today. Take it to clear these reminders."
                    content.sound = .default
                    content.badge = 1
                    content.categoryIdentifier = category
                    content.threadIdentifier = prefix + dayKey
                    content.userInfo = ["day": dayKey]
                    let components = Day.calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                    center.add(UNNotificationRequest(identifier: "\(prefix)\(dayKey)-\(minute)", content: content, trigger: trigger))
                    count += 1
                    if count >= limit { break days }
                }
            }
        }
    }

    /// Removes the reminders already on screen and the badge (today's photo is done).
    static func clearDelivered() {
        center.getDeliveredNotifications { delivered in
            center.removeDeliveredNotifications(withIdentifiers: delivered.map(\.request.identifier).filter { $0.hasPrefix(prefix) })
        }
        center.setBadgeCount(0) { _ in }
    }
}
