import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/screens/reader_screen.dart';
import 'package:mandarin_reader/services/saved_words_store.dart';
import 'package:mandarin_reader/services/story_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A two-sentence story served without touching the published assets, so the
/// menu tests do not depend on whatever happens to be in the library.
const fixtureJson = {
  'storyId': 'fixture',
  'title': {
    'english': 'The Cat',
    'chinese': '貓',
    'chineseSimplified': '猫',
    'pinyin': 'Māo',
  },
  'level': 'TOCFL Novice 1',
  'summary': {'english': 'A cat eats.', 'chinese': '貓吃飯。'},
  'segments': [
    {
      'id': '001',
      'english': 'I am a cat.',
      'chinese': '我是貓。',
      'chineseSimplified': '我是猫。',
      'pinyin': 'Wǒ shì māo.',
      'audioText': '我是貓。',
      'words': [
        {'text': '我', 'pinyin': 'wǒ', 'english': 'I; me'},
        {'text': '是', 'pinyin': 'shì', 'english': 'to be'},
        {'text': '貓', 'textSimplified': '猫', 'pinyin': 'māo', 'english': 'cat'},
        {'text': '。', 'pinyin': '', 'english': ''},
      ],
    },
    {
      'id': '002',
      'english': 'I like to eat.',
      'chinese': '我喜歡吃飯。',
      'chineseSimplified': '我喜欢吃饭。',
      'pinyin': 'Wǒ xǐhuān chī fàn.',
      'audioText': '我喜歡吃飯。',
      'words': [
        {'text': '我', 'pinyin': 'wǒ', 'english': 'I; me'},
        {
          'text': '喜歡',
          'textSimplified': '喜欢',
          'pinyin': 'xǐhuān',
          'english': 'to like',
        },
        {
          'text': '吃飯',
          'textSimplified': '吃饭',
          'pinyin': 'chī fàn',
          'english': 'to eat',
        },
        {'text': '。', 'pinyin': '', 'english': ''},
      ],
    },
  ],
  'vocabulary': [],
};

final fixtureSummary = StorySummary.fromJson({
  'id': 'fixture',
  'path': 'assets/content/stories/fixture.json',
  'titleEnglish': 'The Cat',
  'titleChinese': '貓',
  'titleChineseSimplified': '猫',
  'level': 'TOCFL Novice 1',
  'segmentCount': 2,
});

class FixtureRepository extends StoryRepository {
  const FixtureRepository();

  @override
  Future<List<StorySummary>> loadLibrary() async => [fixtureSummary];

  @override
  Future<Story> loadStory(StorySummary summary) async => Story.fromJson(
    Map<String, dynamic>.from(fixtureJson),
    assetPath: summary.path,
  );
}

/// Opens the reader on the fixture and returns a word from its first sentence.
Future<StoryWord> openReader(WidgetTester tester) async {
  const repository = FixtureRepository();
  final story = await repository.loadStory(fixtureSummary);

  await tester.pumpWidget(
    MaterialApp(
      home: ReaderScreen(summary: fixtureSummary, repository: repository),
    ),
  );
  await tester.pumpAndSettle();
  return story.segments.first.words.firstWhere(
    (word) => word.english.isNotEmpty && word.text.isNotEmpty,
  );
}

void main() {
  testWidgets('holding a word opens the action menu above it', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final word = await openReader(tester);
    final wordCenter = tester.getCenter(find.text(word.text).first);

    final gesture = await tester.startGesture(wordCenter);
    await tester.pumpAndSettle();

    expect(find.text('Save'), findsOneWidget);
    expect(find.text('Dictionary'), findsOneWidget);
    // The menu sits above the word so a finger does not cover it.
    expect(tester.getCenter(find.text('Save')).dy, lessThan(wordCenter.dy));

    await gesture.up();
    await tester.pumpAndSettle();
    expect(find.text('Save'), findsNothing);
  });

  testWidgets('dragging onto Save and releasing saves the word', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final word = await openReader(tester);
    final wordCenter = tester.getCenter(find.text(word.text).first);

    final gesture = await tester.startGesture(wordCenter);
    await tester.pumpAndSettle();
    await gesture.moveTo(tester.getCenter(find.text('Save')));
    await tester.pumpAndSettle();
    await gesture.up();
    await tester.pumpAndSettle();

    final saved = await SavedWordsStore.load();
    expect(saved.map((entry) => entry.text), [word.text]);
    expect(saved.single.pinyin, word.pinyin);
    expect(find.textContaining('Saved ${word.text}'), findsOneWidget);
  });

  testWidgets('the open menu does not block sliding to the next word', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await openReader(tester);

    // 我 and 是 sit side by side in the first sentence, under the menu.
    final gesture = await tester.startGesture(
      tester.getCenter(find.text('我').first),
    );
    await tester.pumpAndSettle();
    expect(find.text('I; me'), findsWidgets);

    await gesture.moveTo(tester.getCenter(find.text('是').first));
    await tester.pumpAndSettle();

    expect(find.text('to be'), findsWidgets);
    expect(find.text('I; me'), findsNothing);
    await gesture.up();
  });

  testWidgets('releasing off the menu saves nothing', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final word = await openReader(tester);

    final gesture = await tester.startGesture(
      tester.getCenter(find.text(word.text).first),
    );
    await tester.pumpAndSettle();
    await gesture.up();
    await tester.pumpAndSettle();

    expect(await SavedWordsStore.load(), isEmpty);
  });

  testWidgets('dragging onto Dictionary opens the dictionary for that word', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final word = await openReader(tester);

    final gesture = await tester.startGesture(
      tester.getCenter(find.text(word.text).first),
    );
    await tester.pumpAndSettle();
    await gesture.moveTo(tester.getCenter(find.text('Dictionary')));
    await tester.pumpAndSettle();
    await gesture.up();
    // Not pumpAndSettle: the bundled dictionary is ten megabytes and decodes
    // on a background isolate behind a spinner that never settles.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // The dictionary screen opens with the word already in its search field.
    expect(find.widgetWithText(AppBar, word.text), findsOneWidget);
    expect(find.text('Search 汉字, pinyin, or English'), findsOneWidget);
    expect(find.widgetWithText(TextField, word.text), findsOneWidget);

    // Tear the tree down so the loading spinner's ticker does not outlive it.
    await tester.pumpWidget(const SizedBox());
  });
}
