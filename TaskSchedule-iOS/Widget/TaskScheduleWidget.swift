import AppIntents
import SwiftUI
import WidgetKit

/// Ticks a task or work session off (or back on) from a widget. The widget redraws straight away;
/// the app applies the tick to its data (and syncs it) the next time it opens.
struct ToggleItemIntent: AppIntent {
    static var title: LocalizedStringResource = "Tick off"
    static var isDiscoverable = false

    @Parameter(title: "Kind") var kind: String
    @Parameter(title: "ID") var id: String
    @Parameter(title: "Done") var done: Bool

    init() {}

    init(kind: String, id: String, done: Bool) {
        self.kind = kind
        self.id = id
        self.done = done
    }

    func perform() async throws -> some IntentResult {
        SharedState.tick(kind: kind, id: id, done: done)
        return .result()
    }
}

// MARK: timeline

struct AgendaEntry: TimelineEntry {
    let date: Date
    let agenda: Agenda
    let ready: Bool

    static var sample: AgendaEntry {
        let today = Day.key(.now)
        let snap = Snapshot(
            tasks: [
                .init(id: "a", title: "Send the report", date: today, planned: today, done: false),
                .init(id: "b", title: "Book dentist", date: nil, planned: today, done: false),
                .init(id: "c", title: "Water plants", date: nil, planned: today, done: true)
            ],
            events: [
                .init(id: "e", title: "Team meeting", date: today, start: "23:00", end: "23:30", auto: false, done: false)
            ],
            run: nil)
        return AgendaEntry(date: .now, agenda: Agenda(now: .now, snapshot: snap), ready: true)
    }
}

struct AgendaProvider: TimelineProvider {
    func placeholder(in context: Context) -> AgendaEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (AgendaEntry) -> Void) {
        completion(context.isPreview && !SharedState.hasSnapshot ? .sample : Self.entry(at: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AgendaEntry>) -> Void) {
        let now = Date()
        let first = Self.entry(at: now)
        let entries = [first] + first.agenda.changes.map { Self.entry(at: $0) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }

    static func entry(at date: Date) -> AgendaEntry {
        AgendaEntry(date: date, agenda: Agenda(now: date, snapshot: SharedState.snapshot), ready: SharedState.hasSnapshot)
    }
}

// MARK: pieces

enum Palette {
    static let accent = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 106 / 255, green: 155 / 255, blue: 1, alpha: 1) : UIColor(red: 59 / 255, green: 124 / 255, blue: 1, alpha: 1) })
    static let surface = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 25 / 255, green: 31 / 255, blue: 38 / 255, alpha: 1) : .white })
    static let danger = Color(red: 217 / 255, green: 74 / 255, blue: 61 / 255)
    static let done = Color(red: 47 / 255, green: 166 / 255, blue: 106 / 255)
}

/// A task row with a tappable tick box.
struct TaskRow: View {
    let task: Snapshot.Task
    let overdue: Bool
    var font: Font = .system(size: 13)

