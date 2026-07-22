import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/app_providers.dart';
import '../services/learning_store.dart';
import '../theme.dart';

enum _ReadingView { chinese, english }

class ReaderScreen extends ConsumerStatefulWidget {
  const ReaderScreen({required this.storyId, super.key});
  final String storyId;

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final Map<int, GlobalKey> _blockKeys = {};
  _ReadingView _view = _ReadingView.chinese;
  int _sectionIndex = 0;
  int? _lastActive;
  bool _initialized = false;

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
    final sections = story.sections;
    final prior = learning.progress[story.id]?.blockIndex ?? 0;

    if (!_initialized) {
      _initialized = true;
      _view = learning.showTranslations
          ? _ReadingView.english
          : _ReadingView.chinese;
      if (sections.isNotEmpty) {
        _sectionIndex = story.sectionIndexForBlock(
          prior.clamp(0, story.blocks.length - 1),
        );
      }
    }

    if (active != null && active != _lastActive) {
      _lastActive = active;
      final targetSection = story.sectionIndexForBlock(active);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (_sectionIndex != targetSection || _view != _ReadingView.chinese) {
          setState(() {
            _sectionIndex = targetSection;
            _view = _ReadingView.chinese;
          });
        }
        final target = _blockKeys[active]?.currentContext;
        if (target != null) {
          Scrollable.ensureVisible(
            target,
            duration: const Duration(milliseconds: 350),
            alignment: .32,
          );
        }
        ref.read(learningProvider.notifier).setProgress(story.id, active);
      });
    }

    if (sections.isEmpty) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.go('/'))),
        body: const Center(child: Text('This story has no readable sections.')),
      );
    }
    final safeSection = _sectionIndex.clamp(0, sections.length - 1);
    final section = sections[safeSection];

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
                child: Text('Difficult words only'),
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
              child: _Centered(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
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
            if (audio.error != null)
              SliverToBoxAdapter(
                child: _Centered(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
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
            SliverToBoxAdapter(
              child: _Centered(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                  child: _ReaderNavigation(
                    sectionCount: sections.length,
                    selectedSection: safeSection,
                    view: _view,
                    onSection: (index) => setState(() {
                      _sectionIndex = index;
                      _view = _ReadingView.chinese;
                    }),
                    onView: (view) {
                      setState(() => _view = view);
                      ref
                          .read(learningProvider.notifier)
                          .setTranslations(view == _ReadingView.english);
                    },
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _Centered(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                  child: _SectionPage(
                    story: story,
                    section: section,
                    view: _view,
                    mode: learning.pinyinMode,
                    activeBlockIndex: active,
                    isPlaying: audio.isPlaying,
                    savedWords: learning.savedWords,
                    blockKeys: _blockKeys,
                    onPlayBlock: (index) async {
                      await audio.setSpeed(learning.playbackSpeed);
                      await audio.toggleBlock(story, index);
                      ref
                          .read(learningProvider.notifier)
                          .setProgress(story.id, index);
                    },
                    onToken: (block, token) => _showWord(story, block, token),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _Centered(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 70),
                  child: safeSection == sections.length - 1
                      ? _FinishCard(
                          onComplete: () {
                            ref
                                .read(learningProvider.notifier)
                                .setProgress(
                                  story.id,
                                  story.blocks.length - 1,
                                  completed: true,
                                );
                            context.go('/');
                          },
                        )
                      : Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => setState(() {
                              _sectionIndex = safeSection + 1;
                              _view = _ReadingView.chinese;
                            }),
                            icon: const Icon(Icons.arrow_forward_rounded),
                            label: Text('Section ${safeSection + 2}'),
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
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 16,
                    children: [
                      Text(
                        token.text,
                        style: const TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
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

class _Centered extends StatelessWidget {
  const _Centered({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 880),
      child: child,
    ),
  );
}

class _StoryHero extends StatelessWidget {
  const _StoryHero({required this.story});
  final StoryDocument story;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    return Container(
      color: ink,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 920),
          child: Padding(
            padding: EdgeInsets.fromLTRB(24, compact ? 36 : 50, 24, 40),
            child: Column(
              children: [
                Text(
                  '${story.level.label.toUpperCase()} · ${story.minutes} MIN · ${story.sections.length} SECTIONS',
                  style: const TextStyle(
                    color: gold,
                    letterSpacing: 1.6,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  story.title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: compact ? 38 : 52,
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
              ],
            ),
          ),
        ),
      ),
    );
  }
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

  String _label(double value) => switch (value) {
    .5 => 'Very slow',
    .75 => 'Study',
    1.0 => 'Natural',
    1.25 => 'Quick',
    _ => 'Fast',
  };

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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Paced story audio',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(
                  'Speed changes speech and the pauses between sentences.',
                  style: TextStyle(fontSize: 11, color: Colors.black54),
                ),
              ],
            ),
          ),
          PopupMenuButton<double>(
            tooltip: 'Playback pace',
            initialValue: speed,
            onSelected: onSpeed,
            itemBuilder: (context) => [.5, .75, 1.0, 1.25, 1.5]
                .map(
                  (value) => PopupMenuItem(
                    value: value,
                    child: Text('${_label(value)} · $value×'),
                  ),
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

class _ReaderNavigation extends StatelessWidget {
  const _ReaderNavigation({
    required this.sectionCount,
    required this.selectedSection,
    required this.view,
    required this.onSection,
    required this.onView,
  });
  final int sectionCount;
  final int selectedSection;
  final _ReadingView view;
  final ValueChanged<int> onSection;
  final ValueChanged<_ReadingView> onView;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(
                  sectionCount,
                  (index) => Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text('Section ${index + 1}'),
                      selected: selectedSection == index,
                      onSelected: (_) => onSection(index),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          SegmentedButton<_ReadingView>(
            segments: const [
              ButtonSegment(value: _ReadingView.chinese, label: Text('中文')),
              ButtonSegment(
                value: _ReadingView.english,
                label: Text('English'),
              ),
            ],
            selected: {view},
            showSelectedIcon: false,
            onSelectionChanged: (selection) => onView(selection.single),
          ),
        ],
      ),
      const SizedBox(height: 10),
      LinearProgressIndicator(
        value: (selectedSection + 1) / sectionCount,
        minHeight: 3,
        backgroundColor: ink.withValues(alpha: .08),
      ),
    ],
  );
}

class _SectionPage extends StatelessWidget {
  const _SectionPage({
    required this.story,
    required this.section,
    required this.view,
    required this.mode,
    required this.activeBlockIndex,
    required this.isPlaying,
    required this.savedWords,
    required this.blockKeys,
    required this.onPlayBlock,
    required this.onToken,
  });

  final StoryDocument story;
  final StorySection section;
  final _ReadingView view;
  final PinyinMode mode;
  final int? activeBlockIndex;
  final bool isPlaying;
  final List<SavedWord> savedWords;
  final Map<int, GlobalKey> blockKeys;
  final ValueChanged<int> onPlayBlock;
  final void Function(StoryBlock block, StoryToken token) onToken;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: EdgeInsets.symmetric(
      horizontal: MediaQuery.sizeOf(context).width < 600 ? 20 : 38,
      vertical: 30,
    ),
    decoration: BoxDecoration(
      color: const Color(0xFFFFFDF8),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: ink.withValues(alpha: .1)),
      boxShadow: const [
        BoxShadow(
          color: Color(0x0F252421),
          blurRadius: 28,
          offset: Offset(0, 10),
        ),
      ],
    ),
    child: AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: view == _ReadingView.english
          ? _EnglishSection(
              key: ValueKey('english-${section.number}'),
              story: story,
              section: section,
              activeBlockIndex: activeBlockIndex,
              onPlayBlock: onPlayBlock,
            )
          : _ChineseSection(
              key: ValueKey('chinese-${section.number}'),
              story: story,
              section: section,
              mode: mode,
              activeBlockIndex: activeBlockIndex,
              isPlaying: isPlaying,
              savedWords: savedWords,
              blockKeys: blockKeys,
              onPlayBlock: onPlayBlock,
              onToken: onToken,
            ),
    ),
  );
}

