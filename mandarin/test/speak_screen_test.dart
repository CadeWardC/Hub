import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/screens/speak_screen.dart';
import 'package:mandarin_reader/services/back_translation.dart';
import 'package:mandarin_reader/services/dictionary.dart';
import 'package:mandarin_reader/services/pitch_recorder.dart';
import 'package:mandarin_reader/services/sentence_translator_stub.dart';
import 'package:mandarin_reader/services/speech_recognizer.dart';
import 'package:mandarin_reader/services/tone_analyzer.dart';

class FakeRecognizer extends SpeechRecognizer {
  FakeRecognizer({this.transcript = '我想吃饭', this.available = true});

  final String transcript;
  final bool available;

  @override
  bool get isAvailable => available;

  @override
  String? get unavailableReason =>
      available ? null : 'No Mandarin speech recognition on this device.';

  @override
  Future<bool> initialize() async => available;

  @override
  Future<void> listen({
    required void Function(String text, bool isFinal) onResult,
    Duration listenFor = const Duration(seconds: 20),
  }) async {
    onResult(transcript, true);
  }

  @override
  Future<void> stop() async {}
}

class FakeRecorder extends PitchRecorder {
  FakeRecorder(this.samples, {this.permitted = true, this.failsToStart = false});

  final List<PitchSample> samples;
  final bool permitted;

  /// Browsers may hand the microphone to the recogniser and refuse it here.
  final bool failsToStart;

  @override
  Future<bool> hasPermission() async => permitted;

  @override
  Future<void> start() async {
    if (failsToStart) throw StateError('microphone busy');
  }

  @override
  Future<List<PitchSample>> stop() async => samples;

  @override
  Future<void> dispose() async {}
}

class FakeSentences implements SentenceTranslator {
  FakeSentences(this.result);

  final String? result;

  @override
  bool get isSupported => result != null;

  @override
  String get name => 'Fake translator';

  @override
  Future<String?> translate(String chinese) async => result;

  @override
  Future<void> dispose() async {}
}

Dictionary buildDictionary() {
  return Dictionary.fromJson({
    'source': 'CC-CEDICT',
    'entries': {
      '我': [
        ['wǒ', ['I', 'me']],
      ],
      '想': [
        ['xiǎng', ['to want']],
      ],
      '吃饭': [
        ['chī fàn', ['to eat a meal']],
      ],
    },
  });
}

/// Semitone shapes for the four tones.
const flat = [4.0, 4.0, 4.0];
const rising = [-2.0, 0.0, 4.0];
const dipping = [-2.0, -6.0, -1.0];
const falling = [5.0, 0.0, -5.0];

List<PitchSample> syllable(
  List<double> shape, {
  required double startSeconds,
  double seconds = 0.3,
  double baseHz = 200,
}) {
  const frame = 0.01;
  final frames = (seconds / frame).round();
  return [
    for (var index = 0; index < frames; index++)
      PitchSample(
        timeSeconds: startSeconds + index * frame,
        frequencyHz: baseHz *
            math.pow(2, _at(shape, index / (frames - 1)) / 12).toDouble(),
        voiced: true,
      ),
  ];
}

double _at(List<double> shape, double t) {
  final position = t * (shape.length - 1);
  final low = position.floor().clamp(0, shape.length - 1);
  final high = position.ceil().clamp(0, shape.length - 1);
  return shape[low] + (shape[high] - shape[low]) * (position - low);
}

/// 我想吃饭 said with tones 3, 3, 1, 4 — the last one wrong on purpose when
/// [chiShape] is changed.
List<PitchSample> saidCorrectly({List<double> chiShape = flat}) => [
  ...syllable(dipping, startSeconds: 0.0),
  ...syllable(dipping, startSeconds: 0.5),
  ...syllable(chiShape, startSeconds: 1.0),
  ...syllable(falling, startSeconds: 1.5),
];

