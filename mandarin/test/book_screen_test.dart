import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/screens/book_screen.dart';
import 'package:mandarin_reader/services/library_shelf.dart';
import 'package:mandarin_reader/services/story_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

StorySummary chapter(int number, {int of = 12}) {
  return StorySummary.fromJson({
    'id': 'cat-$number',
    'path': 'assets/content/stories/cat-$number.json',
    'titleEnglish': 'Chapter $number',
    'titleChinese': '第$number章',
    'level': 'HSK 1',
    'segmentCount': 12,
    'durationSeconds': 70,
    'book': {
      'id': 'cat',
      'titleEnglish': "I'm a Cat",
      'titleChinese': '我是猫',
      'titlePinyin': 'Wǒ shì māo',
      'summaryEnglish': 'A stray cat looks for a home.',
      'chapterNumber': number,
      'chapterCount': of,
      'chapterTitleEnglish': 'What is Home? $number',
    },
  });
}

Future<void> pumpBook(WidgetTester tester, BookEntry entry) async {
  await tester.pumpWidget(
    MaterialApp(
      home: BookScreen(entry: entry, repository: const StoryRepository()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows chapter progress and the next chapter to read', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'mandarin.completedStories': ['cat-1', 'cat-2'],
    });
    final entry = BookEntry(
      book: chapter(1).book!,
      chapters: [chapter(1), chapter(2), chapter(3)],
    );

    await pumpBook(tester, entry);

    expect(find.text('我是猫'), findsOneWidget);
    expect(find.text('A stray cat looks for a home.'), findsOneWidget);
    // Two of the book's advertised twelve chapters are done.
    expect(find.text('2/12 chapters read'), findsOneWidget);
    expect(find.text('Continue chapter 3'), findsOneWidget);
    // Chapter titles come from the book, not the story file.
    expect(find.text('What is Home? 3'), findsOneWidget);
    // The unpublished remainder is called out rather than silently missing;
    // it sits below the fold, so scroll to it.
    await tester.drag(find.byType(ListView), const Offset(0, -400));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('9 more chapters are still being made'),
      findsOneWidget,
    );
  });

  testWidgets('starts at chapter 1 when nothing has been read', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final entry = BookEntry(
      book: chapter(1, of: 2).book!,
      chapters: [chapter(1, of: 2), chapter(2, of: 2)],
    );

    await pumpBook(tester, entry);

    expect(find.text('0/2 chapters read'), findsOneWidget);
    expect(find.text('Start chapter 1'), findsOneWidget);
  });

  testWidgets('celebrates instead of offering a chapter when the book is done', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'mandarin.completedStories': ['cat-1', 'cat-2'],
    });
    final entry = BookEntry(
      book: chapter(1, of: 2).book!,
      chapters: [chapter(1, of: 2), chapter(2, of: 2)],
    );

    await pumpBook(tester, entry);

    expect(find.text('2/2 chapters read'), findsOneWidget);
    expect(find.textContaining('Start chapter'), findsNothing);
    expect(find.textContaining('You finished every published chapter'), findsOneWidget);
  });
}
