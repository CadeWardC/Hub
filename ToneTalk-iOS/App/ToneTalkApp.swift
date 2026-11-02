import SwiftUI
import ToneKit

@main
struct ToneTalkApp: App {
    @StateObject private var coach = Coach()

    var body: some Scene {
        WindowGroup {
            TabView {
                TalkView()
                    .tabItem { Label("Talk", systemImage: "bubble.left.and.bubble.right") }
                PracticeView()
                    .tabItem { Label("Practice", systemImage: "waveform") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gearshape") }
            }
            .environmentObject(coach)
        }
    }
}

extension Verdict {
    var color: Color {
        switch self {
        case .correct: return .green
        case .wrong: return .red
        case .unclear: return .secondary
        }
    }
}

/// Each syllable with its pinyin, coloured by whether the tone was right.
struct ToneRow: View {
    let results: [ToneResult]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(results.enumerated()), id: \.offset) { _, result in
                    VStack(spacing: 2) {
                        Text(result.syllable.pinyin).font(.caption2)
                        Text(result.syllable.hanzi).font(.title3)
                        ContourView(points: result.contour)
                            .stroke(result.verdict.color, lineWidth: 2)
                            .frame(width: 26, height: 16)
                        Text(label(result)).font(.caption2).foregroundStyle(result.verdict.color)
                    }
                }
            }
        }
    }

    private func label(_ r: ToneResult) -> String {
        switch r.verdict {
        case .correct: return "tone \(r.heard ?? r.syllable.spokenTone)"
        case .wrong: return "said \(r.heard ?? 0), want \(r.syllable.spokenTone)"
        case .unclear: return r.syllable.spokenTone == 5 ? "neutral" : "unclear"
        }
    }
}

/// The measured pitch curve of one syllable.
struct ContourView: Shape {
    let points: [Double]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard points.count > 1 else { return path }
        for (i, value) in points.enumerated() {
            let x = rect.width * CGFloat(i) / CGFloat(points.count - 1)
            let y = rect.height * (1 - CGFloat((min(max(value, -7), 7) + 7) / 14))
            if i == 0 { path.move(to: CGPoint(x: x, y: y)) } else { path.addLine(to: CGPoint(x: x, y: y)) }
        }
        return path
    }
}

struct LevelBar: View {
    let level: Float

    var body: some View {
        GeometryReader { geometry in
            Capsule().fill(Color.accentColor)
                .frame(width: geometry.size.width * CGFloat(min(level * 12, 1)))
        }
        .frame(height: 4)
        .animation(.linear(duration: 0.08), value: level)
    }
}

struct TalkView: View {
    @EnvironmentObject private var coach: Coach

    private var status: String {
        switch coach.phase {
        case .idle: return coach.handsFree ? "Hands-free" : "Tap to speak Mandarin"
        case .listening: return coach.partial.isEmpty ? "Listening…" : coach.partial
        case .thinking: return "Thinking…"
        case .speaking: return "Speaking… tap to stop"
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if coach.messages.isEmpty {
                                Text("Say something in Mandarin. You'll get a reply out loud, and a tone check on every syllable.")
                                    .font(.subheadline).foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center).padding(.top, 40)
                            }
                            ForEach(coach.messages) { message in
                                Bubble(message: message).id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: coach.messages.count) {
                        if let last = coach.messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }
                VStack(spacing: 10) {
                    if let error = coach.error {
                        Text(error).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center)
                    }
                    Text(status).font(.subheadline).lineLimit(2).multilineTextAlignment(.center)
                    if coach.phase == .listening { LevelBar(level: coach.level).padding(.horizontal, 60) }
                    Button { coach.talkTapped() } label: {
                        Image(systemName: coach.phase == .listening ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 68))
                    }
                    .disabled(coach.phase == .thinking)
                    Toggle("Hands-free", isOn: Binding(get: { coach.handsFree },
                                                       set: { coach.setHandsFree($0) }))
                        .padding(.horizontal, 60)
                    if coach.handsFree {
                        Text("Say 停止 to stop, 再说一遍 to repeat").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(.bar)
            }
            .navigationTitle("Talk")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                Button("Clear") { coach.clearConversation() }.disabled(coach.messages.isEmpty)
            }
        }
    }
}

