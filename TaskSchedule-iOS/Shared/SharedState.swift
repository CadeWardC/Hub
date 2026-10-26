import Foundation

/// The snapshot of tasks and events (written by the app, read by the widgets) and the ticks made on
/// widgets that the app still has to apply to the web app's data, kept in the App Group.
enum SharedState {
    static let defaultAppGroup = "group.com.cadeward.taskschedule"

    /// Sideloading tools re-sign with their own App Group name (AltStore appends the team ID),
    /// so use the group this build was actually given: AltStore's ALTAppGroups list, then the
    /// provisioning profile's entitlements, then the name in the entitlements file.
    static let appGroup: String = {
        let candidates = (Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] ?? []) + provisionedAppGroups()
        return candidates.first { $0.contains("taskschedule") } ?? candidates.first ?? defaultAppGroup
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

    private enum Key {
        static let snapshot = "snapshot"
        static let pending = "pendingTicks"
    }

    static var hasSnapshot: Bool { defaults.data(forKey: Key.snapshot) != nil }

    static var snapshot: Snapshot {
        get {
            guard let data = defaults.data(forKey: Key.snapshot) else { return .empty }
            return (try? JSONDecoder().decode(Snapshot.self, from: data)) ?? .empty
        }
        set { defaults.set(try? JSONEncoder().encode(newValue), forKey: Key.snapshot) }
    }

    /// Stores the snapshot JSON the page posted; says whether it changed.
    @discardableResult
    static func save(json: String) -> Bool {
        let data = Data(json.utf8)
        guard (try? JSONDecoder().decode(Snapshot.self, from: data)) != nil, data != defaults.data(forKey: Key.snapshot) else { return false }
        defaults.set(data, forKey: Key.snapshot)
        return true
    }

    /// Widget ticks waiting for the app, as "task|<id>|1" / "session|<id>|0" (1 = done).
    static var pendingTicks: [String] {
        get { defaults.stringArray(forKey: Key.pending) ?? [] }
        set { defaults.set(newValue, forKey: Key.pending) }
    }

    /// Ticks a task or work session off (or back on) from a widget: the snapshot changes at once so the
    /// widget redraws, and the app applies it to its own data next time it's opened.
    static func tick(kind: String, id: String, done: Bool) {
        var snap = snapshot
        if kind == "task", let i = snap.tasks.firstIndex(where: { $0.id == id }) {
            snap.tasks[i].done = done
        } else if kind == "session", let i = snap.events.firstIndex(where: { $0.id == id }) {
            snap.events[i].done = done
        } else {
            return
        }
        snapshot = snap
        // A later tick of the same item replaces an earlier one.
        pendingTicks = pendingTicks.filter { !$0.hasPrefix("\(kind)|\(id)|") } + ["\(kind)|\(id)|\(done ? 1 : 0)"]
    }
}
