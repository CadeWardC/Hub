import SwiftUI
import ToneKit
import UIKit

struct Message: Identifiable {
    let id = UUID()
    let fromLearner: Bool
    let hanzi: String
    var pinyin = ""
    var english = ""
    var correction: String?
    var tones: [ToneResult] = []
    var capture: Capture?
}

enum Phase: Equatable {
    case idle, listening, thinking, speaking
}

struct Phrase: Equatable {
    let hanzi: String
    let pinyin: String
    let english: String
}

/// Runs the loop: listen, grade the tones, ask the tutor, speak, and in hands-free
/// mode go straight back to listening.
@MainActor
final class Coach: ObservableObject {
    @Published var phase: Phase = .idle
    @Published var messages: [Message] = []
    @Published var partial = ""
    @Published var level: Float = 0
    @Published var error: String?
    @Published var handsFree = false
    @Published var drilling = false
    @Published var phrase = Coach.starterPhrases[0]
    @Published var attempt: Message?
    @Published var loadingPhrase = false

    private let listener = Listener()
    private let speaker = Speaker()
    private var history: [ChatTurn] = []
    private var permitted = false
    private var starter = 0
    private var retried = false

    static let starterPhrases = [
        Phrase(hanzi: "你好吗", pinyin: "nǐ hǎo ma", english: "How are you?"),
        Phrase(hanzi: "我想喝咖啡", pinyin: "wǒ xiǎng hē kāfēi", english: "I want to drink coffee."),
        Phrase(hanzi: "今天天气很好", pinyin: "jīntiān tiānqì hěn hǎo", english: "The weather is nice today."),
        Phrase(hanzi: "这个多少钱", pinyin: "zhège duōshao qián", english: "How much is this?"),
        Phrase(hanzi: "我不太明白", pinyin: "wǒ bú tài míngbai", english: "I don't quite understand."),
        Phrase(hanzi: "请再说一遍", pinyin: "qǐng zài shuō yí biàn", english: "Please say it again."),
        Phrase(hanzi: "你是哪国人", pinyin: "nǐ shì nǎ guó rén", english: "What country are you from?"),
        Phrase(hanzi: "我们一起去吃饭吧", pinyin: "wǒmen yìqǐ qù chīfàn ba", english: "Let's go eat together."),
    ]

    private var tutor: Tutor {
        let defaults = UserDefaults.standard
        let provider = Provider(rawValue: defaults.string(forKey: "provider") ?? "") ?? .deepseek
        return Tutor(provider: provider,
                     model: defaults.string(forKey: provider.modelDefaultsKey) ?? provider.defaultModel,
                     level: defaults.string(forKey: "level") ?? "HSK 2")
    }

    private func ready() async -> Bool {
        if !permitted { permitted = await Listener.requestPermissions() }
        if !permitted { error = "Allow Microphone and Speech Recognition in iPhone Settings." }
        return permitted
    }

    // MARK: Talk

    func talkTapped() {
        switch phase {
        case .idle: Task { await listen(then: { [weak self] in self?.handleConversation($0) }) }
        case .listening: listener.stop()
        case .speaking:
            speaker.stop()
            phase = .idle
        case .thinking: break
        }
    }

    func setHandsFree(_ on: Bool) {
        handsFree = on
        UIApplication.shared.isIdleTimerDisabled = on || drilling
        if on {
            drilling = false
            if phase == .idle { Task { await listen(then: { [weak self] in self?.handleConversation($0) }) } }
        } else {
            stopEverything()
        }
    }

    private func stopEverything() {
        listener.cancel()
        speaker.stop()
        phase = .idle
        partial = ""
        level = 0
    }

    private func listen(then handle: @escaping @MainActor (Capture?) -> Void) async {
        guard await ready() else {
            handsFree = false
            drilling = false
            return
        }
        error = nil
        partial = ""
        phase = .listening
        do {
            try listener.start(
                onPartial: { [weak self] text in Task { @MainActor in self?.partial = text } },
                onLevel: { [weak self] value in Task { @MainActor in self?.level = value } },
                completion: { [weak self] capture in
                    Task { @MainActor in
                        self?.level = 0
                        handle(capture)
                    }
                })
        } catch {
            self.error = error.localizedDescription
            phase = .idle
            handsFree = false
            drilling = false
        }
    }

    private func handleConversation(_ capture: Capture?) {
        partial = ""
        guard let capture else {
            phase = .idle
            if handsFree {   // nobody spoke yet
                Task { await listen(then: { [weak self] in self?.handleConversation($0) }) }
            }
            return
        }
        if handleVoiceCommand(capture.text) { return }

        let tones = ToneAnalyzer.analyze(samples: capture.samples, sampleRate: Capture.sampleRate,
                                         words: capture.words)
        messages.append(Message(fromLearner: true, hanzi: capture.text, tones: tones, capture: capture))
        var turn = capture.text
        let wrong = tones.filter { $0.verdict == .wrong }
        if !wrong.isEmpty {
            let list = wrong.map { "\($0.syllable.hanzi) (\($0.syllable.pinyin)) said as tone \($0.heard ?? 0)" }
            turn += "\n[tones] " + list.joined(separator: "; ")
        }
        history.append(ChatTurn(role: "user", text: turn))
        phase = .thinking
        Task { await respond() }
    }

