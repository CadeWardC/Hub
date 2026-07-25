import '../models/story.dart';

/// One row of the library: either a standalone story or a book whose chapters
/// are collapsed behind a single cover.
sealed class ShelfEntry {
  const ShelfEntry();

  String get level;
}

class StoryEntry extends ShelfEntry {
  const StoryEntry(this.story);

  final StorySummary story;

  @override
  String get level => story.level;
}

class BookEntry extends ShelfEntry {
  const BookEntry({required this.book, required this.chapters});

  final BookRef book;

  /// Published chapters, ordered by chapter number. A book can be part-way
  /// published, so this is not always [BookRef.chapterCount] long.
  final List<StorySummary> chapters;

  @override
  String get level => chapters.isEmpty ? '' : chapters.first.level;

  /// What the book advertises, falling back to the chapters actually present
  /// when the workshop did not record a count.
  int get totalChapters =>
      book.chapterCount > 0 ? book.chapterCount : chapters.length;

  int get segmentCount =>
      chapters.fold(0, (total, chapter) => total + chapter.segmentCount);

  int get durationSeconds =>
      chapters.fold(0, (total, chapter) => total + chapter.durationSeconds);
}

/// Groups a published library into shelf rows.
///
/// Chapters of the same book collapse into one [BookEntry] positioned where
/// the book's first chapter appeared, so the index's ordering still decides
/// what the reader sees first. Chapters are sorted by chapter number rather
/// than publish order, because a book is read front to back.
List<ShelfEntry> buildShelf(List<StorySummary> stories) {
  final entries = <ShelfEntry>[];
  final bookChapters = <String, List<StorySummary>>{};
  final bookSlots = <String, int>{};

  for (final story in stories) {
    final book = story.book;
    if (book == null) {
      entries.add(StoryEntry(story));
      continue;
    }
    final chapters = bookChapters.putIfAbsent(book.id, () => []);
    if (chapters.isEmpty) {
      bookSlots[book.id] = entries.length;
      // Placeholder, replaced once every chapter has been seen.
      entries.add(StoryEntry(story));
    }
    chapters.add(story);
  }

  for (final id in bookChapters.keys) {
    final chapters = [...bookChapters[id]!]
      ..sort((a, b) {
        final left = a.book?.chapterNumber ?? 0;
        final right = b.book?.chapterNumber ?? 0;
        return left.compareTo(right);
      });
    entries[bookSlots[id]!] = BookEntry(
      book: chapters.first.book!,
      chapters: chapters,
    );
  }

  return entries;
}