    var body: some View {
        Button(intent: ToggleItemIntent(kind: "task", id: task.id, done: !task.done)) {
            HStack(spacing: 6) {
                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(task.done ? Palette.done : overdue ? Palette.danger : Palette.accent)
                    .widgetAccentable()
                Text(task.title)
                    .font(font)
                    .strikethrough(task.done)
                    .foregroundStyle(task.done ? .secondary : .primary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// An event row: time on the left, title on the right. Work sessions can be ticked off.
struct EventRow: View {
    let event: Snapshot.Event
    let agenda: Agenda

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            if event.auto {
                Button(intent: ToggleItemIntent(kind: "session", id: event.id, done: !event.done)) {
                    Image(systemName: event.done ? "checkmark.square.fill" : "square.dashed")
                        .foregroundStyle(event.done ? Palette.done : Palette.accent)
                }
                .buttonStyle(.plain)
            } else {
                RoundedRectangle(cornerRadius: 1.5).fill(Palette.accent).frame(width: 3, height: 11)
            }
            Text(agenda.when(event))
                .font(.system(size: 11, weight: .semibold).monospacedDigit())
                .foregroundStyle(.secondary)
            Text(event.displayTitle)
                .font(.system(size: 13, weight: .medium))
                .strikethrough(event.done)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
    }
}

struct Header: View {
    let date: Date
    let trailing: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(date.formatted(.dateTime.weekday(.wide)).uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Palette.accent)
            Text(date.formatted(.dateTime.day()))
                .font(.system(size: 11, weight: .bold))
            Spacer(minLength: 0)
            Text(trailing)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }
}

private func tasksLeft(_ n: Int) -> String { n == 0 ? "All done" : "\(n) task\(n == 1 ? "" : "s") left" }

private struct NotReady: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Task & Schedule").font(.headline)
            Text("Open the app once to show your day here.").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: Today widget (agenda: next event + tasks)

struct TodayView: View {
    @Environment(\.widgetFamily) private var family
    let entry: AgendaEntry

    private var agenda: Agenda { entry.agenda }

    var body: some View {
        content.containerBackground(for: .widget) {
            switch family {
            case .accessoryCircular, .accessoryInline, .accessoryRectangular: Color.clear
            default: Palette.surface
            }
        }
    }

    @ViewBuilder private var content: some View {
        if !entry.ready {
            switch family {
            case .accessoryInline: Text("Open Task & Schedule")
            case .accessoryCircular: ZStack { AccessoryWidgetBackground(); Image(systemName: "checkmark") }
            default: NotReady()
            }
        } else {
            switch family {
            case .accessoryInline: inline
            case .accessoryCircular: circular
            case .accessoryRectangular: rectangular
            case .systemSmall: small
            case .systemMedium: medium
            default: large
            }
        }
    }

    @ViewBuilder private var inline: some View {
        if let next = agenda.next {
            Text("\(agenda.when(next)) \(next.displayTitle)")
        } else {
            Text(tasksLeft(agenda.openTasks.count))
        }
    }

    private var circular: some View {
        let total = agenda.tasks.count
        let done = total - agenda.openTasks.count
        return Gauge(value: Double(done), in: 0...Double(max(total, 1))) {
            Image(systemName: "checkmark")
        } currentValueLabel: {
            Text("\(agenda.openTasks.count)")
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetAccentable()
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            if let next = agenda.next {
                Text(agenda.when(next))
                    .font(.system(size: 12, weight: .semibold))
                    .widgetAccentable()
                Text(next.displayTitle)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(1)
            } else {
                Text("Nothing scheduled")
                    .font(.system(size: 13, weight: .semibold))
                    .widgetAccentable()
            }
            Text(agenda.openTasks.first.map { "☐ \($0.title)" } ?? tasksLeft(0))
                .font(.system(size: 12))
                .lineLimit(1)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            Header(date: entry.date, trailing: "")
            if let next = agenda.next {
                Text(agenda.when(next))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                Text(next.displayTitle)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(2)
            } else {
                Text("Nothing scheduled")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if let task = agenda.openTasks.first {
                TaskRow(task: task, overdue: agenda.isOverdue(task), font: .system(size: 12))
            }
            Text(tasksLeft(agenda.openTasks.count))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }

    private var medium: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Header(date: entry.date, trailing: "")
                schedule(limit: 3)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 5) {
                Text(tasksLeft(agenda.openTasks.count))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                taskList(limit: 4)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var large: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(date: entry.date, trailing: tasksLeft(agenda.openTasks.count))
            Text("SCHEDULE").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).padding(.top, 2)
            schedule(limit: 5)
            Text("TODAY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).padding(.top, 4)
            taskList(limit: 7)
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder private func schedule(limit: Int) -> some View {
        let events = agenda.remainingToday
        if events.isEmpty {
            if let next = agenda.next {
                Text("Next: \(agenda.when(next)) · \(next.displayTitle)")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            } else {
                Text("Nothing else today").font(.system(size: 12)).foregroundStyle(.secondary)
            }
        } else {
            ForEach(events.prefix(limit)) { EventRow(event: $0, agenda: agenda) }
            if events.count > limit {
                Text("+\(events.count - limit) more").font(.system(size: 11)).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder private func taskList(limit: Int) -> some View {
        let tasks = agenda.tasks
        if tasks.isEmpty {
            Text("No tasks today").font(.system(size: 12)).foregroundStyle(.secondary)
        } else {
            ForEach(tasks.prefix(limit)) { TaskRow(task: $0, overdue: agenda.isOverdue($0)) }
            if tasks.count > limit {
                Text("+\(tasks.count - limit) more").font(.system(size: 11)).foregroundStyle(.secondary)
            }
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TaskScheduleToday", provider: AgendaProvider()) { TodayView(entry: $0) }
            .configurationDisplayName("Today")
            .description("What's next on your schedule and today's tasks. Tap a circle to tick a task off.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline, .accessoryCircular])
    }
}

// MARK: Tasks widget (checklist)

struct TasksView: View {
    @Environment(\.widgetFamily) private var family
    let entry: AgendaEntry

    private var agenda: Agenda { entry.agenda }

    var body: some View {
        content.containerBackground(for: .widget) {
            if family == .accessoryRectangular { Color.clear } else { Palette.surface }
        }
    }

    private var limit: Int {
        switch family {
        case .accessoryRectangular: return 3
        case .systemSmall: return 4
        case .systemMedium: return 4
        default: return 10
        }
    }

    @ViewBuilder private var content: some View {
        if !entry.ready {
            NotReady()
        } else if family == .accessoryRectangular {
            VStack(alignment: .leading, spacing: 1) {
                let open = agenda.openTasks
                if open.isEmpty {
                    Text("All done").font(.system(size: 14, weight: .semibold)).widgetAccentable()
                    Text("Nothing left today").font(.system(size: 12)).foregroundStyle(.secondary)
                } else {
                    ForEach(open.prefix(limit)) { TaskRow(task: $0, overdue: agenda.isOverdue($0), font: .system(size: 13, weight: .medium)) }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            VStack(alignment: .leading, spacing: family == .systemLarge ? 7 : 5) {
                Header(date: entry.date, trailing: tasksLeft(agenda.openTasks.count))
                let tasks = agenda.tasks
                if tasks.isEmpty {
                    Spacer(minLength: 0)
                    Text("No tasks today").font(.system(size: 13)).foregroundStyle(.secondary)
                } else {
                    ForEach(tasks.prefix(limit)) {
                        TaskRow(task: $0, overdue: agenda.isOverdue($0), font: .system(size: family == .systemLarge ? 15 : 13))
                    }
                    if tasks.count > limit {
                        Text("+\(tasks.count - limit) more").font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }
}

struct TasksWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TaskScheduleTasks", provider: AgendaProvider()) { TasksView(entry: $0) }
            .configurationDisplayName("Today's tasks")
            .description("Your Today list and anything due. Tap a circle to tick a task off.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    }
}

@main
struct TaskScheduleWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        TasksWidget()
    }
}
