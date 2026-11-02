import Foundation

/// One analysis frame. `hz` is 0 when the frame is unvoiced or silent.
public struct PitchFrame: Equatable {
    public let time: Double
    public let hz: Double
}

/// YIN fundamental-frequency tracker (de Cheveigné & Kawahara, 2002).
public enum PitchTracker {
    static let minHz = 70.0
    static let maxHz = 500.0
    static let threshold = 0.15   // first dip below this in the normalized difference
    static let unvoiced = 0.35    // a best dip above this is not a periodic sound

    public static func track(_ samples: [Float], sampleRate: Double, hop: Double = 0.01) -> [PitchFrame] {
        let window = Int(0.03 * sampleRate)
        let tauMax = Int(sampleRate / minHz)
        let tauMin = Int(sampleRate / maxHz)
        let hopSize = max(1, Int(hop * sampleRate))
        let frameLength = window + tauMax + 1
        guard samples.count >= frameLength else { return [] }

        let gate = silenceGate(samples, window: window, hop: hopSize)
        var frames: [PitchFrame] = []
        var diff = [Double](repeating: 0, count: tauMax + 1)

        samples.withUnsafeBufferPointer { x in
            var start = 0
            while start + frameLength <= x.count {
                let time = (Double(start) + Double(window) / 2) / sampleRate
                var energy = 0.0
                for j in 0..<window { energy += Double(x[start + j] * x[start + j]) }
                if energy / Double(window) < gate {
                    frames.append(PitchFrame(time: time, hz: 0))
                    start += hopSize
                    continue
                }
                for tau in 1...tauMax {
                    var sum = 0.0
                    for j in 0..<window {
                        let d = Double(x[start + j] - x[start + j + tau])
                        sum += d * d
                    }
                    diff[tau] = sum
                }
                frames.append(PitchFrame(
                    time: time,
                    hz: estimate(diff, tauMin: tauMin, tauMax: tauMax, sampleRate: sampleRate)))
                start += hopSize
            }
        }
        return smooth(frames)
    }

    /// Mean power below which a frame is treated as silence, relative to the
    /// recording's loud frames so it works at any microphone level.
    private static func silenceGate(_ samples: [Float], window: Int, hop: Int) -> Double {
        var powers: [Double] = []
        var i = 0
        while i + window <= samples.count {
            var sum = 0.0
            for j in stride(from: i, to: i + window, by: 4) {
                sum += Double(samples[j] * samples[j])
            }
            powers.append(sum / Double(window / 4))
            i += hop * 4
        }
        guard let loud = powers.sorted().dropLast(powers.count / 20).last else { return 0 }
        return max(loud * 0.01, 1e-7)
    }

    private static func estimate(_ diff: [Double], tauMin: Int, tauMax: Int, sampleRate: Double) -> Double {
        var cmnd = [Double](repeating: 1, count: tauMax + 1)
        var running = 0.0
        for tau in 1...tauMax {
            running += diff[tau]
            cmnd[tau] = running > 0 ? diff[tau] * Double(tau) / running : 1
        }
        var best = -1
        var tau = tauMin
        while tau < tauMax {
            if cmnd[tau] < threshold {
                while tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau] { tau += 1 }
                best = tau
                break
            }
            tau += 1
        }
        if best < 0 {
            var lowest = tauMin
            for t in tauMin..<tauMax where cmnd[t] < cmnd[lowest] { lowest = t }
            if cmnd[lowest] > unvoiced { return 0 }
            best = lowest
        }
        // parabolic interpolation for sub-sample accuracy
        var refined = Double(best)
        if best > 1 && best < tauMax {
            let a = cmnd[best - 1], b = cmnd[best], c = cmnd[best + 1]
            let denominator = 2 * (a - 2 * b + c)
            if denominator != 0 { refined += (a - c) / denominator }
        }
        return sampleRate / refined
    }

    /// Fold octave errors back to the local median, then median-filter.
    private static func smooth(_ frames: [PitchFrame]) -> [PitchFrame] {
        var hz = frames.map(\.hz)
        for i in hz.indices where hz[i] > 0 {
            let near = (max(0, i - 15)...min(hz.count - 1, i + 15)).map { hz[$0] }.filter { $0 > 0 }
            guard let reference = median(near) else { continue }
            if hz[i] > reference * 1.7 { hz[i] /= 2 } else if hz[i] < reference * 0.6 { hz[i] *= 2 }
        }
        var out = frames
        for i in hz.indices where hz[i] > 0 {
            let near = (max(0, i - 2)...min(hz.count - 1, i + 2)).map { hz[$0] }.filter { $0 > 0 }
            out[i] = PitchFrame(time: frames[i].time, hz: median(near) ?? hz[i])
        }
        return out
    }

    static func median(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.sorted()[values.count / 2]
    }
}