Future<void> speak(WidgetTester tester) async {
  await tester.tapAt(tester.getCenter(find.byIcon(Icons.mic_rounded)));
  // The screen waits briefly for the recogniser's final transcript.
  await tester.pump(const Duration(milliseconds: 500));
  await tester.pumpAndSettle();
}

/// The tone card sits below the fold in a test-sized window.
Future<void> scrollToTones(WidgetTester tester) async {
  await tester.drag(find.byType(ListView), const Offset(0, -600));
  await tester.pumpAndSettle();
}

Future<void> pumpScreen(
  WidgetTester tester, {
  required List<PitchSample> samples,
  String transcript = '我想吃饭',
  String? sentence = 'I want to eat.',
  bool available = true,
  bool micBusy = false,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SpeakScreen(
          recognizer: FakeRecognizer(
            transcript: transcript,
            available: available,
          ),
          recorder: FakeRecorder(samples, failsToStart: micBusy),
          translator: BackTranslator(
            dictionary: buildDictionary(),
            sentences: FakeSentences(sentence),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows what was heard, what it means, and the tones', (
    tester,
  ) async {
    await pumpScreen(tester, samples: saidCorrectly());

    await speak(tester);

    expect(find.text('我想吃饭'), findsOneWidget);
    expect(find.text('wǒ xiǎng chī fàn'), findsOneWidget);
    expect(find.text('I want to eat.'), findsOneWidget);
    // Word-by-word gloss, so a learner can see which word carried which sense.
    expect(find.text('to eat a meal'), findsOneWidget);
    // Every tone was said correctly.
    await scrollToTones(tester);
    expect(find.text('4/4 right'), findsOneWidget);
  });

  testWidgets('marks the syllable whose tone was wrong', (tester) async {
    // 吃 should be tone 1 (flat); say it falling instead.
    await pumpScreen(tester, samples: saidCorrectly(chiShape: falling));

    await speak(tester);
    await scrollToTones(tester);

    expect(find.text('3/4 right'), findsOneWidget);
    expect(find.text('said tone 4, wanted 1'), findsOneWidget);
  });

  testWidgets('explains itself when the syllables cannot be lined up', (
    tester,
  ) async {
    // Only two syllables of pitch for a four-syllable sentence.
    await pumpScreen(
      tester,
      samples: [
        ...syllable(dipping, startSeconds: 0.0),
        ...syllable(falling, startSeconds: 0.5),
      ],
    );

    await speak(tester);
    await scrollToTones(tester);

    expect(find.textContaining('Heard 2 syllables for 4'), findsOneWidget);
    expect(find.textContaining('right'), findsNothing);
  });

  testWidgets('falls back to the gloss when sentences cannot be translated', (
    tester,
  ) async {
    await pumpScreen(tester, samples: saidCorrectly(), sentence: null);

    await speak(tester);

    expect(find.text('I want to eat.'), findsNothing);
    expect(
      find.textContaining('Sentence translation is not available'),
      findsOneWidget,
    );
    expect(find.text('to eat a meal'), findsOneWidget);
  });

  testWidgets('keeps the transcript when the mic cannot be shared', (
    tester,
  ) async {
    // A browser that gives the microphone to the recogniser and not to us.
    await pumpScreen(tester, samples: const [], micBusy: true);

    await speak(tester);

    expect(find.text('我想吃饭'), findsOneWidget);
    expect(find.text('I want to eat.'), findsOneWidget);
    await scrollToTones(tester);
    expect(
      find.textContaining('Tone scoring needs its own microphone stream'),
      findsOneWidget,
    );
  });

  testWidgets('says so when the device has no Mandarin recogniser', (
    tester,
  ) async {
    await pumpScreen(tester, samples: const [], available: false);

    expect(find.text('Speech recognition unavailable'), findsOneWidget);
    expect(
      find.text('No Mandarin speech recognition on this device.'),
      findsOneWidget,
    );
  });
}
