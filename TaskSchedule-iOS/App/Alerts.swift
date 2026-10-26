import Foundation
import UserNotifications

/// Native local notifications worked out from the snapshot, re-done whenever it changes:
/// events 10 minutes before they start, work sessions when they start, tasks at 9am on their
/// due date, and the end of a running protocol's timed wait.
enum Alerts {
    static let prefix = "ts-"
    static let runPrefix = "ts-run"
    private static let eventLead: TimeInterval = 10 * 60
    private static let dueHour = 9
    /// iOS keeps at most 64 pending notifications per app.
    private static let limit = 60
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

    static func requestPermissionIfNeeded() {
        center.getNotificationSettings { settings in
            if settings.authorizationStatus == .notDetermined { requestPermission { _ in } }
        }
    }

    static func notifyNow(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        center.add(UNNotificationRequest(identifier: "\(prefix)now-\(UUID().uuidString)", content: content, trigger: nil))
    }

    private struct Planned {
        let id: String
        let fire: Date
        let title: String
        let body: String
    }

    private static func planned(_ snap: Snapshot, now: Date) -> [Planned] {
        var list: [Planned] = []
        let today = Day.key(now)

        for ev in snap.events where ev.date >= today && !ev.done {
            guard let start = ev.startDate, start > now else { continue }
            if ev.auto {
                let until = Day.minutes(ev.end) != nil ? ", until \(Day.formatTime(ev.endDate ?? start))" : ""
                list.append(Planned(id: "\(prefix)session-\(ev.id)", fire: start, title: "Work on \(ev.title)",
                                    body: "Work session · \(Day.duration(ev.minutes))\(until)"))
            } else {
                let fire = max(start.addingTimeInterval(-eventLead), now.addingTimeInterval(1))
                let body = fire < start.addingTimeInterval(-60) ? "In 10 minutes · \(ev.timeRange)" : "Now · \(ev.timeRange)"
                list.append(Planned(id: "\(prefix)event-\(ev.id)", fire: fire, title: ev.title, body: body))
            }
        }

        for task in snap.tasks where !task.done {
            guard let due = task.date, due >= today, let day = Day.date(due),
                  let fire = Day.calendar.date(bySettingHour: dueHour, minute: 0, second: 0, of: day), fire > now else { continue }
            list.append(Planned(id: "\(prefix)due-\(task.id)", fire: fire, title: "Due today", body: task.title))
        }

        if let run = snap.run {
            let fire = Date(timeIntervalSince1970: run.waitEnd / 1000)
            if fire > now {
                list.append(Planned(id: runPrefix, fire: fire, title: run.title,
                                    body: run.next.isEmpty ? "Wait finished · protocol complete" : "Wait finished · Next: \(run.next)"))
            }
        }
        return Array(list.sorted { $0.fire < $1.fire }.prefix(limit))
    }

    static func reschedule() {
        let snap = SharedState.snapshot
        center.getPendingNotificationRequests { pending in
            center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
            for item in planned(snap, now: Date()) {
                let content = UNMutableNotificationContent()
                content.title = item.title
                content.body = item.body
                content.sound = .default
                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, item.fire.timeIntervalSinceNow), repeats: false)
                center.add(UNNotificationRequest(identifier: item.id, content: content, trigger: trigger))
            }
        }
    }
}
