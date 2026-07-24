import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/story.dart';
import '../services/story_repository.dart';
import 'my_reading_screen.dart';
import 'reader_screen.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key, required this.repository});

  final StoryRepository repository;

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  late Future<List<StorySummary>> _stories;
  String _filter = 'All';
  int _tabIndex = 0;
  Set<String> _completedStories = const {};
  Map<String, int> _progress = const {};
  String? _lastReadId;

  @override
  void initState() {
    super.initState();
    _stories = widget.repository.loadLibrary();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final preferences = await SharedPreferences.getInstance();
    const progressPrefix = 'mandarin.progress.';
    final progress = <String, int>{
      for (final key in preferences.getKeys())
        if (key.startsWith(progressPrefix))
          key.substring(progressPrefix.length): preferences.getInt(key) ?? 0,
    };
    String? lastReadId;
    final rawLastRead = preferences.getString('mandarin.lastRead.v1');
    if (rawLastRead != null) {
      try {
        lastReadId =
            (jsonDecode(rawLastRead) as Map<String, dynamic>)['storyId']
                as String?;
      } catch (_) {}
    }
    if (!mounted) return;
    setState(() {
      _completedStories =
          preferences.getStringList('mandarin.completedStories')?.toSet() ??
          const {};
      _progress = progress;
      _lastReadId = lastReadId;
    });
  }

  Future<void> _refresh() async {
    setState(() => _stories = widget.repository.loadLibrary());
    await _stories;
    await _loadProgress();
  }

  /// A "Continue reading" card for the most recently opened, unfinished
  /// story; empty when there is nothing to resume.
  List<Widget> _continueReadingSlivers(List<StorySummary> stories) {
    final lastReadId = _lastReadId;
    if (lastReadId == null || _completedStories.contains(lastReadId)) {
      return const [];
    }
    final matches = stories.where((story) => story.id == lastReadId);
    if (matches.isEmpty) return const [];
    final story = matches.first;
    return [
      SliverToBoxAdapter(
        child: _ContinueReadingCard(
          story: story,
          progress: _progressFor(story),
          onTap: () => _openStory(story),
        ),
      ),
    ];
  }

  double _progressFor(StorySummary story) {
    if (_completedStories.contains(story.id)) return 1;
    final index = _progress[story.id];
    if (index == null || story.segmentCount <= 0) return 0;
    return ((index + 1) / story.segmentCount).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: _tabIndex == 1
            ? const MyReadingScreen()
            : FutureBuilder<List<StorySummary>>(
          future: _stories,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return _LibraryError(onRetry: _refresh);
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final allStories = snapshot.data!;
            final levels = <String>[
              'All',
              ...{for (final story in allStories) story.level},
            ];
            final stories = _filter == 'All'
                ? allStories
                : allStories.where((story) => story.level == _filter).toList();

            return RefreshIndicator(
              onRefresh: _refresh,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: _LibraryHero(storyCount: allStories.length),
                  ),
                  ..._continueReadingSlivers(allStories),
                  SliverToBoxAdapter(
                    child: _LevelFilters(
                      levels: levels,
                      selected: _filter,
                      onSelected: (value) => setState(() => _filter = value),
                    ),
                  ),
                  if (stories.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: _EmptyLibrary(),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                      sliver: SliverList.separated(
                        itemCount: stories.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final story = stories[index];
                          return _StoryCard(
                            story: story,
                            completed: _completedStories.contains(story.id),
                            progress: _progressFor(story),
                            onTap: () => _openStory(story),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.auto_stories_outlined),
            selectedIcon: Icon(Icons.auto_stories),
            label: 'Stories',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_border),
            selectedIcon: Icon(Icons.bookmark),
            label: 'My reading',
          ),
        ],
        onDestinationSelected: (index) {
          setState(() => _tabIndex = index);
          if (index == 0) _loadProgress();
        },
      ),
    );
  }

  Future<void> _openStory(StorySummary summary) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            ReaderScreen(summary: summary, repository: widget.repository),
      ),
    );
    await _loadProgress();
  }
}

