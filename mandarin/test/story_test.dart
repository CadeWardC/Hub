import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';

void main() {
  Story storyWith(StorySegment segment) {
    return Story(
      id: 'story',
      assetDirectory: 'assets/content/stories',
      titleEnglish: '',
      titleChinese: '',
      titlePinyin: '',
      level: 'HSK 1',
      summaryEnglish: '',
      summaryChinese: '',
      summaryPinyin: '',
      segments: [segment],
      vocabulary: const [],
    );
  }

  const baseSegment = StorySegment(
    id: '001',
    english: '',
    chinese: '',
    pinyin: '',
    audioText: '',
    audioFile: 'assets/content/audio/story_001.wav',
    audioVariants: {
      '0.75': 'assets/content/audio/story_001_r075.wav',
      '0.5': 'assets/content/audio/story_001_r050.wav',
    },
    words: [],
  );

  test('slow speeds use the pre-generated variant at normal rate', () {
    final story = storyWith(baseSegment);
    final plan = story.audioPlanFor(baseSegment, 0.75)!;
    expect(plan.asset, 'assets/content/audio/story_001_r075.wav');
    expect(plan.playbackRate, 1.0);

    final slower = story.audioPlanFor(baseSegment, 0.5)!;
    expect(slower.asset, 'assets/content/audio/story_001_r050.wav');
    expect(slower.playbackRate, 1.0);
  });

  test('other speeds rate-adjust the normal file', () {
    final story = storyWith(baseSegment);
    for (final speed in const [1.0, 1.25, 1.5]) {
      final plan = story.audioPlanFor(baseSegment, speed)!;
      expect(plan.asset, 'assets/content/audio/story_001.wav');
      expect(plan.playbackRate, speed);
    }
  });

  test('missing variants fall back to rate adjustment', () {
    const segment = StorySegment(
      id: '001',
      english: '',
      chinese: '',
      pinyin: '',
      audioText: '',
      audioFile: 'assets/content/audio/story_001.wav',
      words: [],
    );
    final plan = storyWith(segment).audioPlanFor(segment, 0.5)!;
    expect(plan.asset, 'assets/content/audio/story_001.wav');
    expect(plan.playbackRate, 0.5);
  });

  test('segments without audio return no plan', () {
    const segment = StorySegment(
      id: '001',
      english: '',
      chinese: '',
      pinyin: '',
      audioText: '',
      audioFile: null,
      words: [],
    );
    expect(storyWith(segment).audioPlanFor(segment, 1.0), isNull);
  });
}
