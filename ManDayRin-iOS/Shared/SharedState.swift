import Foundation

/// The bits of the web app's `mandayrinState.v2` that the widget and native reminders need,
/// kept in the App Group so the widget extension can read them.
enum SharedState {
    static let defaultAppGroup = "group.com.cadeward.mandayrin"

    /// Sideloading tools re-sign with their own App Group name (AltStore appends the team ID),
    /// so use the group this build was actually given: AltStore's ALTAppGroups list, then the
    /// provisioning profile's entitlements, then the name in the entitlements file.
    static let appGroup: String = {
        let candidates = (Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] ?? []) + provisionedAppGroups()
        return candidates.first { $0.contains("mandayrin") } ?? candidates.first ?? defaultAppGroup
    }()

    static let defaults = UserDefaults(suiteName: appGroup) ?? .standard

    private static func provisionedAppGroups() -> [String] {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
              let plist = (try? PropertyListSerialization.propertyList(from: data.subdata(in: start.lowerBound..<end.upperBound), format: nil)) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any] else { return [] }
        return entitlements["com.apple.security.application-groups"] as? [String] ?? []
    }

    /// The widget's own start Monday, used only if it can't see the app's (no shared App Group).
    static var widgetStartedOn: String {
        if let saved = defaults.string(forKey: Key.widgetStartedOn) { return saved }
        let calendar = CourseClock.calendar
        let today = calendar.startOfDay(for: Date())
        let monday = calendar.date(byAdding: .day, value: -((calendar.component(.weekday, from: today) + 5) % 7), to: today) ?? today
        let key = CourseClock.key(for: monday)
        defaults.set(key, forKey: Key.widgetStartedOn)
        return key
    }

    private enum Key {
        static let widgetStartedOn = "widgetStartedOn"
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
