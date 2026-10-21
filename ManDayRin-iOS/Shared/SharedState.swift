import Foundation

/// The bits of the web app's `mandayrinState.v2` that the widget and native reminders need,
/// kept in the App Group so the widget extension can read them.
enum SharedState {
    static let appGroup = "group.com.cadeward.mandayrin"
    static let defaults = UserDefaults(suiteName: appGroup) ?? .standard

    private enum Key {
        static let startedOn = "startedOn"
        static let reminderEnabled = "reminderEnabled"
        static let reminderTime = "reminderTime"
        static let lastNotified = "lastNotified"
    }

    static var startedOn: String? { defaults.string(forKey: Key.startedOn) }
    static var reminderEnabled: Bool { defaults.bool(forKey: Key.reminderEnabled) }
    static var reminderTime: String { defaults.string(forKey: Key.reminderTime) ?? "09:00" }
    static var lastNotified: String { defaults.string(forKey: Key.lastNotified) ?? "" }

    struct Change {
        var startChanged = false
        var reminderChanged = false
    }

    /// Stores the web app's saved state JSON and says what changed.
    static func save(json: String) -> Change {
        guard let data = json.data(using: .utf8),
              let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return Change() }
        var change = Change()
        if let start = object["startedOn"] as? String, start != startedOn {
            defaults.set(start, forKey: Key.startedOn)
            change.startChanged = true
        }
        if let reminder = object["reminder"] as? [String: Any] {
            let enabled = reminder["enabled"] as? Bool ?? false
            let time = reminder["time"] as? String ?? "09:00"
            let last = reminder["lastNotified"] as? String ?? ""
            if enabled != reminderEnabled || time != reminderTime || last != lastNotified {
                defaults.set(enabled, forKey: Key.reminderEnabled)
                defaults.set(time, forKey: Key.reminderTime)
                defaults.set(last, forKey: Key.lastNotified)
                change.reminderChanged = true
            }
        }
        return change
    }
}
