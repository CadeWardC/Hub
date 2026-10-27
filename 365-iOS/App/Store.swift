import SwiftUI
import UIKit

/// Something you take for your hair: a supplement, medication or topical.
struct Supplement: Codable, Identifiable, Hashable {
    var id = UUID()
    var name = ""
    var dose = ""
    var schedule = "Daily"
    var startedOn = Day.key(Date())
    var stoppedOn: String?
    var notes = ""

    func active(on day: String) -> Bool {
        startedOn <= day && (stoppedOn.map { day <= $0 } ?? true)
    }
}

struct DayLog: Codable {
    /// File name inside Documents/Photos. It changes on every retake, so views reload it.
    var photo: String?
    var taken: [UUID] = []
    var note = ""
}

struct Journal: Codable {
    var supplements: [Supplement] = []
    var days: [String: DayLog] = [:]
}

struct CameraRequest: Identifiable {
    let day: String
    var id: String { day }
}

/// The journal (Documents/journal.json) and the photos (Documents/Photos), visible in the Files app.
final class Store: ObservableObject {
    static let shared = Store()

    @Published private(set) var journal = Journal()
    @Published private(set) var today = Day.key(Date())
    @Published var cameraRequest: CameraRequest?

    let photosURL: URL
    private let fileURL: URL
    private let thumbs = NSCache<NSString, UIImage>()

    private init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = docs.appendingPathComponent("journal.json")
        photosURL = docs.appendingPathComponent("Photos", isDirectory: true)
        try? FileManager.default.createDirectory(at: photosURL, withIntermediateDirectories: true)
        if let data = try? Data(contentsOf: fileURL),
           let saved = try? JSONDecoder().decode(Journal.self, from: data) {
            journal = saved
        }
    }

    // MARK: Days

    var photoDays: [String] {
        journal.days.filter { $0.value.photo != nil }.keys.sorted()
    }

    var firstDay: String { photoDays.first ?? today }

    func dayNumber(_ day: String) -> Int { max(1, Day.between(firstDay, day) + 1) }

    func log(_ day: String) -> DayLog { journal.days[day] ?? DayLog() }

    var takenToday: Bool { journal.days[today]?.photo != nil }

    var streak: Int {
        var day = takenToday ? today : Day.add(-1, to: today)
        var count = 0
        while journal.days[day]?.photo != nil {
            count += 1
            day = Day.add(-1, to: day)
        }
        return count
    }

    /// Called when the app comes to the front: the date may have changed while it was away.
    func refresh() {
        let now = Day.key(Date())
        if now != today { today = now }
        publish()
    }

    // MARK: Photos

    func photoURL(_ file: String) -> URL { photosURL.appendingPathComponent(file) }

    func image(_ day: String) -> UIImage? {
        guard let file = journal.days[day]?.photo else { return nil }
        return UIImage(contentsOfFile: photoURL(file).path)
    }

    func thumbnail(_ file: String, width: CGFloat) async -> UIImage? {
        let key = "\(file)@\(Int(width))" as NSString
        if let hit = thumbs.object(forKey: key) { return hit }
        let url = photoURL(file)
        let image = await Task.detached(priority: .userInitiated) { () -> UIImage? in
            guard let full = UIImage(contentsOfFile: url.path) else { return nil }
            let ratio = full.size.height / max(full.size.width, 1)
            return full.preparingThumbnail(of: CGSize(width: width, height: (width * ratio).rounded())) ?? full
        }.value
        if let image { thumbs.setObject(image, forKey: key) }
        return image
    }

    func savePhoto(_ image: UIImage, day: String) {
        let prepared = Self.normalized(image, maxSide: 1600)
        guard let data = prepared.jpegData(compressionQuality: 0.85) else { return }
        let file = "\(day)_\(Int(Date().timeIntervalSince1970)).jpg"
        do {
            try data.write(to: photoURL(file), options: .atomic)
        } catch {
            return
        }
        if let old = journal.days[day]?.photo { try? FileManager.default.removeItem(at: photoURL(old)) }
        journal.days[day, default: DayLog()].photo = file
        save()
        publish()
    }

    func deletePhoto(_ day: String) {
        guard let old = journal.days[day]?.photo else { return }
        try? FileManager.default.removeItem(at: photoURL(old))
        journal.days[day]?.photo = nil
        save()
        publish()
    }

    /// Upright, at most `maxSide` pixels on the long edge.
    static func normalized(_ image: UIImage, maxSide: CGFloat) -> UIImage {
        let size = image.size
        let scale = min(1, maxSide / max(size.width, size.height, 1))
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }

    // MARK: Supplements

    var activeSupplements: [Supplement] { journal.supplements.filter { $0.active(on: today) } }

    func supplements(on day: String) -> [Supplement] { journal.supplements.filter { $0.active(on: day) } }

    func upsert(_ supplement: Supplement) {
        if let index = journal.supplements.firstIndex(where: { $0.id == supplement.id }) {
            journal.supplements[index] = supplement
        } else {
            journal.supplements.append(supplement)
        }
        save()
    }

    func deleteSupplement(_ id: UUID) {
        journal.supplements.removeAll { $0.id == id }
        save()
    }

    func toggleTaken(_ id: UUID, day: String) {
        var log = journal.days[day] ?? DayLog()
        if let index = log.taken.firstIndex(of: id) {
            log.taken.remove(at: index)
        } else {
            log.taken.append(id)
        }
        journal.days[day] = log
        save()
    }

    func setNote(_ note: String, day: String) {
        journal.days[day, default: DayLog()].note = note
        save()
    }

    // MARK: Saving

    private func save() {
        guard let data = try? JSONEncoder().encode(journal) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    /// Hands the photo stats to the reminders.
    private func publish() {
        let days = photoDays
        SharedState.record(first: days.first, last: days.last)
        Reminders.reschedule()
        if takenToday { Reminders.clearDelivered() }
    }
}
