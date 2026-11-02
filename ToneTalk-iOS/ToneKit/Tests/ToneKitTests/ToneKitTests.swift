import XCTest
@testable import ToneKit

final class ToneKitTests: XCTestCase {
    private let sampleRate = 16000.0

    /// A voice-like tone: a harmonic stack following a pitch curve.
    private func voice(_ curve: (Double) -> Double, seconds: Double, base: Double) -> [Float] {
        let count = Int(seconds * sampleRate)
        var phase = 0.0
        return (0..<count).map { i in
            let progress = Double(i) / Double(count)
            phase += 2 * .pi * base * pow(2, curve(progress) / 12) / sampleRate
            let envelope = min(1, min(progress, 1 - progress) * 20)
            return Float(0.3 * envelope * (sin(phase) + 0.5 * sin(2 * phase) + 0.25 * sin(3 * phase)))
        }
    }

    /// Pitch curves in semitones around the speaker's midpoint.
    private let curves: [Int: (Double) -> Double] = [
        1: { _ in 4 },
        2: { p in -1.5 + 6 * p * p },
        3: { p in -2 - 8 * p * (1 - p) + 3 * p },
        4: { p in 5 - 10 * p },
    ]

    func testTracksAKnownPitch() {
        let frames = PitchTracker.track(voice({ _ in 0 }, seconds: 0.5, base: 200), sampleRate: sampleRate)
        let voiced = frames.map(\.hz).filter { $0 > 0 }
        XCTAssertGreaterThan(voiced.count, 20)
        XCTAssertEqual(PitchTracker.median(voiced)!, 200, accuracy: 2)
    }

    func testTracksLowAndHighVoicesWithoutOctaveErrors() {
        for base in [95.0, 150.0, 300.0] {
            let frames = PitchTracker.track(voice({ _ in 0 }, seconds: 0.5, base: base), sampleRate: sampleRate)
            let voiced = frames.map(\.hz).filter { $0 > 0 }
            XCTAssertEqual(PitchTracker.median(voiced)!, base, accuracy: base * 0.02)
        }
    }

    func testSilenceHasNoPitch() {
        let frames = PitchTracker.track([Float](repeating: 0, count: 8000), sampleRate: sampleRate)
        XCTAssertTrue(frames.allSatisfy { $0.hz == 0 })
    }

    func testClassifiesAllFourTonesOnASingleSyllable() {
        // 妈 麻 马 骂: the classic minimal set
        let cases: [(String, Int)] = [("妈", 1), ("麻", 2), ("马", 3), ("骂", 4)]
        for base in [120.0, 220.0] {
            for (word, tone) in cases {
                let audio = voice(curves[tone]!, seconds: 0.45, base: base)
                let results = ToneAnalyzer.analyze(
                    samples: audio, sampleRate: sampleRate,
                    words: [SpokenWord(text: word, start: 0, duration: 0.45)])
                XCTAssertEqual(results.first?.heard, tone, "\(word) at \(base) Hz")
            }
        }
    }

    func testWrongToneIsReported() {
        // says 妈 (tone 1) with a falling tone 4
        let audio = voice(curves[4]!, seconds: 0.45, base: 180)
        let results = ToneAnalyzer.analyze(
            samples: audio, sampleRate: sampleRate,
            words: [SpokenWord(text: "妈", start: 0, duration: 0.45)])
        XCTAssertEqual(results.first?.verdict, .wrong)
        XCTAssertEqual(results.first?.heard, 4)
    }

    func testClassifiesTonesInsideAPhrase() {
        // 他(1) 来(2) 看(4) 书(1)
        var audio: [Float] = []
        var words: [SpokenWord] = []
        for (i, (word, tone)) in [("他", 1), ("来", 2), ("看", 4), ("书", 1)].enumerated() {
            audio += voice(curves[tone]!, seconds: 0.3, base: 170)
            words.append(SpokenWord(text: word, start: Double(i) * 0.3, duration: 0.3))
        }
        let results = ToneAnalyzer.analyze(samples: audio, sampleRate: sampleRate, words: words)
        XCTAssertEqual(results.map(\.heard), [1, 2, 4, 1])
        XCTAssertEqual(ToneAnalyzer.score(results), 1)
    }

    func testTooLittleVoiceIsUnclearNotWrong() {
        let results = ToneAnalyzer.analyze(
            frames: [], words: [SpokenWord(text: "好", start: 0, duration: 0.3)])
        XCTAssertEqual(results.first?.verdict, .unclear)
        XCTAssertNil(ToneAnalyzer.score(results))
    }

    func testWordsShareTheirTimeBetweenCharacters() {
        let spans = ToneAnalyzer.syllableSpans([SpokenWord(text: "你好", start: 1, duration: 0.6)])
        XCTAssertEqual(spans.count, 2)
        XCTAssertEqual(spans[1].start, 1.3, accuracy: 0.001)
    }

    func testPinyinToneMarks() {
        XCTAssertEqual(Pinyin.tone(of: "mā"), 1)
        XCTAssertEqual(Pinyin.tone(of: "má"), 2)
        XCTAssertEqual(Pinyin.tone(of: "mǎ"), 3)
        XCTAssertEqual(Pinyin.tone(of: "mà"), 4)
        XCTAssertEqual(Pinyin.tone(of: "ma"), 5)
        XCTAssertEqual(Pinyin.tone(of: "lǜ"), 4)
    }

    func testThirdToneSandhi() {
        let s = Pinyin.syllables("你好")
        XCTAssertEqual(s.map(\.dictionaryTone), [3, 3])
        XCTAssertEqual(s.map(\.spokenTone), [2, 3])
    }

    func testBuAndYiSandhi() {
        XCTAssertEqual(Pinyin.syllables("不是").first?.spokenTone, 2)
        XCTAssertEqual(Pinyin.syllables("不好").first?.spokenTone, 4)
        XCTAssertEqual(Pinyin.syllables("一个").first?.spokenTone, 2)
        XCTAssertEqual(Pinyin.syllables("一天").first?.spokenTone, 4)
    }

    func testPunctuationAndLatinAreSkipped() {
        XCTAssertEqual(Pinyin.syllables("你好，OK！").count, 2)
    }
}
