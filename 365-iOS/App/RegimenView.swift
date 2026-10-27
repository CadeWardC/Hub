import SwiftUI

/// What you're taking for your hair, past and present.
struct RegimenView: View {
    @EnvironmentObject private var store: Store
    @State private var editing: Supplement?

    var body: some View {
        let current = store.journal.supplements.filter { $0.active(on: store.today) }
        let other = store.journal.supplements.filter { !$0.active(on: store.today) }
        NavigationStack {
            List {
                if store.journal.supplements.isEmpty {
                    ContentUnavailableView("Nothing added yet", systemImage: "pills",
                                           description: Text("Add what you take (minoxidil, finasteride, biotin, a shampoo…) and each day's photo shows what you were on."))
                }
                if !current.isEmpty {
                    Section("Taking now") {
                        ForEach(current) { row($0) }
                    }
                }
                if !other.isEmpty {
                    Section("Stopped or not started") {
                        ForEach(other) { row($0) }
                    }
                }
            }
            .navigationTitle("Taking")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editing = Supplement()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $editing) { item in
                SupplementEditor(original: item)
                    .environmentObject(store)
            }
        }
    }

    private func row(_ item: Supplement) -> some View {
        Button {
            editing = item
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text(item.name.isEmpty ? "Untitled" : item.name).font(.body.weight(.medium))
                Text([item.dose, item.schedule].filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(period(item)).font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .swipeActions {
            Button(role: .destructive) {
                store.deleteSupplement(item.id)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private func period(_ item: Supplement) -> String {
        let started = Day.pretty(item.startedOn, style: .dateTime.month(.abbreviated).day().year())
        if let stopped = item.stoppedOn, stopped < store.today {
            return "\(started) – \(Day.pretty(stopped, style: .dateTime.month(.abbreviated).day().year())) · \(Day.between(item.startedOn, stopped) + 1) days"
        }
        if item.startedOn > store.today { return "Starts \(started)" }
        return "Since \(started) · day \(Day.between(item.startedOn, store.today) + 1)"
    }
}

struct SupplementEditor: View {
    let original: Supplement

    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var item: Supplement
    @State private var confirmDelete = false

    private static let schedules = ["Daily", "Twice daily", "Every other day", "Weekly", "As needed"]

    init(original: Supplement) {
        self.original = original
        _item = State(initialValue: original)
    }

    private var isNew: Bool { !store.journal.supplements.contains { $0.id == original.id } }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name (e.g. Minoxidil 5%)", text: $item.name)
                    TextField("Dose (e.g. 1 ml, 1 mg, 1 tablet)", text: $item.dose)
                    Picker("How often", selection: $item.schedule) {
                        ForEach(Self.schedules + (Self.schedules.contains(item.schedule) ? [] : [item.schedule]), id: \.self) { Text($0).tag($0) }
                    }
                }
                Section {
                    DatePicker("Started", selection: dateBinding(\.startedOn), displayedComponents: .date)
                    Toggle("Stopped", isOn: Binding(
                        get: { item.stoppedOn != nil },
                        set: { item.stoppedOn = $0 ? store.today : nil }
                    ))
                    if item.stoppedOn != nil {
                        DatePicker("Last day", selection: Binding(
                            get: { Day.date(item.stoppedOn ?? store.today) ?? Date() },
                            set: { item.stoppedOn = Day.key($0) }
                        ), in: (Day.date(item.startedOn) ?? .distantPast)..., displayedComponents: .date)
                    }
                }
                Section("Notes") {
                    TextField("Brand, how you apply it, side effects…", text: $item.notes, axis: .vertical)
                        .lineLimit(3...8)
                }
                if !isNew {
                    Section {
                        Button("Delete", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .navigationTitle(isNew ? "Add" : "Edit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        item.name = item.name.trimmingCharacters(in: .whitespacesAndNewlines)
                        store.upsert(item)
                        dismiss()
                    }
                    .disabled(item.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .confirmationDialog("Delete \(item.name)?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    store.deleteSupplement(item.id)
                    dismiss()
                }
            }
        }
    }

    private func dateBinding(_ path: WritableKeyPath<Supplement, String>) -> Binding<Date> {
        Binding(
            get: { Day.date(item[keyPath: path]) ?? Date() },
            set: { item[keyPath: path] = Day.key($0) }
        )
    }
}
