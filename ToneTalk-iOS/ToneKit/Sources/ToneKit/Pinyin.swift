import Foundation

/// A Mandarin tone; 5 is the neutral tone.
public struct Syllable: Equatable {
    public let hanzi: String
    public let pinyin: String
    public let dictionaryTone: Int   // as written
    public var spokenTone: Int       // after tone sandhi: what a native speaker says
}

public enum Pinyin {
    public static func isHan(_ c: Character) -> Bool {
        c.unicodeScalars.contains { (0x4E00...0x9FFF).contains($0.value) || (0x3400...0x4DBF).contains($0.value) }
    }

    /// Tone from the mark on a pinyin syllable ("hǎo" -> 3); no mark is neutral.
    public static func tone(of pinyin: String) -> Int {
        for scalar in pinyin.decomposedStringWithCanonicalMapping.unicodeScalars {
            switch scalar.value {
            case 0x304: return 1
            case 0x301: return 2
            case 0x30C: return 3
            case 0x300: return 4
            default: continue
            }
        }
        return 5
    }

    /// Pinyin for each Han character, with sandhi applied across the phrase.
    /// The phrase is transliterated whole so words like 银行 get their reading in
    /// context; if the syllables do not line up, it falls back to one at a time.
    public static func syllables(_ text: String) -> [Syllable] {
        let chars = text.filter(isHan).map(String.init)
        guard !chars.isEmpty else { return [] }
        var readings = transliterate(chars.joined())
        if readings.count != chars.count {
            readings = chars.map { transliterate($0).first ?? "" }
        }
        var result = zip(chars, readings).map { hanzi, pinyin -> Syllable in
            let t = tone(of: pinyin)
            return Syllable(hanzi: hanzi, pinyin: pinyin, dictionaryTone: t, spokenTone: t)
        }
        applySandhi(&result)
        return result
    }

    static func transliterate(_ text: String) -> [String] {
        (text.applyingTransform(.mandarinToLatin, reverse: false) ?? "")
            .split(whereSeparator: \.isWhitespace).map(String.init)
    }

    static func applySandhi(_ s: inout [Syllable]) {
        for i in s.indices.dropLast() {
            let next = s[i + 1].dictionaryTone
            if s[i].hanzi == "不", next == 4 { s[i].spokenTone = 2 }
            if s[i].hanzi == "一" { s[i].spokenTone = next == 4 ? 2 : (next == 5 ? 5 : 4) }
        }
        // a third tone before another third tone rises
        for i in s.indices.dropLast().reversed() where s[i].dictionaryTone == 3 && s[i + 1].dictionaryTone == 3 {
            s[i].spokenTone = 2
        }
    }
}