class _ChineseSection extends StatelessWidget {
  const _ChineseSection({
    required this.story,
    required this.section,
    required this.mode,
    required this.activeBlockIndex,
    required this.isPlaying,
    required this.savedWords,
    required this.blockKeys,
    required this.onPlayBlock,
    required this.onToken,
    super.key,
  });

  final StoryDocument story;
  final StorySection section;
  final PinyinMode mode;
  final int? activeBlockIndex;
  final bool isPlaying;
  final List<SavedWord> savedWords;
  final Map<int, GlobalKey> blockKeys;
  final ValueChanged<int> onPlayBlock;
  final void Function(StoryBlock block, StoryToken token) onToken;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        '第${section.number}节',
        style: const TextStyle(
          color: jade,
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 18),
      ...List.generate(section.blocks.length, (localIndex) {
        final block = section.blocks[localIndex];
        final globalIndex = section.startBlockIndex + localIndex;
        return _InlineSentence(
          key: blockKeys.putIfAbsent(globalIndex, GlobalKey.new),
          story: story,
          block: block,
          active: activeBlockIndex == globalIndex,
          playing: isPlaying && activeBlockIndex == globalIndex,
          mode: mode,
          savedWords: savedWords,
          onPlay: () => onPlayBlock(globalIndex),
          onToken: (token) => onToken(block, token),
        );
      }),
    ],
  );
}

