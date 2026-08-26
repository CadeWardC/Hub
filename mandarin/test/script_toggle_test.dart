import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/screens/reader_screen.dart';
import 'package:mandarin_reader/services/story_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'word_menu_test.dart' show FixtureRepository, fixtureSummary;

/// A story published without any Simplified text, to check the chip hides
/// rather than offering a switch that changes nothing.
const traditionalOnlyJson = {
  'storyId': 'traditional-only',
  'title': {'english': 'Chinese', 'chinese': '中文', 'pinyin': 'Zhōngwén'},
  'level': 'TOCFL Novice 1',
  'summary': {'english': 'Just Chinese.', 'chinese': '中文'},
  'segments': [
    {
      'id': '001',
      'english': 'Chinese.',
      'chinese': '中文。',
      'pinyin': 'Zhōngwén.',
      'audioText': '中文。',
      'words': [
        {'text': '中文', 'pinyin': 'Zhōngwén', 'english': 'Chinese'},
        {'text': '。', 'pinyin': '', 'english': ''},
      ],
    },
  ],
  'vocabulary': [],
};

class TraditionalOnlyRepository extends StoryRepository {
  const TraditionalOnlyRepository();

  @override
  Future<Story> loadStory(StorySummary summary) async => Story.fromJson(
    Map<String, dynamic>.from(traditionalOnlyJson),
    assetPath: summary.path,
  );
}

Future<void> pumpReader(WidgetTester tester, StoryRepository repository) async {
  await tester.pumpWidget(
    MaterialApp(
      home: ReaderScreen(summary: fixtureSummary, repository: repository),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('the reader opens in Traditional', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await pumpReader(tester, const FixtureRepository());

    expect(find.text('繁 Traditional'), findsOneWidget);
    expect(find.text('貓'), findsWidgets);
    expect(find.text('猫'), findsNothing);
  });

  testWidgets('tapping the chip switches the story to Simplified', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await pumpReader(tester, const FixtureRepository());

    await tester.tap(find.text('繁 Traditional'));
    await tester.pumpAndSettle();

    expect(find.text('简 Simplified'), findsOneWidget);
    expect(find.text('猫'), findsWidgets);
    expect(find.text('貓'), findsNothing);
  });

  testWidgets('the choice is remembered for the next story', (tester) async {
    SharedPreferences.setMockInitialValues({
      'mandarin.script.v1': 'simplified',
    });
    await pumpReader(tester, const FixtureRepository());

    expect(find.text('简 Simplified'), findsOneWidget);
    expect(find.text('猫'), findsWidgets);
  });

  testWidgets('words a story shares between scripts are left alone', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'mandarin.script.v1': 'simplified',
    });
    await pumpReader(tester, const FixtureRepository());

    // 我 and 是 are written the same either way, so they render unchanged even
    // in Simplified — the fallback in the model, not a missing translation.
    expect(find.text('我'), findsWidgets);
    expect(find.text('是'), findsWidgets);
  });

  testWidgets('a Traditional-only story hides the chip', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await pumpReader(tester, const TraditionalOnlyRepository());

    expect(find.text('繁 Traditional'), findsNothing);
    expect(find.text('简 Simplified'), findsNothing);
    // The other display chips are still there.
    expect(find.text('拼 Pinyin'), findsOneWidget);
  });
}
