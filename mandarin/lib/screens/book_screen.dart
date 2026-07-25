import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/story.dart';
import '../services/library_shelf.dart';
import '../services/story_repository.dart';
import 'reader_screen.dart';

/// A book's cover page: what it is about, how far through it you are, and the
/// list of chapters to read in order.
class BookScreen extends StatefulWidget {
  const BookScreen({
    super.key,
    required this.entry,
    required this.repository,
  });

  final BookEntry entry;
  final StoryRepository repository;

  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  Set<String> _completed = const {};
  Map<String, int> _progress = const {};

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final preferences = await SharedPreferences.getInstance();
    const prefix = 'mandarin.progress.';
    final progress = <String, int>{
      for (final key in preferences.getKeys())
        if (key.startsWith(prefix))
          key.substring(prefix.length): preferences.getInt(key) ?? 0,
    };
    if (!mounted) return;
    setState(() {
      _completed =
          preferences.getStringList('mandarin.completedStories')?.toSet() ??
          const {};
      _progress = progress;
    });
  }

  int get _chaptersRead =>
      widget.entry.chapters.where((c) => _completed.contains(c.id)).length;

  /// The first unfinished chapter — what "Start reading" should open.
  StorySummary? get _nextChapter {
    for (final chapter in widget.entry.chapters) {
      if (!_completed.contains(chapter.id)) return chapter;
    }
    return null;
  }

  double _progressFor(StorySummary chapter) {
    if (_completed.contains(chapter.id)) return 1;
    final index = _progress[chapter.id];
    if (index == null || chapter.segmentCount <= 0) return 0;
    return ((index + 1) / chapter.segmentCount).clamp(0.0, 1.0);
  }

  Future<void> _openChapter(StorySummary chapter) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            ReaderScreen(summary: chapter, repository: widget.repository),
      ),
    );
    await _loadProgress();
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final book = entry.book;
    final total = entry.totalChapters;
    final read = _chaptersRead;
    final next = _nextChapter;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      appBar: AppBar(
        title: Text(book.titleEnglish),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
        children: [
          _BookHeader(
            book: book,
            level: entry.level,
            chaptersRead: read,
            totalChapters: total,
            publishedChapters: entry.chapters.length,
          ),
          const SizedBox(height: 20),
          if (next != null)
            FilledButton.icon(
              onPressed: () => _openChapter(next),
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text(
                read == 0
                    ? 'Start chapter 1'
                    : 'Continue chapter ${next.book?.chapterNumber ?? read + 1}',
              ),
            )
          else
            const _BookFinished(),
          const SizedBox(height: 24),
          Text(
            'Chapters',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          for (final chapter in entry.chapters)
            _ChapterTile(
              chapter: chapter,
              completed: _completed.contains(chapter.id),
              progress: _progressFor(chapter),
              onTap: () => _openChapter(chapter),
            ),
          if (entry.chapters.length < total) ...[
            const SizedBox(height: 14),
            Text(
              '${total - entry.chapters.length} more '
              '${total - entry.chapters.length == 1 ? 'chapter is' : 'chapters are'} '
              'still being made.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: const Color(0xFF7D827E),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BookHeader extends StatelessWidget {
  const _BookHeader({
    required this.book,
    required this.level,
    required this.chaptersRead,
    required this.totalChapters,
    required this.publishedChapters,
  });

  final BookRef book;
  final String level;
  final int chaptersRead;
  final int totalChapters;
  final int publishedChapters;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE3DED2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 76,
                height: 98,
                decoration: BoxDecoration(
                  color: const Color(0xFFE3EFE9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    book.titleChinese.isEmpty
                        ? '书'
                        : book.titleChinese.characters.first,
                    style: const TextStyle(
                      color: MandarinReaderApp.jade,
                      fontSize: 34,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (book.titleChinese.isNotEmpty)
                      Text(
                        book.titleChinese,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    if (book.titlePinyin.isNotEmpty)
                      Text(
                        book.titlePinyin,
                        style: const TextStyle(
                          color: MandarinReaderApp.jade,
                          fontSize: 14,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      book.titleEnglish,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: const Color(0xFF646B66),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              if (level.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFE8DF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    level,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: const Color(0xFF9D4132),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const Spacer(),
              ],
              Text(
                '$chaptersRead/$totalChapters chapters read',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF657068),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: totalChapters == 0 ? 0 : chaptersRead / totalChapters,
              minHeight: 7,
              backgroundColor: const Color(0xFFE8E3D7),
              color: MandarinReaderApp.jade,
            ),
          ),
          if (book.summaryEnglish.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              book.summaryEnglish,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF4C544F),
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BookFinished extends StatelessWidget {
  const _BookFinished();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F2EB),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Row(
        children: [
          Icon(Icons.emoji_events_rounded, color: MandarinReaderApp.jade),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'You finished every published chapter — 太好了!',
              style: TextStyle(
                color: MandarinReaderApp.ink,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChapterTile extends StatelessWidget {
  const _ChapterTile({
    required this.chapter,
    required this.completed,
    required this.progress,
    required this.onTap,
  });

  final StorySummary chapter;
  final bool completed;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final number = chapter.book?.chapterNumber ?? 0;
    final chapterTitle = chapter.book?.chapterTitleEnglish;
    final title = (chapterTitle == null || chapterTitle.isEmpty)
        ? chapter.titleEnglish
        : chapterTitle;
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0xFFE3DED2)),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: completed
                      ? MandarinReaderApp.jade
                      : const Color(0xFFE3EFE9),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: completed
                      ? const Icon(Icons.check, color: Colors.white, size: 20)
                      : Text(
                          '$number',
                          style: const TextStyle(
                            color: MandarinReaderApp.jade,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: MandarinReaderApp.ink,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (chapter.titleChinese.isNotEmpty)
                      Text(
                        chapter.titleChinese,
                        style: const TextStyle(
                          color: Color(0xFF657068),
                          fontSize: 13,
                        ),
                      ),
                    if (!completed && progress > 0) ...[
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 4,
                          backgroundColor: const Color(0xFFE8E3D7),
                          color: MandarinReaderApp.jade,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${chapter.segmentCount} parts',
                style: const TextStyle(
                  color: Color(0xFF7D827E),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
