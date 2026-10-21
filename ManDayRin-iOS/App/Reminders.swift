import Foundation
import UserNotifications

/// Native daily reminders. The web app's Reminder tab still owns the settings; they reach here through
/// SharedState, and the next 30 days are scheduled as local notifications (re-done on every launch).
enum Reminders {
    private static let prefix = "mandayrin-day-"
    private static let daysAhead = 30
    private static var center: UNUserNotificationCenter { .current() }

    static func permission(_ done: @escaping (String) -> Void) {
        center.getNotificationSettings { settings in
            let value: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: value = "granted"
            case .denied: value = "denied"
            default: value = "default"
            }
            DispatchQueue.main.async { done(value) }
        }
    }

    static func requestPermission(_ done: @escaping (String) -> Void) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
            permission(done)
            reschedule()
        }
    }

    static func notifyNow(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        center.add(UNNotificationRequest(identifier: "mandayrin-test-\(UUID().uuidString)", content: content, trigger: nil))
    }

    static func reschedule() {
        center.getPendingNotificationRequests { pending in
            center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
            guard SharedState.reminderEnabled,
                  let course = Course.shared,
                  let startKey = SharedState.startedOn,
                  let start = CourseClock.date(fromKey: startKey) else { return }
            let parts = SharedState.reminderTime.split(separator: ":").compactMap { Int($0) }
            guard parts.count == 2 else { return }

            let calendar = CourseClock.calendar
            let now = Date()
            let today = calendar.startOfDay(for: now)
            for offset in 0..<daysAhead {
                guard let day = calendar.date(byAdding: .day, value: offset, to: today),
                      let fire = calendar.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: day),
                      fire > now else { continue }
                let dayKey = CourseClock.key(for: day)
                if dayKey == SharedState.lastNotified { continue }

                // Same wording as app.js showReminderNotification().
                let week = CourseClock.weekNumber(start: start, at: fire, totalWeeks: course.totalWeeks)
                let theme = course.theme(week)
                let content = UNMutableNotificationContent()
                content.title = calendar.component(.weekday, from: fire) == 2 ? "A new word list is ready" : "Time for your Mandarin"
                content.body = "Week \(week) · \(theme.hanzi) \(theme.english) — your list and scenarios are waiting."
                content.sound = .default
                let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                center.add(UNNotificationRequest(identifier: prefix + dayKey, content: content, trigger: trigger))
            }
        }
    }
}