class _InlineSentence extends StatelessWidget {
  const _InlineSentence({
    required this.story,
    required this.block,
    required this.active,
    required this.playing,
    required this.mode,
    required this.savedWords,
    required this.onPlay,
    required this.onToken,
    super.key,
  });

  final StoryDocument story;
  final StoryBlock block;
  final bool active;
  final bool playing;
  final PinyinMode mode;
  final List<SavedWord> savedWords;
  final VoidCallback onPlay;
  final ValueChanged<StoryToken> onToken;

  String get speaker =>
      story.voices
          .where((voice) => voice.id == block.speakerId)
          .map((voice) => voice.name)
          .firstOrNull ??
      'Narrator';

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    margin: const EdgeInsets.symmetric(vertical: 2),
    padding: const EdgeInsets.fromLTRB(8, 7, 4, 7),
    decoration: BoxDecoration(
      color: active ? cinnabar.withValues(alpha: .075) : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (block.kind == 'dialogue') ...[
          Text(
            speaker,
            style: const TextStyle(
              color: jade,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
        ],
        if (mode == PinyinMode.all && block.pinyin.isNotEmpty) ...[
          Text(
            block.pinyin,
            style: const TextStyle(
              color: cinnabar,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 2),
        ],
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.end,
          runSpacing: 5,
          children: [
            ...block.tokens.map((token) {
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
                  borderRadius: BorderRadius.circular(6),
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
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        Text(
                          token.text,
                          style: TextStyle(
                            fontSize: 28,
                            height: 1.35,
                            fontWeight: active
                                ? FontWeight.w600
                                : FontWeight.w400,
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
            }),
            IconButton(
              visualDensity: VisualDensity.compact,
              tooltip: playing ? 'Pause sentence' : 'Play sentence',
              onPressed: onPlay,
              icon: Icon(
                playing
                    ? Icons.pause_circle_filled_rounded
                    : Icons.volume_up_outlined,
                size: 19,
                color: active ? cinnabar : ink.withValues(alpha: .42),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _EnglishSection extends StatelessWidget {
  const _EnglishSection({
    required this.story,
    required this.section,
    required this.activeBlockIndex,
    required this.onPlayBlock,
    super.key,
  });

  final StoryDocument story;
  final StorySection section;
  final int? activeBlockIndex;
  final ValueChanged<int> onPlayBlock;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'SECTION ${section.number} · ENGLISH',
        style: const TextStyle(
          color: jade,
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 18),
      ...List.generate(section.blocks.length, (localIndex) {
        final block = section.blocks[localIndex];
        final globalIndex = section.startBlockIndex + localIndex;
        final active = activeBlockIndex == globalIndex;
        final speaker = story.voices
            .where((voice) => voice.id == block.speakerId)
            .map((voice) => voice.name)
            .firstOrNull;
        return InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => onPlayBlock(globalIndex),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
            decoration: BoxDecoration(
              color: active
                  ? cinnabar.withValues(alpha: .075)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${block.kind == 'dialogue' && speaker != null ? '$speaker: ' : ''}${block.translation}',
              style: TextStyle(
                color: ink.withValues(alpha: .82),
                fontSize: 18,
                height: 1.65,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        );
      }),
    ],
  );
}

class _FinishCard extends StatelessWidget {
  const _FinishCard({required this.onComplete});
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) => Card(
    color: ink,
    child: Padding(
      padding: const EdgeInsets.all(26),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '读完了 · FINISHED',
                  style: TextStyle(
                    color: gold,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Mark this story complete.',
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
            onPressed: onComplete,
            style: FilledButton.styleFrom(
              backgroundColor: gold,
              foregroundColor: ink,
            ),
            child: const Text('Complete'),
          ),
        ],
      ),
    ),
  );
}