struct Bubble: View {
    @EnvironmentObject private var coach: Coach
    let message: Message

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if message.fromLearner, !message.tones.isEmpty {
                ToneRow(results: message.tones)
            } else {
                Text(message.hanzi).font(.title3)
            }
            if !message.pinyin.isEmpty { Text(message.pinyin).font(.footnote) }
            if !message.english.isEmpty {
                Text(message.english).font(.footnote).foregroundStyle(.secondary)
            }
            if let correction = message.correction {
                Text(correction).font(.footnote).foregroundStyle(.orange)
            }
            HStack(spacing: 16) {
                Button { coach.replay(message.hanzi) } label: { Image(systemName: "speaker.wave.2") }
                Button { coach.replay(message.hanzi, slow: true) } label: { Image(systemName: "tortoise") }
                if let capture = message.capture {
                    Button { coach.playBack(capture) } label: { Label("Me", systemImage: "play.circle") }
                }
            }
            .font(.footnote)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(message.fromLearner ? Color.accentColor.opacity(0.12) : Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct PracticeView: View {
    @EnvironmentObject private var coach: Coach

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    VStack(spacing: 6) {
                        Text(coach.phrase.hanzi).font(.largeTitle)
                        Text(coach.phrase.pinyin)
                        Text(coach.phrase.english).font(.subheadline).foregroundStyle(.secondary)
                    }
                    .multilineTextAlignment(.center)
                    HStack(spacing: 24) {
                        Button { coach.replay(coach.phrase.hanzi) } label: { Label("Listen", systemImage: "speaker.wave.2") }
                        Button { coach.replay(coach.phrase.hanzi, slow: true) } label: { Label("Slow", systemImage: "tortoise") }
                    }
                    Button { coach.practiceTapped() } label: {
                        Image(systemName: coach.phase == .listening ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 68))
                    }
                    if coach.phase == .listening {
                        Text(coach.partial.isEmpty ? "Say the phrase…" : coach.partial).font(.subheadline)
                        LevelBar(level: coach.level).padding(.horizontal, 60)
                    }
                    if let attempt = coach.attempt {
                        AttemptView(attempt: attempt, target: coach.phrase)
                    }
                    if let error = coach.error {
                        Text(error).font(.footnote).foregroundStyle(.red)
                    }
                    Button {
                        Task { await coach.nextPhrase() }
                    } label: {
                        coach.loadingPhrase ? AnyView(ProgressView()) : AnyView(Text("Next phrase"))
                    }
                    Toggle("Hands-free drill", isOn: Binding(get: { coach.drilling },
                                                             set: { coach.setDrilling($0) }))
                        .padding(.horizontal, 40)
                    if coach.drilling {
                        Text("Listen, repeat, and hear how you did. Say 停止 to stop.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .navigationTitle("Practice")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct AttemptView: View {
    @EnvironmentObject private var coach: Coach
    let attempt: Message
    let target: Phrase

    private var matched: Bool {
        attempt.hanzi.filter(Pinyin.isHan) == target.hanzi.filter(Pinyin.isHan)
    }

    var body: some View {
        VStack(spacing: 8) {
            if let score = ToneAnalyzer.score(attempt.tones) {
                Text("Tones: \(Int((score * 100).rounded()))%").font(.headline)
            } else {
                Text("Couldn't measure the tones. Try again a little slower.").font(.footnote)
            }
            ToneRow(results: attempt.tones)
            if !matched {
                Text("I heard: \(attempt.hanzi)").font(.footnote).foregroundStyle(.orange)
            }
            if let capture = attempt.capture {
                Button { coach.playBack(capture) } label: { Label("Play my voice", systemImage: "play.circle") }
                    .font(.footnote)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct SettingsView: View {
    @AppStorage("provider") private var provider = Provider.deepseek.rawValue
    @AppStorage("level") private var level = "HSK 2"
    @State private var key = ""
    @State private var model = ""

    private var selected: Provider { Provider(rawValue: provider) ?? .deepseek }
    private let levels = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Tutor") {
                    Picker("Service", selection: $provider) {
                        ForEach(Provider.allCases) { Text($0.name).tag($0.rawValue) }
                    }
                    SecureField("API key", text: $key)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .onChange(of: key) { Keychain.save(key, for: selected.rawValue) }
                    TextField("Model", text: $model)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .onChange(of: model) {
                            UserDefaults.standard.set(model, forKey: selected.modelDefaultsKey)
                        }
                    if let url = URL(string: selected.keyPage) {
                        Link("Get a \(selected.name) key", destination: url)
                    }
                }
                Section {
                    Picker("Your level", selection: $level) {
                        ForEach(levels, id: \.self) { Text($0) }
                    }
                }
                Section("Privacy") {
                    Text("Your key stays in this phone's Keychain. Speech recognition and tone checks run on this phone where supported. Only the text of your conversation goes to the service you pick.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .onAppear(perform: load)
            .onChange(of: provider) { load() }
        }
    }

    private func load() {
        key = Keychain.read(selected.rawValue)
        model = UserDefaults.standard.string(forKey: selected.modelDefaultsKey) ?? selected.defaultModel
    }
}
