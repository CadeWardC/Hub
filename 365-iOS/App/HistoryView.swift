import SwiftUI

/// Every day from the first photo to today, newest first. Empty days can be filled in later.
struct HistoryView: View {
    @EnvironmentObject private var store: Store

    private let columns = [GridItem(.adaptive(minimum: 100), spacing: 4)]

    private var days: [String] {
        let count = max(0, Day.between(store.firstDay, store.today))
        return (0...count).map { Day.add(-$0, to: store.today) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.photoDays.isEmpty {
                    ContentUnavailableView("No photos yet", systemImage: "camera", description: Text("Take your first photo on the Today tab."))
                        .padding(.top, 80)
                } else {
                    LazyVGrid(columns: columns, spacing: 4) {
                        ForEach(days, id: \.self) { day in
                            NavigationLink(value: day) { cell(day) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(4)
                }
            }
            .navigationTitle("Photos")
            .navigationDestination(for: String.self) { DayDetailView(day: $0) }
            .toolbar {
                if store.photoDays.count >= 2 {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        NavigationLink { TimelapseView() } label: { Image(systemName: "play.circle") }
                        NavigationLink { CompareView() } label: { Image(systemName: "rectangle.split.2x1") }
                    }
                }
            }
        }
    }

    private func cell(_ day: String) -> some View {
        Color.clear
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                if let file = store.log(day).photo {
                    PhotoThumb(file: file)
                } else {
                    Image(systemName: "camera").foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.secondary.opacity(0.08))
                }
            }
            .overlay(alignment: .bottomLeading) {
                Text("\(store.dayNumber(day)) · \(Day.pretty(day, style: .dateTime.month(.abbreviated).day()))")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(.black.opacity(0.55), in: Capsule())
                    .padding(4)
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

struct DayDetailView: View {
    let day: String

    @EnvironmentObject private var store: Store
    @State private var confirmDelete = false

    var body: some View {
        let log = store.log(day)
        let supplements = store.supplements(on: day)
        List {
            Section {
                if let file = log.photo {
                    Color.clear
                        .aspectRatio(3 / 4, contentMode: .fit)
                        .overlay { PhotoThumb(file: file, width: 1200) }
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .listRowInsets(EdgeInsets())
                }
                Button(log.photo == nil ? "Take or add a photo" : "Retake photo") {
                    store.cameraRequest = CameraRequest(day: day)
                }
                if let file = log.photo {
                    ShareLink(item: store.photoURL(file)) { Label("Share", systemImage: "square.and.arrow.up") }
                    Button("Delete photo", role: .destructive) { confirmDelete = true }
                }
            }
            Section("What you were taking") {
                if supplements.isEmpty {
                    Text("Nothing on your list for this day").foregroundStyle(.secondary)
                }
                ForEach(supplements) { item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.name)
                            Text("Day \(Day.between(item.startedOn, day) + 1)\(item.dose.isEmpty ? "" : " · \(item.dose)")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if log.taken.contains(item.id) {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.tint)
                        }
                    }
                }
            }
            Section("Note") {
                TextField("Note", text: Binding(
                    get: { store.log(day).note },
                    set: { store.setNote($0, day: day) }
                ), axis: .vertical)
            }
        }
        .navigationTitle("Day \(store.dayNumber(day))")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 0) {
                    Text("Day \(store.dayNumber(day))").font(.headline)
                    Text(Day.pretty(day, style: .dateTime.weekday(.wide).month(.wide).day().year())).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .confirmationDialog("Delete this day's photo?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { store.deletePhoto(day) }
        }
    }
}

/// Two days side by side under a wipe: drag the handle to reveal one over the other.
struct CompareView: View {
    @EnvironmentObject private var store: Store
    @State private var before = ""
    @State private var after = ""
    @State private var split: CGFloat = 0.5

    var body: some View {
        let days = store.photoDays
        VStack(spacing: 16) {
            HStack {
                picker("Before", selection: $before, days: days)
                Spacer()
                picker("After", selection: $after, days: days)
            }
            .padding(.horizontal)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    photo(after)
                    photo(before)
                        .mask(alignment: .leading) {
                            Rectangle().frame(width: geo.size.width * split)
                        }
                    Rectangle()
                        .fill(.white)
                        .frame(width: 2)
                        .overlay(Circle().fill(.white).frame(width: 28, height: 28).overlay(Image(systemName: "arrow.left.and.right").font(.caption).foregroundStyle(.black)))
                        .offset(x: geo.size.width * split - 1)
                }
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { value in
                    split = min(1, max(0, value.location.x / max(geo.size.width, 1)))
                })
            }
            .aspectRatio(3 / 4, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)

            if !before.isEmpty, !after.isEmpty {
                Text("\(abs(Day.between(before, after))) days apart")
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .navigationTitle("Compare")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if before.isEmpty { before = days.first ?? "" }
            if after.isEmpty { after = days.last ?? "" }
        }
    }

    private func picker(_ title: String, selection: Binding<String>, days: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Picker(title, selection: selection) {
                ForEach(days, id: \.self) { day in
                    Text("Day \(store.dayNumber(day)) · \(Day.pretty(day, style: .dateTime.month(.abbreviated).day()))").tag(day)
                }
            }
            .labelsHidden()
        }
    }

    @ViewBuilder private func photo(_ day: String) -> some View {
        if let file = store.log(day).photo {
            Color.clear.overlay { PhotoThumb(file: file, width: 1200) }.clipped()
        } else {
            Color.secondary.opacity(0.1)
        }
    }
}

/// Plays every photo in order, like a flip book.
struct TimelapseView: View {
    @EnvironmentObject private var store: Store
    @State private var index = 0.0
    @State private var playing = false
    @State private var speed = 6.0
    @State private var frames: [String: UIImage] = [:]

    var body: some View {
        let days = store.photoDays
        let current = days.isEmpty ? nil : days[min(Int(index), days.count - 1)]
        VStack(spacing: 16) {
            Color.clear
                .aspectRatio(3 / 4, contentMode: .fit)
                .overlay {
                    if let current, let image = frames[current] {
                        Image(uiImage: image).resizable().scaledToFill()
                    } else {
                        ProgressView()
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(alignment: .bottomLeading) {
                    if let current {
                        Text("Day \(store.dayNumber(current)) · \(Day.pretty(current))")
                            .font(.callout.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(.black.opacity(0.6), in: Capsule())
                            .padding(10)
                    }
                }
                .padding(.horizontal)

            if days.count > 1 {
                Slider(value: $index, in: 0...Double(days.count - 1), step: 1)
                    .padding(.horizontal)
            }
            HStack {
                Button {
                    if Int(index) >= days.count - 1 { index = 0 }
                    playing.toggle()
                } label: {
                    Image(systemName: playing ? "pause.fill" : "play.fill").font(.title)
                }
                Spacer()
                Picker("Speed", selection: $speed) {
                    Text("3 / s").tag(3.0)
                    Text("6 / s").tag(6.0)
                    Text("12 / s").tag(12.0)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }
            .padding(.horizontal)
            Spacer()
        }
        .navigationTitle("Timelapse")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            for day in days {
                guard let file = store.log(day).photo else { continue }
                if let image = await store.thumbnail(file, width: 900) { frames[day] = image }
            }
        }
        .task(id: playing ? speed : 0) {
            guard playing else { return }
            while !Task.isCancelled, playing {
                try? await Task.sleep(for: .seconds(1 / speed))
                if Int(index) >= days.count - 1 {
                    playing = false
                } else {
                    index += 1
                }
            }
        }
    }
}
