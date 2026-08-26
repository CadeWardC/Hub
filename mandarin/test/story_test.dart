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
      level: 'TOCFL Novice 1',
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

  group('script selection', () {
    const both = StorySegment(
      id: '001',
      english: 'He studies Chinese.',
      chinese: '他學習中文。',
      chineseSimplified: '他学习中文。',
      pinyin: 'Tā xuéxí Zhōngwén.',
      audioText: '他學習中文。',
      audioFile: null,
      words: [
        StoryWord(
          text: '學習',
          textSimplified: '学习',
          pinyin: 'xuéxí',
          english: 'to study',
        ),
        StoryWord(text: '中文', pinyin: 'Zhōngwén', english: 'Chinese'),
      ],
    );

    test('returns the requested script', () {
      expect(both.chineseIn(ChineseScript.traditional), '他學習中文。');
      expect(both.chineseIn(ChineseScript.simplified), '他学习中文。');
      expect(both.words[0].textIn(ChineseScript.simplified), '学习');
    });

    test('falls back to traditional when no simplified form was derived', () {
      // 中文 is written the same either way, so the workshop stores nothing.
      expect(both.words[1].textIn(ChineseScript.simplified), '中文');
    });

    test('a story with no simplified text reports none', () {
      const only = StorySegment(
        id: '001',
        english: '',
        chinese: '中文',
        pinyin: '',
        audioText: '',
        audioFile: null,
        words: [],
      );

      expect(storyWith(both).hasSimplified, isTrue);
      expect(storyWith(only).hasSimplified, isFalse);
    });

    test('vocabulary follows the script and keys on traditional', () {
      const item = VocabularyItem(
        traditional: '學習',
        simplified: '学习',
        pinyin: 'xuéxí',
        english: 'to study',
      );

      expect(item.textIn(ChineseScript.traditional), '學習');
      expect(item.textIn(ChineseScript.simplified), '学习');
      expect(item.traditional, '學習');
    });

    test('a summary read from JSON carries both scripts', () {
      final summary = StorySummary.fromJson({
        'id': 'story',
        'path': 'assets/content/stories/story.json',
        'titleChinese': '學習',
        'titleChineseSimplified': '学习',
      });

      expect(summary.titleChineseIn(ChineseScript.traditional), '學習');
      expect(summary.titleChineseIn(ChineseScript.simplified), '学习');
      expect(summary.level, 'TOCFL Novice 1');
    });
  });
}
