import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/reader_audio_controller.dart';

import 'test_fixtures.dart';

void main() {
  test('audio controller maps every block to a packaged asset', () {
    expect(ReaderAudioController.audioAssetsFor(testStory()), [
      'assets/content/stories/test-story/audio/b001.mp3',
    ]);
  });
}
