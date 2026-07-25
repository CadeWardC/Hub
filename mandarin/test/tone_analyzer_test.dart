import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/tone_analyzer.dart';

/// Builds a syllable's worth of pitch samples following [shape], a list of
/// semitone offsets from [baseHz] spread evenly over [seconds].
List<PitchSample> syllable(
  List<double> shape, {
  required double startSeconds,
  double seconds = 0.30,
  double baseHz = 200,
  double frameSeconds = 0.01,
}) {
  final frames = (seconds / frameSeconds).round();
  return [
    for (var index = 0; index < frames; index++)
      PitchSample(
        timeSeconds: startSeconds + index * frameSeconds,
        frequencyHz:
            baseHz * math.pow(2, _at(shape, index / (frames - 1)) / 12),
        voiced: true,
      ),
  ];
}

/// Linear interpolation through [shape] at position [t] in 0..1.
double _at(List<double> shape, double t) {
  if (shape.length == 1) return shape.first;
  final position = t * (shape.length - 1);
  final low = position.floor().clamp(0, shape.length - 1);
  final high = position.ceil().clamp(0, shape.length - 1);
  return shape[low] + (shape[high] - shape[low]) * (position - low);
}

List<PitchSample> silence({
  required double startSeconds,
  double seconds = 0.15,
  double frameSeconds = 0.01,
}) {
  final frames = (seconds / frameSeconds).round();
  return [
    for (var index = 0; index < frames; index++)
      PitchSample(
        timeSeconds: startSeconds + index * frameSeconds,
        frequencyHz: 0,
        voiced: false,
      ),
  ];
}

// Textbook contours, in semitones relative to the speaker's median.
const flat = [4.0, 4.0, 4.0];
const rising = [-2.0, 0.0, 4.0];
const dipping = [-2.0, -6.0, -1.0];
const falling = [5.0, 0.0, -5.0];

void main() {
  const analyzer = ToneAnalyzer();

  group('classification', () {
    ({int tone, double confidence}) classifyShape(
      List<double> shape, {
      double seconds = 0.3,
    }) {
      final samples = syllable(shape, startSeconds: 0, seconds: seconds);
      final contour = analyzer.normalise(samples);
      return analyzer.classify(contour, durationSeconds: seconds);
    }

    test('a flat high contour is tone 1', () {
      expect(classifyShape(flat).tone, 1);
    });

    test('a rising contour is tone 2', () {
      expect(classifyShape(rising).tone, 2);
    });

    test('a dipping low contour is tone 3', () {
      expect(classifyShape(dipping).tone, 3);
    });

    test('a falling contour is tone 4', () {
      expect(classifyShape(falling).tone, 4);
    });

    test('a short flat syllable is neutral', () {
      expect(classifyShape([0.0, 0.0, 0.0], seconds: 0.09).tone, 5);
    });

    test('too little pitch to judge is reported, not guessed', () {
      final verdict = analyzer.classify([1, 2], durationSeconds: 0.2);

      expect(verdict.confidence, 0);
    });
  });

  group('segmentation', () {
    test('splits syllables on the silence between them', () {
      final samples = [
        ...syllable(flat, startSeconds: 0),
        ...silence(startSeconds: 0.30),
        ...syllable(rising, startSeconds: 0.45),
      ];

      expect(analyzer.segment(samples), hasLength(2));
    });

    test('a brief unvoiced dip does not split one syllable', () {
      final samples = [
        ...syllable(flat, startSeconds: 0, seconds: 0.15),
        ...silence(startSeconds: 0.15, seconds: 0.03),
        ...syllable(flat, startSeconds: 0.18, seconds: 0.15),
      ];

      expect(analyzer.segment(samples), hasLength(1));
    });

    test('clicks and noise are discarded', () {
      final samples = [
        ...syllable(flat, startSeconds: 0, seconds: 0.03),
        ...silence(startSeconds: 0.03),
        ...syllable(rising, startSeconds: 0.18),
      ];

      expect(analyzer.segment(samples), hasLength(1));
    });
  });

  group('scoring an utterance', () {
    test('marks each syllable against the tone it should have had', () {
      // 你好 said correctly: dipping then falling-ish rising pair.
      final samples = [
        ...syllable(dipping, startSeconds: 0),
        ...silence(startSeconds: 0.30),
        ...syllable(dipping, startSeconds: 0.45),
      ];

      final report = analyzer.analyse(
        samples: samples,
        expectedPinyin: ['nǐ', 'hǎo'],
      );

      expect(report.note, isNull);
      expect(report.syllables, hasLength(2));
      expect(report.syllables.every((syllable) => syllable.correct), isTrue);
      expect(report.score, 1.0);
    });

    test('catches a tone said wrongly', () {
      // 妈 (tone 1) said with a falling contour, i.e. 骂.
      final report = analyzer.analyse(
        samples: syllable(falling, startSeconds: 0),
        expectedPinyin: ['mā'],
      );

      expect(report.syllables.single.expectedTone, 1);
      expect(report.syllables.single.heardTone, 4);
      expect(report.syllables.single.correct, isFalse);
      expect(report.score, 0.0);
    });

    test('withholds the report when the syllables do not line up', () {
      final report = analyzer.analyse(
        samples: syllable(flat, startSeconds: 0),
        expectedPinyin: ['nǐ', 'hǎo'],
      );

      expect(report.syllables, isEmpty);
      expect(report.note, contains('Heard 1 syllable for 2'));
    });

    test('says so when no voice was picked up', () {
      final report = analyzer.analyse(
        samples: silence(startSeconds: 0, seconds: 0.5),
        expectedPinyin: ['nǐ'],
      );

      expect(report.note, contains('No voice'));
      expect(report.score, isNull);
    });

    test('normalisation makes a low voice score like a high one', () {
      List<PitchSample> saidWith(double baseHz) => [
        ...syllable(rising, startSeconds: 0, baseHz: baseHz),
        ...silence(startSeconds: 0.30),
        ...syllable(falling, startSeconds: 0.45, baseHz: baseHz),
      ];

      for (final baseHz in [95.0, 210.0, 320.0]) {
        final report = analyzer.analyse(
          samples: saidWith(baseHz),
          expectedPinyin: ['má', 'mà'],
        );
        expect(
          report.syllables.map((syllable) => syllable.heardTone),
          [2, 4],
          reason: 'a voice centred on ${baseHz}Hz should score the same',
        );
      }
    });
  });
}
