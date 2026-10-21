import AppIntents
import SwiftUI
import WidgetKit

/// Tapping the widget's left/right half steps through this week's words; WidgetKit reloads the timeline after it runs.
struct ShiftWordIntent: AppIntent {
    static var title: LocalizedStringResource = "Change word"
    static var isDiscoverable = false

    @Parameter(title: "Step") var step: Int

    init() {}

    init(step: Int) {
        self.step = step
    }

    func perform() async throws -> some IntentResult {
        SharedState.wordOffset += step
        return .result()
    }
}

/// Clear tap areas laid over the widget: left half goes back a word, right half forward.
private struct WordTapZones: View {
    var body: some View {
        HStack(spacing: 0) {
            zone(step: -1)
            zone(step: 1)
        }
    }

    private func zone(step: Int) -> some View {
        Button(intent: ShiftWordIntent(step: step)) {
            Color.clear.contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Lock Screen (and small Home Screen) widget: one word from the current week's list,
/// moving to the next word every hour and to the new list on Monday.
struct WordEntry: TimelineEntry {
    let date: Date
    let week: Int
    let index: Int
    let count: Int
    let word: Course.Word?
    let theme: Course.Theme?

    static let sample = WordEntry(date: .now, week: 1, index: 0, count: 15,
                                  word: Course.Word(hanzi: "你好", pinyin: "nǐ hǎo", english: "hello"),
                                  theme: Course.Theme(english: "Hello & goodbye", hanzi: "你好", pinyin: "Nǐ hǎo"))
}

struct WordProvider: TimelineProvider {
    func placeholder(in context: Context) -> WordEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        let entry = Self.entry(at: .now)
        completion(context.isPreview && entry.word == nil ? .sample : entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let calendar = CourseClock.calendar
        let hour = calendar.dateInterval(of: .hour, for: .now)?.start ?? .now
        let entries = (0..<24).compactMap { offset in
            calendar.date(byAdding: .hour, value: offset, to: hour).map { Self.entry(at: $0) }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }

    static func entry(at date: Date) -> WordEntry {
        guard let course = Course.shared,
              let start = CourseClock.date(fromKey: SharedState.startedOn ?? SharedState.widgetStartedOn) else {
            return WordEntry(date: date, week: 0, index: 0, count: 0, word: nil, theme: nil)
        }
        let week = CourseClock.weekNumber(start: start, at: date, totalWeeks: course.totalWeeks)
        let words = course.words(week)
        guard !words.isEmpty else {
            return WordEntry(date: date, week: week, index: 0, count: 0, word: nil, theme: course.theme(week))
        }
        let weekStart = CourseClock.weekStart(start: start, week: week)
        let hours = max(0, CourseClock.calendar.dateComponents([.hour], from: weekStart, to: date).hour ?? 0)
        let index = ((hours + SharedState.wordOffset) % words.count + words.count) % words.count
        return WordEntry(date: date, week: week, index: index, count: words.count, word: words[index], theme: course.theme(week))
    }
}

struct WordWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WordEntry

    private static let void = Color(red: 9 / 255, green: 11 / 255, blue: 13 / 255)
    private static let acid = Color(red: 223 / 255, green: 1, blue: 69 / 255)
    private static let muted = Color(red: 141 / 255, green: 149 / 255, blue: 158 / 255)

    var body: some View {
        content
            .containerBackground(for: .widget) {
                if family == .systemSmall { Self.void } else { Color.clear }
            }
    }

    @ViewBuilder private var content: some View {
        if let word = entry.word {
            switch family {
            case .accessoryInline:
                Text("\(word.hanzi) \(word.pinyin) · \(word.english)")
            case .accessoryCircular:
                Button(intent: ShiftWordIntent(step: 1)) {
                    ZStack {
                        AccessoryWidgetBackground()
                        Text(word.hanzi)
                            .font(.system(size: word.hanzi.count > 2 ? 15 : 22, weight: .bold))
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)
                            .padding(4)
                    }
                }
                .buttonStyle(.plain)
            case .systemSmall:
                VStack(alignment: .leading, spacing: 2) {
                    Text("WEEK \(String(format: "%02d", entry.week)) · ‹ \(entry.index + 1)/\(entry.count) ›")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Self.acid)
                    Spacer(minLength: 0)
                    Text(word.hanzi)
                        .font(.system(size: 40, weight: .bold))
                        .minimumScaleFactor(0.4)
                        .lineLimit(1)
                        .foregroundStyle(.white)
                    Text(word.pinyin)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(word.english)
                        .font(.system(size: 13))
                        .foregroundStyle(Self.muted)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(WordTapZones())
            default:
                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(word.hanzi)
                            .font(.system(size: 22, weight: .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .widgetAccentable()
                        Text(word.pinyin)
                            .font(.system(size: 14, weight: .medium))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    Text(word.english)
                        .font(.system(size: 13))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Text("‹ \(entry.index + 1)/\(entry.count) ›  Week \(entry.week)")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(WordTapZones())
            }
        } else {
            switch family {
            case .accessoryInline:
                Text("Open ManDayRin to start")
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    Text("日").font(.system(size: 22, weight: .bold))
                }
            default:
                VStack(alignment: .leading, spacing: 2) {
                    Text("ManDayRin").font(.headline)
                    Text("Open the app once to start your course.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct ManDayRinWordWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ManDayRinWord", provider: WordProvider()) { entry in
            WordWidgetView(entry: entry)
        }
        .configurationDisplayName("This week's words")
        .description("A word from this week's list, a new one every hour. Tap the left or right side to change it.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular, .systemSmall])
    }
}

@main
struct ManDayRinWidgetBundle: WidgetBundle {
    var body: some Widget {
        ManDayRinWordWidget()
    }
}
