import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/main.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/screens/reader_screen.dart';
import 'package:mandarin_reader/services/story_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('shows the graded story library', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MandarinReaderApp());
    await tester.pumpAndSettle();

    expect(find.text('Read a little.\nUnderstand a lot.'), findsOneWidget);
    expect(find.text('一杯热茶'), findsOneWidget);
    expect(find.text('A Cup of Hot Tea'), findsOneWidget);

    await tester.pumpWidget(
      const MaterialApp(
        home: ReaderScreen(
          summary: StorySummary(
            id: 'a-cat-looks-for-places-to-sleep-and-eat-1784840714',
            path:
                'assets/content/stories/a-cat-looks-for-places-to-sleep-and-eat-1784840714.json',
            titleEnglish: 'My Day as a Cat',
            titleChinese: '我当猫的一天',
            titlePinyin: 'Wǒ dāng māo de yì tiān',
            summaryEnglish: '',
            summaryChinese: '',
            level: 'HSK 1',
            segmentCount: 25,
            durationSeconds: 85,
            publishedAt: null,
          ),
          repository: StoryRepository(),
        ),
      ),
    );
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Hold a word · tap a sentence'), findsOneWidget);
    expect(find.text('1.0×'), findsOneWidget);

    await tester.longPress(find.text('猫').first);
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('cat'), findsOneWidget);
  });
}
