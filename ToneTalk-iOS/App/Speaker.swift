import AVFoundation

/// Plays Mandarin aloud with the device's voice, and plays back what the learner said.
final class Speaker: NSObject, AVSpeechSynthesizerDelegate, AVAudioPlayerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private var player: AVAudioPlayer?
    private var finished: (() -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    var isSpeaking: Bool { synthesizer.isSpeaking }

    private func prepareSession() {
        let session = AVAudioSession.sharedInstance()
        // .playAndRecord keeps speech audible with the silent switch on
        try? session.setCategory(.playAndRecord, mode: .default,
                                 options: [.defaultToSpeaker, .allowBluetooth])
        try? session.setActive(true)
    }

    func say(_ text: String, language: String = "zh-CN", slow: Bool = false,
             finished: (() -> Void)? = nil) {
        prepareSession()
        stop()
        self.finished = finished
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = Self.bestVoice(language)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * (slow ? 0.6 : 0.9)
        utterance.postUtteranceDelay = 0.1
        synthesizer.speak(utterance)
    }

    /// Enhanced and premium voices sound far better, when the user has downloaded one.
    private static func bestVoice(_ language: String) -> AVSpeechSynthesisVoice? {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language == language }
            .max { $0.quality.rawValue < $1.quality.rawValue }
            ?? AVSpeechSynthesisVoice(language: language)
    }

    func playRecording(_ samples: [Float], sampleRate: Double) {
        prepareSession()
        stop()
        guard let url = Self.writeWav(samples, sampleRate: sampleRate),
              let player = try? AVAudioPlayer(contentsOf: url) else { return }
        self.player = player
        player.delegate = self
        player.play()
    }

    func stop() {
        finished = nil
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        player?.stop()
    }

    private static func writeWav(_ samples: [Float], sampleRate: Double) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("tonetalk-recording.wav")
        guard !samples.isEmpty,
              let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: sampleRate,
                                         channels: 1, interleaved: false),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count)),
              let channel = buffer.floatChannelData?[0] else { return nil }
        buffer.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { channel.update(from: $0.baseAddress!, count: samples.count) }
        try? FileManager.default.removeItem(at: url)
        do {
            let file = try AVAudioFile(forWriting: url, settings: format.settings)
            try file.write(from: buffer)
            return url
        } catch {
            return nil
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        let done = finished
        finished = nil
        done?()
    }
}
