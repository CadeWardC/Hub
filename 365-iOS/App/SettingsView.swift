import SwiftUI
import UserNotifications

struct SettingsView: View {
    @EnvironmentObject private var store: Store
    @Environment(\.openURL) private var openURL
    @AppStorage(SharedState.Key.remindersOn, store: SharedState.defaults) private var remindersOn = true
    @AppStorage(SharedState.Key.reminderStart, store: SharedState.defaults) private var start = 8 * 60
    @AppStorage(SharedState.Key.reminderEnd, store: SharedState.defaults) private var end = 22 * 60
    @AppStorage(SharedState.Key.reminderInterval, store: SharedState.defaults) private var interval = 60
    @AppStorage("ghostOn") private var ghostOn = true
    @AppStorage("ghostOpacity") private var ghostOpacity = 0.35
    @State private var permission: UNAuthorizationStatus = .notDetermined

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Remind me until I've taken it", isOn: $remindersOn)
                    if remindersOn {
                        DatePicker("First reminder", selection: time($start), displayedComponents: .hourAndMinute)
                        Picker("Then every", selection: $interval) {
                            Text("15 minutes").tag(15)
                            Text("30 minutes").tag(30)
                            Text("hour").tag(60)
                            Text("2 hours").tag(120)
                        }
                        DatePicker("Last reminder", selection: time($end), displayedComponents: .hourAndMinute)
                    }
                    if permission == .denied {
                        Button("Notifications are off. Turn them on in Settings") {
                            if let url = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(url) }
                        }
                    }
                } header: {
                    Text("Daily photo reminder")
                } footer: {
                    Text("iOS doesn't allow notifications that can't be swiped away, so 365 sends one again every interval and leaves them all, with a badge, until today's photo exists. Taking it clears them.")
                }

                Section("Camera") {
                    Toggle("Show yesterday's photo as a ghost", isOn: $ghostOn)
                    if ghostOn {
                        HStack {
                            Text("Strength")
                            Slider(value: $ghostOpacity, in: 0.1...0.7)
                        }
                    }
                }

                Section {
                    LabeledContent("Photos", value: "\(store.photoDays.count)")
                    LabeledContent("Started", value: store.photoDays.first.map { Day.pretty($0, style: .dateTime.month(.wide).day().year()) } ?? "Not yet")
                } header: {
                    Text("Your photos")
                } footer: {
                    Text("Photos stay on this iPhone, in the Files app under On My iPhone → 365 → Photos. Copy that folder somewhere safe now and then, because deleting the app deletes them.")
                }
            }
            .navigationTitle("Settings")
            .onAppear { Reminders.permission { permission = $0 } }
            .onChange(of: remindersOn) { _, _ in Reminders.reschedule() }
            .onChange(of: start) { _, value in
                if end < value { end = value }
                Reminders.reschedule()
            }
            .onChange(of: end) { _, value in
                if value < start { start = value }
                Reminders.reschedule()
            }
            .onChange(of: interval) { _, _ in Reminders.reschedule() }
        }
    }

    /// Minutes after midnight as a time of day for the picker.
    private func time(_ minutes: Binding<Int>) -> Binding<Date> {
        Binding(
            get: { Calendar.current.date(bySettingHour: minutes.wrappedValue / 60, minute: minutes.wrappedValue % 60, second: 0, of: Date()) ?? Date() },
            set: {
                let parts = Calendar.current.dateComponents([.hour, .minute], from: $0)
                minutes.wrappedValue = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
            }
        )
    }
}
