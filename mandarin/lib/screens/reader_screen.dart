import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/app_providers.dart';
import '../services/learning_store.dart';
import '../theme.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  const ReaderScreen({required this.storyId, super.key});
  final String storyId;

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final Map<int, GlobalKey> _blockKeys = {};
  final Set<String> _translationOverrides = {};
  int? _lastActive;

  @override
  void dispose() {
    ref.read(readerAudioProvider).stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final story = ref.watch(storyProvider(widget.storyId));
    return story.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.go('/'))),
        body: Center(
          child: Text(
            'This story could not be opened.\n$error',
            textAlign: TextAlign.center,
          ),
        ),
      ),
      data: _buildStory,
    );
  }

  Widget _buildStory(StoryDocument story) {
    final learning = ref.watch(learningProvider);
    final audio = ref.watch(readerAudioProvider);
    final active = audio.storyId == story.id ? audio.activeBlockIndex : null;
    if (active != null && active != _lastActive) {
      _lastActive = active;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final target = _blockKeys[active]?.currentContext;
        if (target != null) {
          Scrollable.ensureVisible(
            target,
            duration: const Duration(milliseconds: 350),
            alignment: .18,
          );
        }
        ref.read(learningProvider.notifier).setProgress(story.id, active);
      });
    }

    final prior = learning.progress[story.id]?.blockIndex ?? 0;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: paper.withValues(alpha: .96),
        leading: IconButton(
          tooltip: 'Back to library',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/'),
        ),
        title: Text(
          story.title,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          PopupMenuButton<PinyinMode>(
            tooltip: 'Pinyin display',
            icon: const Icon(Icons.translate_rounded),
            initialValue: learning.pinyinMode,
            onSelected: ref.read(learningProvider.notifier).setPinyinMode,
            itemBuilder: (context) => const [
              PopupMenuItem(value: PinyinMode.all, child: Text('All pinyin')),
              PopupMenuItem(
                value: PinyinMode.difficult,
                child: Text('Difficult words'),
              ),
              PopupMenuItem(
                value: PinyinMode.hidden,
                child: Text('Hide pinyin'),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SelectionArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _StoryHero(story: story)),
            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 820),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 26, 20, 12),
                    child: _PlayerBar(
                      isPlaying: audio.isPlaying,
                      hasActiveStory: audio.storyId == story.id,
                      speed: learning.playbackSpeed,
                      onPlay: () async {
                        await audio.setSpeed(learning.playbackSpeed);
                        if (audio.storyId == story.id) {
                          await audio.togglePause();
                        } else {
                          await audio.playAll(
                            story,
                            startAt: prior.clamp(0, story.blocks.length - 1),
                          );
                        }
                      },
                      onSpeed: (speed) {
                        ref
                            .read(learningProvider.notifier)
                            .setPlaybackSpeed(speed);
                        audio.setSpeed(speed);
                      },
                    ),
                  ),
                ),
              ),
            ),
            if (audio.error != null)
              SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 780),
                      child: MaterialBanner(
                        content: Text(audio.error!),
                        actions: [
                          TextButton(
                            onPressed: audio.stop,
                            child: const Text('Dismiss'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            SliverList.builder(
              itemCount: story.blocks.length,
              itemBuilder: (context, index) {
                final block = story.blocks[index];
                final key = _blockKeys.putIfAbsent(index, GlobalKey.new);
                final defaultTranslation = learning.showTranslations;
                final translated = _translationOverrides.contains(block.id)
                    ? !defaultTranslation
                    : defaultTranslation;
                return Center(
                  key: key,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 820),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 7, 20, 7),
                      child: _ReaderBlock(
                        story: story,
                        block: block,
                        index: index,
                        active: active == index,
                        playing: active == index && audio.isPlaying,
                        mode: learning.pinyinMode,
                        showTranslation: translated,
                        savedWords: learning.savedWords,
                        onPlay: () async {
                          await audio.setSpeed(learning.playbackSpeed);
                          await audio.toggleBlock(story, index);
                          ref
                              .read(learningProvider.notifier)
                              .setProgress(story.id, index);
                        },
                        onTranslation: () => setState(() {
                          if (!_translationOverrides.add(block.id)) {
                            _translationOverrides.remove(block.id);
                          }
                        }),
                        onToken: (token) => _showWord(story, block, token),
                      ),
                    ),
                  ),
                );
              },
            ),
            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 820),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 30, 20, 70),
                    child: Card(
                      color: ink,
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Row(
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '读完了 · Finished',
                                    style: TextStyle(
                                      color: gold,
                                      fontSize: 12,
                                      letterSpacing: 1.4,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  SizedBox(height: 7),
                                  Text(
                                    'Mark this story complete and return to the library.',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            FilledButton(
                              onPressed: () {
                                ref
                                    .read(learningProvider.notifier)
                                    .setProgress(
                                      story.id,
                                      story.blocks.length - 1,
                                      completed: true,
                                    );
                                context.go('/');
                              },
                              style: FilledButton.styleFrom(
                                backgroundColor: gold,
                                foregroundColor: ink,
                              ),
                              child: const Text('Complete'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showWord(StoryDocument story, StoryBlock block, StoryToken token) {
    final word = SavedWord(
      text: token.text,
      pinyin: token.pinyin,
      gloss: token.gloss,
      storyId: story.id,
      storyTitle: story.title,
      blockId: block.id,
    );
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final saved = ref
              .watch(learningProvider)
              .savedWords
              .any((item) => item.key == word.key);
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 10, 28, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        token.text,
                        style: const TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        token.pinyin,
                        style: const TextStyle(
                          color: cinnabar,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    token.gloss,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => ref
                        .read(learningProvider.notifier)
                        .toggleSavedWord(word),
                    icon: Icon(
                      saved
                          ? Icons.bookmark_remove_rounded
                          : Icons.bookmark_add_rounded,
                    ),
                    label: Text(saved ? 'Remove saved word' : 'Save word'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StoryHero extends StatelessWidget {
  const _StoryHero({required this.story});
  final StoryDocument story;

  @override
  Widget build(BuildContext context) => Container(
    color: ink,
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 920),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 54, 24, 48),
          child: Column(
            children: [
              Text(
                '${story.level.label.toUpperCase()} · ${story.minutes} MIN · ${story.topic.toUpperCase()}',
                style: const TextStyle(
                  color: gold,
                  letterSpacing: 1.6,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                story.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 52,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (story.pinyinTitle.isNotEmpty)
                Text(
                  story.pinyinTitle,
                  style: const TextStyle(
                    color: Color(0xFFB8D3E3),
                    fontSize: 17,
                  ),
                ),
              const SizedBox(height: 7),
              Text(
                story.englishTitle,
                style: const TextStyle(color: Colors.white70, fontSize: 19),
              ),
              const SizedBox(height: 24),
              Text(
                story.summary,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white60, height: 1.55),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _PlayerBar extends StatelessWidget {
  const _PlayerBar({
    required this.isPlaying,
    required this.hasActiveStory,
    required this.speed,
    required this.onPlay,
    required this.onSpeed,
  });
  final bool isPlaying;
  final bool hasActiveStory;
  final double speed;
  final VoidCallback onPlay;
  final ValueChanged<double> onSpeed;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      child: Row(
        children: [
          IconButton.filled(
            tooltip: isPlaying ? 'Pause story' : 'Play story',
            onPressed: onPlay,
            icon: Icon(
              isPlaying && hasActiveStory
                  ? Icons.pause_rounded
                  : Icons.play_arrow_rounded,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Listen through every block',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          PopupMenuButton<double>(
            tooltip: 'Playback speed',
            initialValue: speed,
            onSelected: onSpeed,
            itemBuilder: (context) => [.75, 1.0, 1.25, 1.5]
                .map(
                  (value) =>
                      PopupMenuItem(value: value, child: Text('$value×')),
                )
                .toList(),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Text(
                '$speed×',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _ReaderBlock extends StatelessWidget {
  const _ReaderBlock({
    required this.story,
    required this.block,
    required this.index,
    required this.active,
    required this.playing,
    required this.mode,
    required this.showTranslation,
    required this.savedWords,
    required this.onPlay,
    required this.onTranslation,
    required this.onToken,
  });

  final StoryDocument story;
  final StoryBlock block;
  final int index;
  final bool active;
  final bool playing;
  final PinyinMode mode;
  final bool showTranslation;
  final List<SavedWord> savedWords;
  final VoidCallback onPlay;
  final VoidCallback onTranslation;
  final ValueChanged<StoryToken> onToken;

  String get _speaker =>
      story.voices
          .where((voice) => voice.id == block.speakerId)
          .map((voice) => voice.name)
          .firstOrNull ??
      'Narrator';

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: BoxDecoration(
        color: active ? Colors.white : Colors.white.withValues(alpha: .48),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: active
              ? cinnabar.withValues(alpha: .45)
              : ink.withValues(alpha: .09),
        ),
        boxShadow: active
            ? const [
                BoxShadow(
                  color: Color(0x14252421),
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ]
            : null,
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                block.kind == 'dialogue' ? _speaker.toUpperCase() : 'NARRATION',
                style: const TextStyle(
                  color: jade,
                  fontSize: 10,
                  letterSpacing: 1.3,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const Spacer(),
              IconButton(
                tooltip: playing ? 'Pause block' : 'Play block',
                onPressed: onPlay,
                icon: Icon(
                  playing
                      ? Icons.pause_circle_filled_rounded
                      : Icons.play_circle_outline_rounded,
                  color: active ? cinnabar : ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (mode == PinyinMode.all && block.pinyin.isNotEmpty) ...[
            Text(
              block.pinyin,
              style: const TextStyle(
                color: cinnabar,
                fontWeight: FontWeight.w700,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 8),
          ],
          Wrap(
            runSpacing: 8,
            children: block.tokens.map((token) {
              final showTokenPinyin =
                  mode == PinyinMode.difficult &&
                  token.isLexical &&
                  (token.focus || token.difficulty > story.level.rank);
              final saved = savedWords.any(
                (word) =>
                    word.storyId == story.id &&
                    word.blockId == block.id &&
                    word.text == token.text,
              );
              return Semantics(
                button: token.isLexical,
                label: token.isLexical
                    ? '${token.text}, ${token.pinyin}, ${token.gloss}'
                    : token.text,
                child: InkWell(
                  borderRadius: BorderRadius.circular(7),
                  onTap: token.isLexical ? () => onToken(token) : null,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 1),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showTokenPinyin)
                          Text(
                            token.pinyin,
                            style: const TextStyle(
                              color: cinnabar,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        Text(
                          token.text,
                          style: TextStyle(
                            fontSize: 27,
                            height: 1.35,
                            decoration: saved ? TextDecoration.underline : null,
                            decorationColor: gold,
                            decorationThickness: 3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onTranslation,
            icon: Icon(
              showTranslation
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              size: 18,
            ),
            label: Text(
              showTranslation ? 'Hide translation' : 'Show translation',
            ),
          ),
          if (showTranslation)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 2, 12, 4),
              child: Text(
                block.translation,
                style: TextStyle(
                  color: ink.withValues(alpha: .68),
                  height: 1.5,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
