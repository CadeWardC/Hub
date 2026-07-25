import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/models/story.dart';
import 'package:mandarin_reader/services/library_shelf.dart';

StorySummary story(
  String id, {
  String? bookId,
  int chapterNumber = 0,
  int chapterCount = 0,
  int segmentCount = 10,
  int durationSeconds = 60,
  String level = 'HSK 1',
}) {
  return StorySummary.fromJson({
    'id': id,
    'path': 'assets/content/stories/$id.json',
    'titleEnglish': id,
    'titleChinese': '猫',
    'titlePinyin': 'māo',
    'summaryEnglish': '',
    'summaryChinese': '',
    'level': level,
    'segmentCount': segmentCount,
    'durationSeconds': durationSeconds,
    'publishedAt': '2026-07-24T00:00:00+00:00',
    if (bookId != null)
      'book': {
        'id': bookId,
        'titleEnglish': "I'm a Cat",
        'titleChinese': '我是猫',
        'titlePinyin': 'Wǒ shì māo',
        'summaryEnglish': 'A stray cat looks for a home.',
        'chapterNumber': chapterNumber,
        'chapterCount': chapterCount,
        'chapterTitleEnglish': 'Chapter $chapterNumber',
        'chapterTitleChinese': '第$chapterNumber章',
      },
  });
}

void main() {
  test('a story without a book stays a standalone shelf entry', () {
    final shelf = buildShelf([story('solo')]);

    expect(shelf, hasLength(1));
    expect(shelf.single, isA<StoryEntry>());
    expect(shelf.single.level, 'HSK 1');
    expect(story('solo').book, isNull);
  });

  test('chapters of one book collapse into a single entry', () {
    final shelf = buildShelf([
      story('cat-1', bookId: 'cat', chapterNumber: 1, chapterCount: 12),
      story('cat-2', bookId: 'cat', chapterNumber: 2, chapterCount: 12),
      story('cat-3', bookId: 'cat', chapterNumber: 3, chapterCount: 12),
    ]);

    expect(shelf, hasLength(1));
    final entry = shelf.single as BookEntry;
    expect(entry.book.titleEnglish, "I'm a Cat");
    expect(entry.chapters, hasLength(3));
    // The book advertises twelve chapters even though three are published.
    expect(entry.totalChapters, 12);
    expect(entry.segmentCount, 30);
    expect(entry.durationSeconds, 180);
  });

  test('chapters are ordered by chapter number, not publish order', () {
    final shelf = buildShelf([
      story('cat-3', bookId: 'cat', chapterNumber: 3, chapterCount: 3),
      story('cat-1', bookId: 'cat', chapterNumber: 1, chapterCount: 3),
      story('cat-2', bookId: 'cat', chapterNumber: 2, chapterCount: 3),
    ]);

    final entry = shelf.single as BookEntry;
    expect(
      entry.chapters.map((chapter) => chapter.book!.chapterNumber),
      [1, 2, 3],
    );
  });

  test('a book keeps the shelf position of its first published chapter', () {
    final shelf = buildShelf([
      story('solo-a'),
      story('cat-2', bookId: 'cat', chapterNumber: 2, chapterCount: 2),
      story('solo-b'),
      story('cat-1', bookId: 'cat', chapterNumber: 1, chapterCount: 2),
    ]);

    expect(shelf, hasLength(3));
    expect((shelf[0] as StoryEntry).story.id, 'solo-a');
    expect(shelf[1], isA<BookEntry>());
    expect((shelf[2] as StoryEntry).story.id, 'solo-b');
  });

  test('two books stay separate', () {
    final shelf = buildShelf([
      story('cat-1', bookId: 'cat', chapterNumber: 1, chapterCount: 2),
      story('dog-1', bookId: 'dog', chapterNumber: 1, chapterCount: 2),
      story('cat-2', bookId: 'cat', chapterNumber: 2, chapterCount: 2),
    ]);

    expect(shelf.whereType<BookEntry>(), hasLength(2));
    expect((shelf[0] as BookEntry).chapters, hasLength(2));
    expect((shelf[1] as BookEntry).chapters, hasLength(1));
  });

  test('a book with no recorded count falls back to its chapters', () {
    final shelf = buildShelf([
      story('cat-1', bookId: 'cat', chapterNumber: 1),
      story('cat-2', bookId: 'cat', chapterNumber: 2),
    ]);

    expect((shelf.single as BookEntry).totalChapters, 2);
  });
}
