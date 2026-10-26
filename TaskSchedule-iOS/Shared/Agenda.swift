import Foundation

/// The slim copy of the web app's `taskschedule.v1` (and running protocol) that the bridge posts on every save:
/// tasks, events from yesterday on, and the timed wait in progress, if any.
struct Snapshot: Codable {
    struct Task: Codable, Identifiable {
        let id: String
        let title: String
        /// Due date "YYYY-MM-DD".
        let date: String?
        /// The day it was put on the Today list.
        let planned: String?
        var done: Bool
    }

    struct Event: Codable, Identifiable {
        let id: String
        let title: String
        let date: String
        /// "HH:MM"; `end` may be empty.
        let start: String
        let end: String
        /// A planned work session for a task.
        let auto: Bool
        var done: Bool
    }

    struct Run: Codable {
        let title: String
        /// When the current timed wait finishes (ms since 1970).
        let waitEnd: Double
        /// The step after the wait ("" when the protocol ends with it).
        let next: String
    }

    var tasks: [Task]
    var events: [Event]
    var run: Run?

    static let empty = Snapshot(tasks: [], events: [], run: nil)
}

/// Same day maths as app.js (`toKey`, `inToday`, `upcoming`).
enum Day {
    static var calendar: Calendar { Calendar.current }

    static func key(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func date(_ key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func minutes(_ time: String) -> Int? {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        return parts.count == 2 ? parts[0] * 60 + parts[1] : nil
    }

    /// The moment `time` ("HH:MM") happens on day `key`.
    static func at(_ key: String, _ time: String) -> Date? {
        guard let day = date(key), let m = minutes(time) else { return nil }
        return calendar.date(byAdding: .minute, value: m, to: day)
    }

    static func formatTime(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }

    static func duration(_ minutes: Int) -> String {
        minutes >= 60 ? "\(minutes / 60)h" + (minutes % 60 > 0 ? " \(minutes % 60)m" : "") : "\(minutes)m"
    }
}

extension Snapshot.Event {
    var startDate: Date? { Day.at(date, start) }
    /// Events without an end time count as half an hour long.
    var endDate: Date? { Day.at(date, end) ?? startDate?.addingTimeInterval(30 * 60) }

    var minutes: Int {
        guard let s = Day.minutes(start), let e = Day.minutes(end), e > s else { return 0 }
        return e - s
    }

    /// Sessions read "Task · 1h 30m", like the app's timeline.
    var displayTitle: String { auto && minutes > 0 ? "\(title) · \(Day.duration(minutes))" : title }

    var timeRange: String {
        guard let s = startDate else { return "" }
        guard Day.minutes(end) != nil, let e = endDate else { return Day.formatTime(s) }
        return "\(Day.formatTime(s))–\(Day.formatTime(e))"
    }
}

/// What the widgets show at a given moment.
struct Agenda {
    let now: Date
    let snapshot: Snapshot

    private var today: String { Day.key(now) }

    /// The Today list (planned for today, or earlier and not done), plus anything due today or overdue.
    /// Open tasks first: overdue, then by due date, then title.
    var tasks: [Snapshot.Task] {
        let list = snapshot.tasks.filter { t in
            let planned = t.planned.map { $0 == today || ($0 < today && !t.done) } ?? false
            let due = t.date.map { $0 == today || ($0 < today && !t.done) } ?? false
            return planned || due
        }
        return list.sorted { a, b in
            if a.done != b.done { return !a.done }
            let da = a.date ?? "9999", db = b.date ?? "9999"
            return da != db ? da < db : a.title.localizedCompare(b.title) == .orderedAscending
        }
    }

    var openTasks: [Snapshot.Task] { tasks.filter { !$0.done } }

    func isOverdue(_ task: Snapshot.Task) -> Bool { !task.done && (task.date.map { $0 < today } ?? false) }

    /// Today's events that haven't ended yet, by start time.
    var remainingToday: [Snapshot.Event] {
        snapshot.events
            .filter { $0.date == today && ($0.endDate ?? now) > now }
            .sorted { $0.start < $1.start }
    }

    /// The next event that hasn't ended, looking up to a week ahead.
    var next: Snapshot.Event? {
        let limit = Day.key(Day.calendar.date(byAdding: .day, value: 7, to: now) ?? now)
        return snapshot.events
            .filter { $0.date >= today && $0.date <= limit && ($0.endDate ?? now) > now && !($0.auto && $0.done) }
            .min { ($0.date, $0.start) < ($1.date, $1.start) }
    }

    /// "Now", "Today 2:30pm", "Tomorrow", or "Fri 9:00am" for an event.
    func when(_ event: Snapshot.Event) -> String {
        guard let start = event.startDate else { return "" }
        if start <= now { return "Now" }
        let time = Day.formatTime(start)
        if event.date == today { return time }
        if Day.calendar.isDateInTomorrow(start) { return "Tomorrow \(time)" }
        return start.formatted(.dateTime.weekday(.abbreviated)) + " \(time)"
    }

    /// Moments the widgets should redraw: every event start/end in the next day, plus midnight.
    var changes: [Date] {
        let end = now.addingTimeInterval(24 * 3600)
        var dates = snapshot.events.flatMap { [$0.startDate, $0.endDate] }.compactMap { $0 }.filter { $0 > now && $0 < end }
        if let midnight = Day.calendar.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) {
            dates.append(midnight)
        }
        return Array(Set(dates)).sorted()
    }
}
