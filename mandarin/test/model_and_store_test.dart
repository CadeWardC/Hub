import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/services/learning_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fixtures.dart';

void main() {
  test(
    'story document parses blocks, tokens, and future traditional field',
    () {
      final story = testStory();
      expect(story.level, MandarinLevel.newbie);
      expect(story.blocks.single.tokens.first.gloss, 'hello');
      expect(story.blocks.single.traditional, isNull);
    },
  );

  test('learning state persists progress, settings, and saved words', () async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final controller = LearningController(preferences);
    controller.setPinyinMode(PinyinMode.difficult);
    controller.setProgress('test-story', 3, completed: true);
    controller.toggleSavedWord(
      const SavedWord(
        text: '你好',
        pinyin: 'nǐ hǎo',
        gloss: 'hello',
        storyId: 'test-story',
        storyTitle: '小故事',
        blockId: 'b001',
      ),
    );

    final restored = LearningController(preferences).state;
    expect(restored.pinyinMode, PinyinMode.difficult);
    expect(restored.progress['test-story']?.completed, isTrue);
    expect(restored.savedWords.single.text, '你好');
  });
}
