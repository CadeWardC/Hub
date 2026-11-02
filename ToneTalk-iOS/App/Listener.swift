import AVFoundation
import Speech
import ToneKit

/// One finished utterance: the words Apple's recognizer heard, and the audio.
struct Capture {
    let text: String
    let words: [SpokenWord]
    let samples: [Float]
    static let sampleRate = 16000.0
}

/// Listens for one Mandarin utterance and stops by itself on silence, so the same
/// code serves tap-to-talk and hands-free mode.
final class Listener {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private let lock = NSLock()
    private var samples: [Float] = []
    private var finished = false
    private var ending = false
    private var latest: SFTranscription?

    private var noiseFloor: Float = 0.002
    private var heardSpeech = false
    private var speechTime = 0.0
    private var quietTime = 0.0
    private var totalTime = 0.0

    static let endSilence = 1.1        // seconds of quiet that end an utterance
    static let maxUtterance = 45.0     // the recognizer stops at about a minute
    static let maxWaiting = 20.0       // give up when nobody speaks

    var isAvailable: Bool { recognizer?.isAvailable ?? false }

    static func requestPermissions() async -> Bool {
        let speech = await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        let mic = await AVAudioApplication.requestRecordPermission()
        return speech && mic
    }

    func start(onPartial: @escaping (String) -> Void,
               onLevel: @escaping (Float) -> Void,
               completion: @escaping (Capture?) -> Void) throws {
        guard let recognizer, recognizer.isAvailable else {
            throw NSError(domain: "ToneTalk", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Mandarin speech recognition is not available. "
                    + "Add Chinese (Mandarin) under Settings > General > Keyboard > Dictation."])
        }
        reset()
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default,
                                options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
        self.request = request

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard let target = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: Capture.sampleRate,
                                         channels: 1, interleaved: false),
              let converter = AVAudioConverter(from: format, to: target) else {
            throw NSError(domain: "ToneTalk", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "This microphone's audio format is not supported."])
        }

        input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            request.append(buffer)
            self.store(buffer, converter: converter, target: target)
            let level = self.level(of: buffer)
            onLevel(level)
            self.updateSilence(level: level, seconds: Double(buffer.frameLength) / format.sampleRate)
        }

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                self.setLatest(result.bestTranscription)
                onPartial(result.bestTranscription.formattedString)
            }
            if error != nil || result?.isFinal == true { self.finish(completion) }
        }
        engine.prepare()
        try engine.start()
        self.completion = completion
    }

    /// End the utterance now and keep what was said.
    func stop() {
        endAudio()
    }

    /// Abandon the utterance.
    func cancel() {
        completion = nil
        task?.cancel()
        stopEngine()
    }

    private var completion: ((Capture?) -> Void)?

    private func reset() {
        lock.lock()
        samples = []
        finished = false
        ending = false
        latest = nil
        lock.unlock()
        noiseFloor = 0.002
        heardSpeech = false
        speechTime = 0
        quietTime = 0
        totalTime = 0
    }

    private func setLatest(_ transcription: SFTranscription) {
        lock.lock()
        latest = transcription
        lock.unlock()
    }

    private func store(_ buffer: AVAudioPCMBuffer, converter: AVAudioConverter, target: AVAudioFormat) {
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * target.sampleRate
                                         / buffer.format.sampleRate) + 64
        guard let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity) else { return }
        var supplied = false
        var error: NSError?
        converter.convert(to: out, error: &error) { _, status in
            if supplied {
                status.pointee = .noDataNow
                return nil
            }
            supplied = true
            status.pointee = .haveData
            return buffer
        }
        guard error == nil, let channel = out.floatChannelData?[0] else { return }
        let chunk = Array(UnsafeBufferPointer(start: channel, count: Int(out.frameLength)))
        lock.lock()
        samples += chunk
        lock.unlock()
    }

    private func level(of buffer: AVAudioPCMBuffer) -> Float {
        guard let channel = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return 0 }
        var sum: Float = 0
        for i in 0..<Int(buffer.frameLength) { sum += channel[i] * channel[i] }
        return (sum / Float(buffer.frameLength)).squareRoot()
    }

    /// Voice activity: speech is clearly above a floor that tracks the room's noise.
    private func updateSilence(level: Float, seconds: Double) {
        totalTime += seconds
        let threshold = max(noiseFloor * 3, 0.008)
        if level > threshold {
            speechTime += seconds
            quietTime = 0
            if speechTime > 0.15 { heardSpeech = true }
        } else {
            noiseFloor = noiseFloor * 0.98 + level * 0.02
            quietTime += seconds
        }
        let done = (heardSpeech && quietTime > Self.endSilence)
            || (heardSpeech && totalTime > Self.maxUtterance)
            || (!heardSpeech && totalTime > Self.maxWaiting)
        if done { endAudio() }
    }

    private func endAudio() {
        lock.lock()
        let already = ending
        ending = true
        lock.unlock()
        guard !already else { return }
        request?.endAudio()
        stopEngine()
        // the final result can fail to arrive after very short audio
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            guard let self, let completion = self.completion else { return }
            self.finish(completion)
        }
    }

    private func stopEngine() {
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
    }

    private func finish(_ completion: @escaping (Capture?) -> Void) {
        lock.lock()
        let already = finished
        finished = true
        let transcription = latest
        let audio = samples
        lock.unlock()
        guard !already else { return }
        self.completion = nil
        stopEngine()
        task?.cancel()
        DispatchQueue.main.async {
            guard let transcription, !transcription.formattedString.isEmpty else {
                completion(nil)
                return
            }
            let words = transcription.segments.map {
                SpokenWord(text: $0.substring, start: $0.timestamp, duration: $0.duration)
            }
            completion(Capture(text: transcription.formattedString, words: words, samples: audio))
        }
    }
}