    /// Hands-free needs a way out that does not involve touching the phone.
    private func handleVoiceCommand(_ text: String) -> Bool {
        let cleaned = text.trimmingCharacters(in: .punctuationCharacters.union(.whitespaces))
        if ["停止", "结束", "停", "退出"].contains(cleaned) {
            handsFree = false
            UIApplication.shared.isIdleTimerDisabled = false
            speaker.say("好的，再见")
            phase = .idle
            return true
        }
        if ["再说一遍", "再说一次", "重复"].contains(cleaned),
           let last = messages.last(where: { !$0.fromLearner }) {
            speak(last.hanzi, then: { [weak self] in self?.handleConversation($0) })
            return true
        }
        return false
    }

    private func respond() async {
        do {
            let reply = try await tutor.reply(to: history)
            history.append(ChatTurn(role: "assistant", text: reply.hanzi))
            messages.append(Message(fromLearner: false, hanzi: reply.hanzi, pinyin: reply.pinyin,
                                    english: reply.english, correction: reply.correction))
            speak(reply.hanzi, then: { [weak self] in self?.handleConversation($0) })
        } catch {
            self.error = error.localizedDescription
            phase = .idle
            handsFree = false
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }

    private func speak(_ text: String, then handle: @escaping @MainActor (Capture?) -> Void) {
        phase = .speaking
        speaker.say(text) { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.phase = .idle
                if self.handsFree { await self.listen(then: handle) }
            }
        }
    }

    func replay(_ text: String, slow: Bool = false) {
        speaker.say(text, slow: slow)
    }

    func playBack(_ capture: Capture) {
        speaker.playRecording(capture.samples, sampleRate: Capture.sampleRate)
    }

    func clearConversation() {
        messages = []
        history = []
    }

    // MARK: Practice

    func practiceTapped() {
        if phase == .listening {
            listener.stop()
        } else if phase == .idle {
            attempt = nil
            Task { await listen(then: { [weak self] in self?.handleAttempt($0) }) }
        }
    }

    private func handleAttempt(_ capture: Capture?) {
        partial = ""
        phase = .idle
        guard let capture else {
            if drilling { Task { await playAndListen() } }
            else { error = "I didn't catch that. Try again a little louder." }
            return
        }
        if ["停止", "结束", "停", "退出"].contains(
            capture.text.trimmingCharacters(in: .punctuationCharacters.union(.whitespaces))) {
            setDrilling(false)
            return
        }
        let tones = ToneAnalyzer.analyze(samples: capture.samples, sampleRate: Capture.sampleRate,
                                         words: capture.words)
        attempt = Message(fromLearner: true, hanzi: capture.text, tones: tones, capture: capture)
        if drilling { speakFeedback(tones) }
    }

    /// Hands-free drill: hear the phrase, say it, hear how it went, repeat once if
    /// needed, then move on.
    func setDrilling(_ on: Bool) {
        drilling = on
        UIApplication.shared.isIdleTimerDisabled = on || handsFree
        if on {
            handsFree = false
            retried = false
            stopEverything()
            Task { await playAndListen() }
        } else {
            stopEverything()
        }
    }

    private func playAndListen() async {
        guard drilling else { return }
        phase = .speaking
        speaker.say(phrase.hanzi) { [weak self] in
            Task { @MainActor in
                guard let self, self.drilling else { return }
                await self.listen(then: { [weak self] in self?.handleAttempt($0) })
            }
        }
    }

    private func speakFeedback(_ tones: [ToneResult]) {
        let good = (ToneAnalyzer.score(tones) ?? 0) >= 0.8
        let wrong = tones.filter { $0.verdict == .wrong }.map(\.syllable.hanzi)
        var line = good ? "很好" : "再试一次"
        if !good, !wrong.isEmpty { line = "注意" + wrong.joined(separator: "，") + "的声调。" + line }
        let next = good || retried
        retried = next ? false : true
        phase = .speaking
        speaker.say(line) { [weak self] in
            Task { @MainActor in
                guard let self, self.drilling else { return }
                if next { await self.nextPhrase() }
                await self.playAndListen()
            }
        }
    }

    func nextPhrase() async {
        attempt = nil
        error = nil
        loadingPhrase = true
        defer { loadingPhrase = false }
        do {
            let used = Self.starterPhrases.map(\.hanzi).joined(separator: "，")
            let reply = try await tutor.practicePhrase(focus: used + "，" + phrase.hanzi)
            phrase = Phrase(hanzi: reply.hanzi, pinyin: reply.pinyin, english: reply.english)
        } catch {
            // no key or no network: the built-in phrases still work
            starter = (starter + 1) % Self.starterPhrases.count
            phrase = Self.starterPhrases[starter]
        }
    }
}
