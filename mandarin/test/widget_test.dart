import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/main.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/screens/reader_screen.dart';
import 'package:mandarin_reader/services/story_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Pumps frames until [finder] matches, yielding to the event loop each time
/// so real asset loading (story JSON, library index) can complete.
Future<void> pumpUntilFound(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 100; i++) {
    if (tester.any(finder)) return;
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  testWidgets('shows the graded story library and reader', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    // The test drives whichever story is first in the published library so
    // publishing or deleting stories in the workshop cannot break it.
    const repository = StoryRepository();
    final summaries = await repository.loadLibrary();
    expect(summaries, isNotEmpty);
    final summary = summaries.first;
    final story = await repository.loadStory(summary);

    await tester.pumpWidget(const MandarinReaderApp());
    await tester.pumpAndSettle();
    await pumpUntilFound(tester, find.text(summary.titleEnglish));

    expect(find.text('Read a little.\nUnderstand a lot.'), findsOneWidget);
    expect(find.text(summary.titleChinese), findsWidgets);

    await tester.pumpWidget(
      MaterialApp(
        home: ReaderScreen(summary: summary, repository: repository),
      ),
    );
    await pumpUntilFound(tester, find.text('Tap a word for its meaning'));

    expect(find.text('Tap a word for its meaning'), findsOneWidget);
    // The docked player bar shows position and speed.
    expect(find.text('1 / ${story.segments.length}'), findsOneWidget);
    expect(find.text('1.0×'), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

    // Tap a word from the first sentence; its definition appears in the
    // pinned translation panel.
    final candidates = [
      ...story.segments
          .expand((segment) => segment.words)
          .where((word) => word.english.isNotEmpty && word.text.isNotEmpty),
      for (final item in story.vocabulary)
        StoryWord(
          text: item.simplified,
          pinyin: item.pinyin,
          english: item.english,
        ),
    ];
    final word = candidates.first;
    await tester.tap(find.text(word.text).first);
    await tester.pumpAndSettle();

    expect(find.text(word.english), findsWidgets);
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);
    // The word view offers a bookmark to save the word.
    expect(find.byIcon(Icons.bookmark_border_rounded), findsOneWidget);

    // Dismiss the held word with the panel's close button; let the panel's
    // switcher animation finish before asserting it is gone.
    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.close_rounded), findsNothing);

    if (story.vocabulary.isEmpty) return;

    // Tapping an entry in the vocabulary list shows its definition in the
    // pinned translation panel.
    await tester.scrollUntilVisible(
      find.text('Useful words'),
      400,
      scrollable: find.descendant(
        of: find.byKey(const Key('storyScroll')),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.ensureVisible(find.byType(ListTile).first);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(ListTile).first);
    await tester.pump(const Duration(milliseconds: 300));

    // The panel's word view (with its dismiss button) replaces the sentence
    // translation.
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);
  });
}
