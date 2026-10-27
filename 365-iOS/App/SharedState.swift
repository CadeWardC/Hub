import Foundation

/// Calendar days as "yyyy-MM-dd" keys in the device's time zone.
enum Day {
    static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .autoupdatingCurrent
        return calendar
    }()

    private static let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .autoupdatingCurrent
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func key(_ date: Date) -> String { formatter.string(from: date) }

    /// Start of the day a key names.
    static func date(_ key: String) -> Date? {
        formatter.date(from: key).map { calendar.startOfDay(for: $0) }
    }

    static func add(_ days: Int, to key: String) -> String {
        guard let date = date(key), let moved = calendar.date(byAdding: .day, value: days, to: date) else { return key }
        return self.key(moved)
    }

    /// Whole days from `a` to `b` (negative if `b` is earlier).
    static func between(_ a: String, _ b: String) -> Int {
        guard let from = date(a), let to = date(b) else { return 0 }
        return calendar.dateComponents([.day], from: from, to: to).day ?? 0
    }

    static func pretty(_ key: String, style: Date.FormatStyle = .dateTime.weekday(.abbreviated).month(.abbreviated).day()) -> String {
        date(key)?.formatted(style) ?? key
    }
}

/// Photo stats and reminder settings, read by the reminders (outside SwiftUI) and the Settings tab.
enum SharedState {
    static let defaults = UserDefaults.standard

    enum Key {
        static let firstPhotoDay = "firstPhotoDay"
        static let lastPhotoDay = "lastPhotoDay"
        static let remindersOn = "remindersOn"
        static let reminderStart = "reminderStart"
        static let reminderEnd = "reminderEnd"
        static let reminderInterval = "reminderInterval"
    }

    static var firstPhotoDay: String? { defaults.string(forKey: Key.firstPhotoDay) }
    static var lastPhotoDay: String? { defaults.string(forKey: Key.lastPhotoDay) }

    /// Reminder window in minutes after midnight, and minutes between nudges.
    static var remindersOn: Bool { defaults.object(forKey: Key.remindersOn) as? Bool ?? true }
    static var reminderStart: Int { defaults.object(forKey: Key.reminderStart) as? Int ?? 8 * 60 }
    static var reminderEnd: Int { defaults.object(forKey: Key.reminderEnd) as? Int ?? 22 * 60 }
    static var reminderInterval: Int { defaults.object(forKey: Key.reminderInterval) as? Int ?? 60 }

    static func record(first: String?, last: String?) {
        defaults.set(first, forKey: Key.firstPhotoDay)
        defaults.set(last, forKey: Key.lastPhotoDay)
    }

    static func takenOn(_ day: String) -> Bool { lastPhotoDay == day }

    /// Day 1 is the day of the first photo.
    static func dayNumber(on day: String) -> Int {
        guard let first = firstPhotoDay else { return 1 }
        return max(1, Day.between(first, day) + 1)
    }
}