class _LibraryHero extends StatelessWidget {
  const _LibraryHero({required this.storyCount});

  final int storyCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: MandarinReaderApp.ink,
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF183C31), Color(0xFF286B55)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x28286B55),
            blurRadius: 30,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'GRADED MANDARIN',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: const Color(0xFFB7DFCC),
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.6,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Read a little.\nUnderstand a lot.',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    height: 1.12,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '$storyCount ${storyCount == 1 ? 'story' : 'stories'} with pinyin, translation, and narration.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFFD5E8DE),
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Container(
            width: 82,
            height: 112,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4D2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(
              child: Text(
                '读',
                style: TextStyle(
                  color: Color(0xFFB54836),
                  fontSize: 45,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LevelFilters extends StatelessWidget {
  const _LevelFilters({
    required this.levels,
    required this.selected,
    required this.onSelected,
  });

  final List<String> levels;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        scrollDirection: Axis.horizontal,
        itemCount: levels.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final level = levels[index];
          return ChoiceChip(
            label: Text(level),
            selected: level == selected,
            onSelected: (_) => onSelected(level),
          );
        },
      ),
    );
  }
}

class _ContinueReadingCard extends StatelessWidget {
  const _ContinueReadingCard({
    required this.story,
    required this.progress,
    required this.onTap,
  });

  final StorySummary story;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: Card(
        clipBehavior: Clip.antiAlias,
        color: const Color(0xFFEFF6F1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFCBE2D5)),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CONTINUE READING',
                  style: TextStyle(
                    color: MandarinReaderApp.jade,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${story.titleChinese} · ${story.titleEnglish}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: MandarinReaderApp.ink,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.play_circle_fill_rounded,
                      color: MandarinReaderApp.jade,
                      size: 30,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFD8E8DE),
                    color: MandarinReaderApp.jade,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({
    required this.story,
    required this.completed,
    required this.progress,
    required this.onTap,
  });

  final StorySummary story;
  final bool completed;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final minutes = story.durationSeconds > 0
        ? (story.durationSeconds / 60).ceil()
        : (story.segmentCount / 3).ceil().clamp(1, 99);
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: Color(0xFFE3DED2)),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 66,
                height: 84,
                decoration: BoxDecoration(
                  color: const Color(0xFFE3EFE9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    story.titleChinese.isEmpty
                        ? '文'
                        : story.titleChinese.characters.first,
                    style: const TextStyle(
                      color: MandarinReaderApp.jade,
                      fontSize: 30,
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
                    Row(
                      children: [
                        _LevelBadge(level: story.level),
                        if (completed) ...[
                          const Spacer(),
                          const Icon(
                            Icons.check_circle,
                            color: MandarinReaderApp.jade,
                            size: 19,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      story.titleChinese,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      story.titleEnglish,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xFF657068),
                      ),
                    ),
                    if (story.summaryEnglish.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        story.summaryEnglish,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF657068),
                          height: 1.4,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.headphones, size: 15),
                        const SizedBox(width: 5),
                        Text('$minutes min'),
                        const SizedBox(width: 14),
                        const Icon(Icons.segment, size: 15),
                        const SizedBox(width: 5),
                        Text('${story.segmentCount} parts'),
                      ],
                    ),
                    if (!completed && progress > 0) ...[
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 5,
                          backgroundColor: const Color(0xFFE8E3D7),
                          color: MandarinReaderApp.jade,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LevelBadge extends StatelessWidget {
  const _LevelBadge({required this.level});

  final String level;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
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
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('新', style: TextStyle(fontSize: 52)),
            const SizedBox(height: 14),
            Text(
              'No stories at this level yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Publish one from the local Story Workshop, then rebuild the app.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryError extends StatelessWidget {
  const _LibraryError({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.menu_book_outlined, size: 46),
            const SizedBox(height: 14),
            const Text('The story library could not be loaded.'),
            const SizedBox(height: 14),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}
