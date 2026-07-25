import 'dart:math' as math;

import '../utils/tones.dart';

/// One pitch reading taken from the microphone.
class PitchSample {
  const PitchSample({
    required this.timeSeconds,
    required this.frequencyHz,
    required this.voiced,
  });

  final double timeSeconds;
  final double frequencyHz;

  /// False for silence, consonants, and readings the detector was unsure of.
  final bool voiced;
}

/// How one syllable of the utterance was pronounced.
class SyllableTone {
  const SyllableTone({
    required this.pinyin,
    required this.expectedTone,
    required this.heardTone,
    required this.confidence,
    required this.contour,
  });

  final String pinyin;

  /// 1-4, or 5 for a neutral tone.
  final int expectedTone;

  /// What the pitch actually did, or null when the syllable could not be
  /// measured (too short, unvoiced, or drowned in noise).
  final int? heardTone;

  /// 0-1. Low values mean two tones looked almost equally likely.
  final double confidence;

  /// Speaker-normalised pitch through the syllable, for drawing.
  final List<double> contour;

  bool get measured => heardTone != null;
  bool get correct => heardTone == expectedTone;
}

/// The verdict on a whole utterance.
class ToneReport {
  const ToneReport({required this.syllables, required this.note});

  final List<SyllableTone> syllables;

  /// Set when the report is partial or could not be produced, e.g. the number
  /// of syllables heard did not match the number of syllables said.
  final String? note;

  bool get isEmpty => syllables.isEmpty;

  List<SyllableTone> get measured =>
      syllables.where((syllable) => syllable.measured).toList();

  int get correctCount =>
      syllables.where((syllable) => syllable.correct).length;

  /// Share of measurable syllables pronounced with the right tone, or null
  /// when nothing could be measured.
  double? get score {
    final counted = measured;
    if (counted.isEmpty) return null;
    return counted.where((syllable) => syllable.correct).length /
        counted.length;
  }
}

/// Scores Mandarin tones from a pitch contour.
///
/// The pipeline is deliberately conservative: a syllable is only judged when
/// there is enough voiced pitch to judge it, and the whole report is withheld
/// when the audio cannot be lined up with the syllables that were said. Wrong
/// feedback is worse than none for a learner.
class ToneAnalyzer {
  const ToneAnalyzer({
    this.minSyllableSeconds = 0.08,
    this.maxGapSeconds = 0.06,
    this.neutralMaxSeconds = 0.13,
  });

  /// Voiced stretches shorter than this are noise, not syllables.
  final double minSyllableSeconds;

  /// Unvoiced stretches shorter than this sit inside a syllable rather than
  /// between two, so they do not split one syllable in half.
  final double maxGapSeconds;

  /// A short, flat, unstressed syllable reads as neutral.
  final double neutralMaxSeconds;

  /// Splits a pitch track into voiced runs, one per syllable in clear speech.
  List<List<PitchSample>> segment(List<PitchSample> samples) {
    final segments = <List<PitchSample>>[];
    var current = <PitchSample>[];
    double? lastVoicedTime;

    for (final sample in samples) {
      if (!sample.voiced || sample.frequencyHz <= 0) continue;
      if (current.isNotEmpty &&
          lastVoicedTime != null &&
          sample.timeSeconds - lastVoicedTime > maxGapSeconds) {
        segments.add(current);
        current = <PitchSample>[];
      }
      current.add(sample);
      lastVoicedTime = sample.timeSeconds;
    }
    if (current.isNotEmpty) segments.add(current);

    return [
      for (final segment in segments)
        if (_duration(segment) >= minSyllableSeconds) segment,
    ];
  }

  /// Converts pitch in hertz to semitones around the speaker's own median, so
  /// a low voice and a high voice are scored the same way.
  List<double> normalise(List<PitchSample> samples, {double? referenceHz}) {
    final voiced = samples
        .where((sample) => sample.voiced && sample.frequencyHz > 0)
        .map((sample) => sample.frequencyHz)
        .toList();
    if (voiced.isEmpty) return const [];
    final reference = referenceHz ?? _median(voiced);
    if (reference <= 0) return const [];
    return [
      for (final frequency in voiced) 12 * _log2(frequency / reference),
    ];
  }

