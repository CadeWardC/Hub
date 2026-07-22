import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/services/reader_audio_controller.dart';

import 'test_fixtures.dart';

void main() {
  test('audio controller maps every block to a packaged asset', () {
    expect(ReaderAudioController.audioAssetsFor(testStory()), [
      'assets/content/stories/test-story/audio/b001.mp3',
    ]);
  });

  test('sentence pauses map back to the sentence before them', () {
    expect(
      ReaderAudioController.sentenceGapAsset,
      'assets/audio/sentence-gap.mp3',
    );
    expect(ReaderAudioController.sequenceIndexForBlock(3), 6);
    expect(ReaderAudioController.blockIndexForSequenceIndex(6), 3);
    expect(ReaderAudioController.blockIndexForSequenceIndex(7), 3);
    expect(ReaderAudioController.audioSequenceFor(testStory()), hasLength(1));

    final json = jsonDecode(storyJson) as Map<String, dynamic>;
    final blocks = json['blocks'] as List<dynamic>;
    blocks.add({...blocks.first as Map<String, dynamic>, 'id': 'b002'});
    final twoBlockStory = StoryDocument.fromJson(json);
    expect(ReaderAudioController.audioSequenceFor(twoBlockStory), hasLength(3));
    expect(
      ReaderAudioController.audioSequenceFor(twoBlockStory, pace: .5),
      hasLength(6),
    );
    expect(ReaderAudioController.gapCountForPace(.5), 4);
    expect(ReaderAudioController.speechSpeedForPace(.5), .88);
    expect(ReaderAudioController.sequenceIndexForBlock(1, .5), 5);
    expect(ReaderAudioController.blockIndexForSequenceIndex(9, .5), 1);
  });
}
