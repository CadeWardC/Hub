import SwiftUI

/// Loads a photo's thumbnail off the main thread; the file name changes on every retake.
struct PhotoThumb: View {
    let file: String
    var width: CGFloat = 240

    @EnvironmentObject private var store: Store
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Color.secondary.opacity(0.15)
            }
        }
        .task(id: file) { image = await store.thumbnail(file, width: width) }
    }
}

struct TodayView: View {
    @EnvironmentObject private var store: Store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    progress
                    photoCard
                    if !store.activeSupplements.isEmpty { checklist }
                    note
                }
                .padding()
            }
            .navigationTitle("Day \(store.dayNumber(store.today))")
        }
    }

    private var progress: some View {
        let day = store.dayNumber(store.today)
        return VStack(alignment: .leading, spacing: 8) {
            ProgressView(value: Double(min(day, 365)), total: 365)
            HStack {
                Text("\(store.photoDays.count) photos")
                Spacer()
                Label("\(store.streak) day streak", systemImage: "flame")
                Spacer()
                Text(day >= 365 ? "365 reached" : "\(365 - day) days to go")
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder private var photoCard: some View {
        if let file = store.log(store.today).photo {
            VStack(spacing: 12) {
                Color.clear
                    .aspectRatio(3 / 4, contentMode: .fit)
                    .overlay { PhotoThumb(file: file, width: 900) }
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                HStack {
                    Label("Today's photo is done", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.tint)
                    Spacer()
                    Button("Retake") { store.cameraRequest = CameraRequest(day: store.today) }
                }
            }
        } else {
            Button {
                store.cameraRequest = CameraRequest(day: store.today)
            } label: {
                VStack(spacing: 14) {
                    Image(systemName: "camera.fill").font(.system(size: 44))
                    Text("Take today's photo").font(.title3.bold())
                    Text("Reminders keep coming until you do.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 48)
                .background(RoundedRectangle(cornerRadius: 18).fill(Color.accentColor.opacity(0.15)))
                .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Color.accentColor.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 6])))
            }
            .buttonStyle(.plain)
        }
    }

    private var checklist: some View {
        let taken = Set(store.log(store.today).taken)
        return VStack(alignment: .leading, spacing: 10) {
            Text("Taken today").font(.headline)
            ForEach(store.activeSupplements) { item in
                Button {
                    store.toggleTaken(item.id, day: store.today)
                } label: {
                    HStack {
                        Image(systemName: taken.contains(item.id) ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundStyle(taken.contains(item.id) ? Color.accentColor : .secondary)
                        VStack(alignment: .leading) {
                            Text(item.name)
                            Text([item.dose, item.schedule].filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var note: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Note").font(.headline)
            TextField("Shedding, itching, haircut, new shampoo…", text: Binding(
                get: { store.log(store.today).note },
                set: { store.setNote($0, day: store.today) }
            ), axis: .vertical)
            .lineLimit(2...6)
            .textFieldStyle(.roundedBorder)
        }
    }
}
