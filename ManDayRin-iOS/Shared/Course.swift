import Foundation

/// The course data from build/course.json (written by scripts/prepare.sh from ManDayRin/weeks.js).
struct Course: Decodable {
    struct Word {
        let hanzi: String
        let pinyin: String
        let english: String
    }

    struct Theme {
        let english: String
        let hanzi: String
        let pinyin: String
    }

    /// [English, hanzi, pinyin] per week.
    let themes: [[String]]
    /// Week number → [hanzi, pinyin, English] per word.
    let weeks: [String: [[String]]]

    static let shared: Course? = {
        guard let url = Bundle.main.url(forResource: "course", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Course.self, from: data)
    }()

    var totalWeeks: Int { themes.count }

    func theme(_ week: Int) -> Theme {
        let row = themes[max(0, min(themes.count - 1, week - 1))]
        return Theme(english: row[0], hanzi: row[1], pinyin: row[2])
    }

    func words(_ week: Int) -> [Word] {
        (weeks[String(week)] ?? []).map { Word(hanzi: $0[0], pinyin: $0[1], english: $0[2]) }
    }
}

/// Same week maths as app.js: week 1 starts on the saved Monday, a new week every 7 days, capped at the last week.
enum CourseClock {
    static var calendar: Calendar { Calendar.current }

    /// "YYYY-MM-DD" → local midnight.
    static func date(fromKey key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func key(for date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func weekNumber(start: Date, at date: Date, totalWeeks: Int) -> Int {
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: start), to: calendar.startOfDay(for: date)).day ?? 0
        return min(totalWeeks, max(1, days / 7 + 1))
    }

    static func weekStart(start: Date, week: Int) -> Date {
        calendar.date(byAdding: .day, value: (week - 1) * 7, to: calendar.startOfDay(for: start)) ?? start
    }
}
