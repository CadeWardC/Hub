import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/app_providers.dart';
import '../services/learning_store.dart';
import '../theme.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(catalogProvider);
    final learning = ref.watch(learningProvider);
    return SafeArea(
      child: catalog.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _LoadError(message: error.toString()),
        data: (stories) => _LibraryBody(stories: stories, learning: learning),
      ),
    );
  }
}

class _LibraryBody extends ConsumerWidget {
  const _LibraryBody({required this.stories, required this.learning});
  final List<StoryCatalogEntry> stories;
  final LearningState learning;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visible = learning.selectedLevel == null
        ? stories
        : stories
              .where((story) => story.level.id == learning.selectedLevel)
              .toList();
    final inProgress = stories.where((story) {
      final progress = learning.progress[story.id];
      return progress != null && !progress.completed && progress.blockIndex > 0;
    }).toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1180),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Wordmark(),
                    const SizedBox(height: 54),
                    Wrap(
                      spacing: 32,
                      runSpacing: 20,
                      crossAxisAlignment: WrapCrossAlignment.end,
                      children: [
                        SizedBox(
                          width: 650,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'READ · LISTEN · UNDERSTAND',
                                style: Theme.of(context).textTheme.labelLarge
                                    ?.copyWith(
                                      color: cinnabar,
                                      letterSpacing: 2,
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Stories that meet you where you are.',
                                style: Theme.of(
                                  context,
                                ).textTheme.displayMedium,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Read natural Mandarin in small blocks. Reveal only the help you need, tap any word, and listen at your pace.',
                                style: Theme.of(context).textTheme.bodyLarge
                                    ?.copyWith(
                                      color: ink.withValues(alpha: .68),
                                    ),
                              ),
                            ],
                          ),
                        ),
                        _LibraryStat(
                          value:
                              '${learning.progress.values.where((p) => p.completed).length}',
                          label: 'stories finished',
                        ),
                        _LibraryStat(
                          value: '${learning.savedWords.length}',
                          label: 'words saved',
                        ),
                      ],
                    ),
                    if (inProgress.isNotEmpty) ...[
                      const SizedBox(height: 42),
                      _ContinueCard(
                        story: inProgress.first,
                        progress: learning.progress[inProgress.first.id]!,
                      ),
                    ],
                    const SizedBox(height: 46),
                    Text(
                      'Choose your level',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Vocabulary bands follow a six-step HSK-style progression.',
                      style: TextStyle(color: ink.withValues(alpha: .6)),
                    ),
                    const SizedBox(height: 18),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: const Text('All stories'),
                              selected: learning.selectedLevel == null,
                              onSelected: (_) => ref
                                  .read(learningProvider.notifier)
                                  .setSelectedLevel(null),
                            ),
                          ),
                          ...MandarinLevel.values.map(
                            (level) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(level.label),
                                selected: learning.selectedLevel == level.id,
                                onSelected: (_) => ref
                                    .read(learningProvider.notifier)
                                    .setSelectedLevel(level.id),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 26),
                  ],
                ),
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
          sliver: SliverLayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.crossAxisExtent;
              final count = width > 1050
                  ? 3
                  : width > 650
                  ? 2
                  : 1;
              return SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => StoryCard(
                    story: visible[index],
                    progress: learning.progress[visible[index].id],
                  ),
                  childCount: visible.length,
                ),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: count,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: count == 1 ? 1.35 : 1.05,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 46,
        height: 46,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: cinnabar,
          borderRadius: BorderRadius.circular(13),
        ),
        child: const Text(
          '声',
          style: TextStyle(color: Colors.white, fontSize: 26),
        ),
      ),
      const SizedBox(width: 12),
      const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '声场 Shēngchǎng',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          Text(
            'MANDARIN STORY READER',
            style: TextStyle(fontSize: 10, letterSpacing: 1.5),
          ),
        ],
      ),
    ],
  );
}

class _LibraryStat extends StatelessWidget {
  const _LibraryStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    width: 120,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      border: Border.all(color: ink.withValues(alpha: .1)),
      borderRadius: BorderRadius.circular(18),
      color: Colors.white.withValues(alpha: .45),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: ink.withValues(alpha: .58)),
        ),
      ],
    ),
  );
}

class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.story, required this.progress});
  final StoryCatalogEntry story;
  final StoryProgress progress;

  @override
  Widget build(BuildContext context) {
    final fraction = story.blockCount == 0
        ? 0.0
        : (progress.blockIndex + 1) / story.blockCount;
    return Card(
      color: ink,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: () => context.go('/story/${story.id}'),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              Container(
                width: 62,
                height: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: gold,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  story.glyph,
                  style: const TextStyle(fontSize: 34, color: ink),
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CONTINUE READING',
                      style: TextStyle(
                        color: gold,
                        letterSpacing: 1.4,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${story.title} · ${story.englishTitle}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: fraction.clamp(0, 1),
                      color: gold,
                      backgroundColor: Colors.white12,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.arrow_forward_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class StoryCard extends StatelessWidget {
  const StoryCard({required this.story, required this.progress, super.key});
  final StoryCatalogEntry story;
  final StoryProgress? progress;

  Color _color(String hex) =>
      Color(int.parse(hex.substring(1), radix: 16) + 0xFF000000);

  @override
  Widget build(BuildContext context) {
    final fraction = story.blockCount == 0 || progress == null
        ? 0.0
        : progress!.completed
        ? 1.0
        : (progress!.blockIndex + 1) / story.blockCount;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/story/${story.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: story.colors.map(_color).toList(),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _Pill(text: story.level.label),
                        Text(
                          '${story.minutes} MIN',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        story.glyph,
                        style: const TextStyle(
                          color: Colors.white24,
                          fontSize: 92,
                          height: .9,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    story.topic.toUpperCase(),
                    style: const TextStyle(
                      color: jade,
                      fontSize: 10,
                      letterSpacing: 1.3,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    story.title,
                    style: const TextStyle(
                      fontSize: 23,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    story.englishTitle,
                    style: TextStyle(color: ink.withValues(alpha: .58)),
                  ),
                  if (fraction > 0) ...[
                    const SizedBox(height: 14),
                    LinearProgressIndicator(
                      value: fraction.clamp(0, 1),
                      minHeight: 4,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.black26,
      borderRadius: BorderRadius.circular(30),
    ),
    child: Text(
      text,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 11,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.menu_book_rounded, size: 54, color: cinnabar),
          const SizedBox(height: 16),
          const Text(
            'The story library could not be opened.',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