  /// Classifies one syllable's normalised contour.
  ///
  /// Returns the tone and how clear-cut the decision was. The shapes are the
  /// textbook ones: 1 flat and high, 2 rising, 3 dipping and low, 4 falling.
  ({int tone, double confidence}) classify(
    List<double> contour, {
    required double durationSeconds,
  }) {
    if (contour.length < 3) return (tone: 5, confidence: 0);

    final start = _mean(contour.sublist(0, math.max(1, contour.length ~/ 4)));
    final end = _mean(
      contour.sublist(contour.length - math.max(1, contour.length ~/ 4)),
    );
    final level = _mean(contour);
    final slope = end - start;
    final minimum = contour.reduce(math.min);
    final dip = math.min(start, end) - minimum;

    // Semitone thresholds: a tone move is a musical interval, not a few hertz.
    const rising = 1.5;
    const falling = -1.5;

    final scores = <int, double>{
      // Flat and at or above the speaker's median.
      1: _clamp(1 - slope.abs() / 3) * _clamp(0.5 + level / 4),
      2: _clamp(slope / 4),
      // Dips in the middle and sits low overall.
      3: _clamp(dip / 3) * _clamp(0.6 - level / 6),
      4: _clamp(-slope / 4),
    };
    if (durationSeconds <= neutralMaxSeconds && slope.abs() < 1.0) {
      scores[5] = _clamp(0.6 + (neutralMaxSeconds - durationSeconds) * 2);
    }

    // A clear direction should not lose to a marginal flat/dip score.
    if (slope >= rising) scores[2] = math.max(scores[2]!, 0.6);
    if (slope <= falling) scores[4] = math.max(scores[4]!, 0.6);

    final ranked = scores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final best = ranked.first;
    final runnerUp = ranked.length > 1 ? ranked[1].value : 0.0;
    if (best.value <= 0) return (tone: 5, confidence: 0);
    return (
      tone: best.key,
      confidence: _clamp((best.value - runnerUp) / best.value),
    );
  }

  /// Scores an utterance against the pinyin that was actually recognised.
  ///
  /// [expectedPinyin] is one entry per syllable, tone marks included; the
  /// expected tone is read from the diacritic.
  ToneReport analyse({
    required List<PitchSample> samples,
    required List<String> expectedPinyin,
  }) {
    final expected = expectedPinyin
        .where((syllable) => syllable.trim().isNotEmpty)
        .toList();
    if (expected.isEmpty) {
      return const ToneReport(syllables: [], note: 'Nothing to score.');
    }

    final segments = segment(samples);
    if (segments.isEmpty) {
      return ToneReport(
        syllables: const [],
        note: 'No voice was picked up. Check the microphone and try again.',
      );
    }
    if (segments.length != expected.length) {
      // Lining up the wrong syllables would mark good tones wrong, so say so
      // instead of guessing.
      return ToneReport(
        syllables: const [],
        note:
            'Heard ${segments.length} syllable${segments.length == 1 ? '' : 's'} '
            'for ${expected.length} — say it again a little slower, '
            'with even gaps between syllables.',
      );
    }

    final reference = _median([
      for (final sample in samples)
        if (sample.voiced && sample.frequencyHz > 0) sample.frequencyHz,
    ]);

    final syllables = <SyllableTone>[];
    for (var index = 0; index < expected.length; index++) {
      final segment = segments[index];
      final contour = normalise(segment, referenceHz: reference);
      final duration = _duration(segment);
      final expectedTone = toneOf(expected[index]);
      if (contour.length < 3) {
        syllables.add(
          SyllableTone(
            pinyin: expected[index],
            expectedTone: expectedTone,
            heardTone: null,
            confidence: 0,
            contour: contour,
          ),
        );
        continue;
      }
      final verdict = classify(contour, durationSeconds: duration);
      syllables.add(
        SyllableTone(
          pinyin: expected[index],
          expectedTone: expectedTone,
          heardTone: verdict.tone,
          confidence: verdict.confidence,
          contour: contour,
        ),
      );
    }
    return ToneReport(syllables: syllables, note: null);
  }

  static double _duration(List<PitchSample> segment) =>
      segment.isEmpty ? 0 : segment.last.timeSeconds - segment.first.timeSeconds;
}

double _mean(List<double> values) =>
    values.isEmpty ? 0 : values.reduce((a, b) => a + b) / values.length;

double _median(List<double> values) {
  if (values.isEmpty) return 0;
  final sorted = [...values]..sort();
  final middle = sorted.length ~/ 2;
  if (sorted.length.isOdd) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

double _log2(double value) => math.log(value) / math.ln2;

double _clamp(double value) => value.clamp(0.0, 1.0);
