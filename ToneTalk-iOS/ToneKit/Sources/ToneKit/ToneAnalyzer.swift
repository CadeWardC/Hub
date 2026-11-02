import Foundation

/// A word from the speech recognizer, with its position in the recording.
public struct SpokenWord: Equatable {
    public let text: String
    public let start: Double
    public let duration: Double

    public init(text: String, start: Double, duration: Double) {
        self.text = text
        self.start = start
        self.duration = duration
    }
}

public enum Verdict: String, Equatable {
    case correct, wrong, unclear
}

public struct ToneResult: Equatable {
    public let syllable: Syllable
    public let heard: Int?          // 1-4, nil when there was not enough voice to measure
    public let confidence: Double   // 0-1
    public let verdict: Verdict
    public let contour: [Double]    // 5 points, semitones around the speaker's midpoint
}

/// Classifies tones by comparing each syllable's pitch curve with the textbook
/// curves, measured in semitones around the speaker's own voice, so it works for
/// low and high voices alike.
public enum ToneAnalyzer {
    static let points = 5
    static let minVoicedFrames = 5
    static let wrongConfidence = 0.55   // below this a mismatch is reported as unclear

    /// Chao tone numerals as curves: tone 1 is 55, tone 2 is 35, tone 3 is 214
    /// (or low 21 when it does not end a phrase), tone 4 is 51.
    static let templates: [(tone: Int, curve: [Double])] = [
        (1, [5, 5, 5, 5, 5]),
        (2, [3, 3.2, 3.7, 4.3, 5]),
        (3, [2, 1.4, 1, 1.6, 3.2]),
        (3, [2.2, 1.7, 1.2, 1, 1]),
        (4, [5, 4.4, 3.4, 2.2, 1]),
    ]

    public static func analyze(samples: [Float], sampleRate: Double, words: [SpokenWord]) -> [ToneResult] {
        analyze(frames: PitchTracker.track(samples, sampleRate: sampleRate), words: words)
    }

    public static func analyze(frames: [PitchFrame], words: [SpokenWord]) -> [ToneResult] {
        let text = words.map(\.text).joined()
        let syllables = Pinyin.syllables(text)
        let spans = syllableSpans(words)
        guard spans.count == syllables.count else { return [] }

        let voiced = frames.map(\.hz).filter { $0 > 0 }.sorted()
        guard let center = PitchTracker.median(voiced), center > 0 else {
            return syllables.map { unclear($0) }
        }
        let low = voiced[voiced.count / 20], high = voiced[voiced.count - 1 - voiced.count / 20]
        let range = 12 * log2(high / low)
        // a phrase uses a narrower range than citation speech: stretch it to fit,
        // but not so far that a flat syllable's jitter becomes a contour
        let scale = 10 / min(max(range, 6), 14)
        let freeOffset = syllables.count < 3   // too few syllables to know where "high" is

        return zip(syllables, spans).map { syllable, span in
            let hz = frames.filter { $0.time >= span.start && $0.time < span.end && $0.hz > 0 }.map(\.hz)
            guard hz.count >= minVoicedFrames else { return unclear(syllable) }
            let curve = resample(hz.map { 12 * log2($0 / center) * scale })
            let (heard, confidence) = classify(curve, freeOffset: freeOffset)
            let verdict: Verdict
            if syllable.spokenTone == 5 {
                verdict = .unclear   // the neutral tone has no contour of its own
            } else if heard == syllable.spokenTone {
                verdict = .correct
            } else {
                verdict = confidence >= wrongConfidence ? .wrong : .unclear
            }
            return ToneResult(syllable: syllable, heard: heard, confidence: confidence,
                              verdict: verdict, contour: curve)
        }
    }

    /// Share of the syllables we could judge that were right; nil if none could be judged.
    public static func score(_ results: [ToneResult]) -> Double? {
        let judged = results.filter { $0.verdict != .unclear }
        guard !judged.isEmpty else { return nil }
        return Double(judged.filter { $0.verdict == .correct }.count) / Double(judged.count)
    }

    static func classify(_ curve: [Double], freeOffset: Bool) -> (tone: Int, confidence: Double) {
        var best: [Int: Double] = [:]
        for template in templates {
            let target = template.curve.map { ($0 - 3) * 2.5 }
            let mean = zip(curve, target).map { $0 - $1 }.reduce(0, +) / Double(points)
            let offset = freeOffset ? mean : min(max(mean, -2.5), 2.5)
            let squared = zip(curve, target).map { c, t -> Double in
                let d = c - t - offset
                return d * d
            }.reduce(0, +) / Double(points)
            best[template.tone] = min(best[template.tone] ?? .infinity, squared)
        }
        let sigma = 2.0 * 1.5 * 1.5
        let weights = best.mapValues { exp(-$0 / sigma) }
        let total = weights.values.reduce(0, +)
        guard total > 0, let top = weights.max(by: { $0.value < $1.value }) else { return (1, 0) }
        return (top.key, top.value / total)
    }

    /// Time span of each Han character. The recognizer times whole words, so a
    /// word's duration is shared equally between its characters.
    static func syllableSpans(_ words: [SpokenWord]) -> [(start: Double, end: Double)] {
        var spans: [(start: Double, end: Double)] = []
        for word in words {
            let count = word.text.filter(Pinyin.isHan).count
            guard count > 0 else { continue }
            let each = word.duration / Double(count)
            for i in 0..<count {
                let start = word.start + Double(i) * each
                spans.append((start, start + each))
            }
        }
        return spans
    }

    /// Reduce to evenly spaced points, skipping the first and last 15%, where
    /// consonants and the next syllable's onset pull the pitch around.
    static func resample(_ values: [Double]) -> [Double] {
        let trim = values.count / 7
        let core = Array(values[trim..<(values.count - trim)])
        return (0..<points).map { i in
            let position = Double(i) * Double(core.count - 1) / Double(points - 1)
            let lower = Int(position), upper = min(lower + 1, core.count - 1)
            let t = position - Double(lower)
            return core[lower] * (1 - t) + core[upper] * t
        }
    }

    private static func unclear(_ syllable: Syllable) -> ToneResult {
        ToneResult(syllable: syllable, heard: nil, confidence: 0, verdict: .unclear, contour: [])
    }
}
