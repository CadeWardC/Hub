import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/app_providers.dart';
import '../services/learning_store.dart';
import '../services/reader_audio_controller.dart';
import '../theme.dart';

enum _MeaningView { reading, english }

enum _ReaderAction { restartSection, markRead, library }

class ReaderScreen extends ConsumerStatefulWidget {
  const ReaderScreen({required this.storyId, super.key});

  final String storyId;

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final ScrollController _scrollController = ScrollController();
  late final ReaderAudioController _audioController;
  _MeaningView _meaningView = _MeaningView.english;
  int _sectionIndex = 0;
  int? _lastActiveBlock;
  bool _initialized = false;
  bool _showCompletion = false;
  OverlayEntry? _wordPeek;

  @override
  void initState() {
    super.initState();
    _audioController = ref.read(readerAudioProvider);
  }

  @override
  void dispose() {
    _hideWordPeek();
    _scrollController.dispose();
    _audioController.stop();
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
    final sections = story.sections;
    final palette = levelPalette(story.level);
    final active = audio.storyId == story.id ? audio.activeBlockIndex : null;

    if (sections.isEmpty) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.go('/'))),
        body: const Center(child: Text('This story has no readable sections.')),
      );
    }

    if (!_initialized) {
      _initialized = true;
      _meaningView = learning.showTranslations
          ? _MeaningView.english
          : _MeaningView.reading;
      final savedBlock = learning.progress[story.id]?.blockIndex ?? 0;
      _sectionIndex = story.sectionIndexForBlock(
        savedBlock.clamp(0, story.blocks.length - 1),
      );
    }

    if (active != null && active != _lastActiveBlock) {
      _lastActiveBlock = active;
      final activeSection = story.sectionIndexForBlock(active);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (_sectionIndex != activeSection || _showCompletion) {
          setState(() {
            _sectionIndex = activeSection;
            _showCompletion = false;
          });
          _scrollToTop();
        }
        ref.read(learningProvider.notifier).setProgress(story.id, active);
      });
    }

    final safeSection = _sectionIndex.clamp(0, sections.length - 1);
    final section = sections[safeSection];
    final sectionEnd = section.startBlockIndex + section.blocks.length;

    Future<void> playSection() async {
      final activeInSection =
          audio.storyId == story.id &&
          active != null &&
          active >= section.startBlockIndex &&
          active < sectionEnd;
      if (activeInSection && !audio.isComplete) {
        await audio.togglePause();
      } else {
        await audio.playRange(
          story,
          startAt: section.startBlockIndex,
          endBefore: sectionEnd,
          pace: learning.playbackSpeed,
        );
      }
    }

    return Scaffold(
      backgroundColor: Color.alphaBlend(
        palette.soft.withValues(alpha: .42),
        paper,
      ),
      appBar: AppBar(
        backgroundColor: palette.deep,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          tooltip: 'Back to library',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/'),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              story.title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            Text(
              story.englishTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          _LevelBadge(level: story.level, palette: palette),
          const SizedBox(width: 12),
        ],
      ),
      body: _showCompletion
          ? _CompletionPage(
              story: story,
              palette: palette,
              onReadAgain: () {
                setState(() {
                  _showCompletion = false;
                  _sectionIndex = 0;
                  _meaningView = _MeaningView.english;
                });
                _scrollToTop();
              },
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
          : Column(
              children: [
                _MeaningPanel(
                  story: story,
                  section: section,
                  sectionIndex: safeSection,
                  sectionCount: sections.length,
                  view: _meaningView,
                  palette: palette,
                  onView: (view) {
                    setState(() => _meaningView = view);
                    ref
                        .read(learningProvider.notifier)
                        .setTranslations(view == _MeaningView.english);
                  },
                ),
                Expanded(
                  child: Scrollbar(
                    controller: _scrollController,
                    child: SingleChildScrollView(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 44),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 940),
                          child: _LessonPage(
                            story: story,
                            section: section,
                            mode: learning.pinyinMode,
                            activeBlockIndex: active,
                            savedWords: learning.savedWords,
                            palette: palette,
                            onTokenTap: (block, token) =>
                                _showWordSheet(story, block, token, palette),
                            onPeekStart: (token, position) =>
                                _showWordPeek(story, token, position, palette),
                            onPeekEnd: _hideWordPeek,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
      bottomNavigationBar: _StudyBar(
        sectionIndex: safeSection,
        sectionCount: sections.length,
        isCompletion: _showCompletion,
        isPlaying: audio.isPlaying,
        hasActiveSection:
            audio.storyId == story.id &&
            active != null &&
            active >= section.startBlockIndex &&
            active < sectionEnd,
        speed: learning.playbackSpeed,
        pinyinMode: learning.pinyinMode,
        palette: palette,
        onPrevious: safeSection == 0 && !_showCompletion
            ? null
            : () => _goToSection(
                story,
                _showCompletion ? safeSection : safeSection - 1,
              ),
        onNext: _showCompletion
            ? null
            : () {
                if (safeSection == sections.length - 1) {
                  audio.stop();
                  setState(() => _showCompletion = true);
                  return;
                }
                _goToSection(story, safeSection + 1);
              },
        onPlay: playSection,
        onSpeed: (speed) {
          ref.read(learningProvider.notifier).setPlaybackSpeed(speed);
          audio.setPace(speed, story: story);
        },
        onPinyin: () {
          final next = switch (learning.pinyinMode) {
            PinyinMode.all => PinyinMode.difficult,
            PinyinMode.difficult => PinyinMode.hidden,
            PinyinMode.hidden => PinyinMode.all,
          };
          ref.read(learningProvider.notifier).setPinyinMode(next);
        },
        onAction: (action) {
          switch (action) {
            case _ReaderAction.restartSection:
              _goToSection(story, safeSection);
              return;
            case _ReaderAction.markRead:
              ref
                  .read(learningProvider.notifier)
                  .setProgress(
                    story.id,
                    story.blocks.length - 1,
                    completed: true,
                  );
              context.go('/');
              return;
            case _ReaderAction.library:
              context.go('/');
              return;
          }
        },
      ),
    );
  }

  void _goToSection(StoryDocument story, int index) {
    _hideWordPeek();
    ref.read(readerAudioProvider).stop();
    final safe = index.clamp(0, story.sections.length - 1);
    setState(() {
      _showCompletion = false;
      _sectionIndex = safe;
    });
    ref
        .read(learningProvider.notifier)
        .setProgress(story.id, story.sections[safe].startBlockIndex);
    _scrollToTop();
  }

  void _scrollToTop() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _showWordPeek(
    StoryDocument story,
    StoryToken token,
    Offset position,
    LevelPalette palette,
  ) {
    _hideWordPeek();
    final size = MediaQuery.sizeOf(context);
    final desiredTop = position.dy > size.height * .52
        ? position.dy - 190
        : position.dy + 28;
    final top = desiredTop.clamp(72.0, (size.height - 215).clamp(72.0, 9999));
    _wordPeek = OverlayEntry(
      builder: (context) => Positioned(
        left: 14,
        right: 14,
        top: top.toDouble(),
        child: IgnorePointer(
          child: Material(
            color: Colors.transparent,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 620),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: ink,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: palette.highlight, width: 1.5),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black38,
                        blurRadius: 28,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          token.text,
                          style: TextStyle(
                            color: palette.highlight,
                            fontSize: 44,
                            height: 1,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: 18),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      token.pinyin,
                                      style: TextStyle(
                                        color: palette.highlight,
                                        fontSize: 19,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  _DifficultyBadge(token: token),
                                ],
                              ),
                              const SizedBox(height: 7),
                              Text(
                                token.gloss,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Release to return · tap for dictionary and save',
                                style: TextStyle(
                                  color: Colors.white54,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    Overlay.of(context, rootOverlay: true).insert(_wordPeek!);
  }

  void _hideWordPeek() {
    _wordPeek?.remove();
    _wordPeek = null;
  }

  void _showWordSheet(
    StoryDocument story,
    StoryBlock block,
    StoryToken token,
    LevelPalette palette,
  ) {
    _hideWordPeek();
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
      isScrollControlled: true,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final saved = ref
              .watch(learningProvider)
              .savedWords
              .any((item) => item.key == word.key);
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(26, 8, 26, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        token.text,
                        style: const TextStyle(
                          fontSize: 48,
                          height: 1.1,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(width: 18),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              token.pinyin,
                              style: TextStyle(
                                color: palette.primary,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              token.gloss,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ],
                        ),
                      ),
                      _DifficultyBadge(token: token, dark: true),
                    ],
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: palette.primary,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                      ),
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

class _LevelBadge extends StatelessWidget {
  const _LevelBadge({required this.level, required this.palette});

  final MandarinLevel level;
  final LevelPalette palette;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: palette.primary,
      borderRadius: BorderRadius.circular(30),
    ),
    child: Text(
      level.label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 10,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

class _MeaningPanel extends StatelessWidget {
  const _MeaningPanel({
    required this.story,
    required this.section,
    required this.sectionIndex,
    required this.sectionCount,
    required this.view,
    required this.palette,
    required this.onView,
  });

  final StoryDocument story;
  final StorySection section;
  final int sectionIndex;
  final int sectionCount;
  final _MeaningView view;
  final LevelPalette palette;
  final ValueChanged<_MeaningView> onView;

  String get translation => section.blocks
      .map((block) {
        if (block.kind != 'dialogue') return block.translation;
        final speaker = story.voices
            .where((voice) => voice.id == block.speakerId)
            .map((voice) => voice.name)
            .firstOrNull;
        return speaker == null
            ? block.translation
            : '$speaker: ${block.translation}';
      })
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(gradient: palette.gradient),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 940),
          child: Padding(
            padding: EdgeInsets.fromLTRB(20, compact ? 18 : 24, 20, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${story.englishTitle} · ${sectionIndex + 1}/$sectionCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    SegmentedButton<_MeaningView>(
                      style: ButtonStyle(
                        foregroundColor: WidgetStateProperty.resolveWith(
                          (states) => states.contains(WidgetState.selected)
                              ? palette.deep
                              : Colors.white,
                        ),
                        backgroundColor: WidgetStateProperty.resolveWith(
                          (states) => states.contains(WidgetState.selected)
                              ? Colors.white
                              : Colors.transparent,
                        ),
                        side: const WidgetStatePropertyAll(
                          BorderSide(color: Colors.white38),
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      segments: const [
                        ButtonSegment(
                          value: _MeaningView.reading,
                          label: Text('Reading'),
                        ),
                        ButtonSegment(
                          value: _MeaningView.english,
                          label: Text('English'),
                        ),
                      ],
                      selected: {view},
                      showSelectedIcon: false,
                      onSelectionChanged: (selection) =>
                          onView(selection.single),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: view == _MeaningView.english
                      ? Text(
                          translation,
                          key: ValueKey('english-${section.number}'),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: .9),
                            fontSize: compact ? 18 : 21,
                            height: 1.45,
                          ),
                        )
                      : Column(
                          key: ValueKey('reading-${section.number}'),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '第${section.number}节',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 25,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 5),
                            const Text(
                              'Read the Chinese first. Open English whenever you want to check the meaning.',
                              style: TextStyle(
                                color: Colors.white70,
                                height: 1.4,
                              ),
                            ),
                          ],
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

class _LessonPage extends StatelessWidget {
  const _LessonPage({
    required this.story,
    required this.section,
    required this.mode,
    required this.activeBlockIndex,
    required this.savedWords,
    required this.palette,
    required this.onTokenTap,
    required this.onPeekStart,
    required this.onPeekEnd,
  });

  final StoryDocument story;
  final StorySection section;
  final PinyinMode mode;
  final int? activeBlockIndex;
  final List<SavedWord> savedWords;
  final LevelPalette palette;
  final void Function(StoryBlock block, StoryToken token) onTokenTap;
  final void Function(StoryToken token, Offset position) onPeekStart;
  final VoidCallback onPeekEnd;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(compact ? 18 : 24),
        border: Border.all(color: palette.primary.withValues(alpha: .17)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10252421),
            blurRadius: 28,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          compact ? 18 : 34,
          compact ? 22 : 32,
          compact ? 18 : 34,
          compact ? 30 : 42,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: palette.soft,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    '第${section.number}节',
                    style: TextStyle(
                      color: palette.deep,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  switch (mode) {
                    PinyinMode.all => 'ALL PINYIN',
                    PinyinMode.difficult => 'FOCUS PINYIN',
                    PinyinMode.hidden => 'PINYIN OFF',
                  },
                  style: TextStyle(
                    color: palette.primary,
                    letterSpacing: 1.2,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _FlowingChineseParagraph(
              story: story,
              section: section,
              mode: mode,
              activeBlockIndex: activeBlockIndex,
              savedWords: savedWords,
              palette: palette,
              onTokenTap: onTokenTap,
              onPeekStart: onPeekStart,
              onPeekEnd: onPeekEnd,
            ),
            const SizedBox(height: 24),
            Text(
              'Tap a word for its dictionary card. Press and hold for a quick definition; release to keep reading.',
              style: TextStyle(
                color: ink.withValues(alpha: .48),
                fontSize: 11,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlowingChineseParagraph extends StatelessWidget {
  const _FlowingChineseParagraph({
    required this.story,
    required this.section,
    required this.mode,
    required this.activeBlockIndex,
    required this.savedWords,
    required this.palette,
    required this.onTokenTap,
    required this.onPeekStart,
    required this.onPeekEnd,
  });

  final StoryDocument story;
  final StorySection section;
  final PinyinMode mode;
  final int? activeBlockIndex;
  final List<SavedWord> savedWords;
  final LevelPalette palette;
  final void Function(StoryBlock block, StoryToken token) onTokenTap;
  final void Function(StoryToken token, Offset position) onPeekStart;
  final VoidCallback onPeekEnd;

  List<_TokenUnitData> _units(StoryBlock block) {
    final result = <_TokenUnitData>[];
    for (final token in block.tokens) {
      if (token.isLexical || result.isEmpty) {
        result.add(_TokenUnitData(token: token));
      } else {
        final previous = result.removeLast();
        result.add(previous.withSuffix(previous.suffix + token.text));
      }
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    for (var localIndex = 0; localIndex < section.blocks.length; localIndex++) {
      final block = section.blocks[localIndex];
      final globalIndex = section.startBlockIndex + localIndex;
      final active = activeBlockIndex == globalIndex;
      if (block.kind == 'dialogue') {
        final speaker = story.voices
            .where((voice) => voice.id == block.speakerId)
            .map((voice) => voice.name)
            .firstOrNull;
        if (speaker != null) {
          children.add(
            _SpeakerUnit(
              name: '$speaker：',
              active: active,
              pinyinVisible: mode != PinyinMode.hidden,
              palette: palette,
            ),
          );
        }
      }
      for (final unit in _units(block)) {
        final token = unit.token;
        final saved = savedWords.any(
          (word) =>
              word.storyId == story.id &&
              word.blockId == block.id &&
              word.text == token.text,
        );
        final showPinyin = switch (mode) {
          PinyinMode.all => token.isLexical,
          PinyinMode.difficult =>
            token.isLexical &&
                (token.focus || token.difficulty > story.level.rank),
          PinyinMode.hidden => false,
        };
        children.add(
          _InteractiveWord(
            unit: unit,
            active: active,
            saved: saved,
            showPinyin: showPinyin,
            reservePinyin: mode != PinyinMode.hidden,
            palette: palette,
            onTap: token.isLexical ? () => onTokenTap(block, token) : null,
            onPeekStart: token.isLexical
                ? (position) => onPeekStart(token, position)
                : null,
            onPeekEnd: token.isLexical ? onPeekEnd : null,
          ),
        );
      }
      if (localIndex < section.blocks.length - 1) {
        children.add(const SizedBox(width: 13));
      }
    }

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.end,
      spacing: 1,
      runSpacing: 10,
      children: children,
    );
  }
}

class _TokenUnitData {
  const _TokenUnitData({required this.token, this.suffix = ''});

  final StoryToken token;
  final String suffix;

  _TokenUnitData withSuffix(String value) =>
      _TokenUnitData(token: token, suffix: value);
}

class _InteractiveWord extends StatefulWidget {
  const _InteractiveWord({
    required this.unit,
    required this.active,
    required this.saved,
    required this.showPinyin,
    required this.reservePinyin,
    required this.palette,
    required this.onTap,
    required this.onPeekStart,
    required this.onPeekEnd,
  });

  final _TokenUnitData unit;
  final bool active;
  final bool saved;
  final bool showPinyin;
  final bool reservePinyin;
  final LevelPalette palette;
  final VoidCallback? onTap;
  final ValueChanged<Offset>? onPeekStart;
  final VoidCallback? onPeekEnd;

  @override
  State<_InteractiveWord> createState() => _InteractiveWordState();
}

class _InteractiveWordState extends State<_InteractiveWord> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    return Semantics(
      button: widget.onTap != null,
      label: widget.onTap == null
          ? widget.unit.token.text
          : '${widget.unit.token.text}, ${widget.unit.token.pinyin}, ${widget.unit.token.gloss}',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onLongPressStart: widget.onPeekStart == null
            ? null
            : (details) {
                setState(() => _pressed = true);
                widget.onPeekStart!(details.globalPosition);
              },
        onLongPressEnd: widget.onPeekEnd == null
            ? null
            : (_) {
                if (mounted) setState(() => _pressed = false);
                widget.onPeekEnd!();
              },
        onLongPressCancel: widget.onPeekEnd == null
            ? null
            : () {
                if (mounted) setState(() => _pressed = false);
                widget.onPeekEnd!();
              },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          decoration: BoxDecoration(
            color: _pressed
                ? widget.palette.primary.withValues(alpha: .25)
                : widget.active
                ? widget.palette.soft
                : Colors.transparent,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.reservePinyin)
                SizedBox(
                  height: compact ? 15 : 18,
                  child: Text(
                    widget.showPinyin ? widget.unit.token.pinyin : '',
                    style: TextStyle(
                      color: widget.palette.deep,
                      fontSize: compact ? 10 : 12,
                      height: 1,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              Text(
                '${widget.unit.token.text}${widget.unit.suffix}',
                style: TextStyle(
                  color: ink,
                  fontSize: compact ? 29 : 36,
                  height: 1.18,
                  fontWeight: widget.active ? FontWeight.w600 : FontWeight.w400,
                  decoration: widget.saved ? TextDecoration.underline : null,
                  decorationColor: widget.palette.primary,
                  decorationThickness: 3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SpeakerUnit extends StatelessWidget {
  const _SpeakerUnit({
    required this.name,
    required this.active,
    required this.pinyinVisible,
    required this.palette,
  });

  final String name;
  final bool active;
  final bool pinyinVisible;
  final LevelPalette palette;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 600;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
      decoration: BoxDecoration(
        color: active ? palette.soft : Colors.transparent,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (pinyinVisible) SizedBox(height: compact ? 15 : 18),
          Text(
            name,
            style: TextStyle(
              color: palette.deep,
              fontSize: compact ? 27 : 34,
              height: 1.18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _DifficultyBadge extends StatelessWidget {
  const _DifficultyBadge({required this.token, this.dark = false});

  final StoryToken token;
  final bool dark;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: dark ? ink : Colors.white12,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: dark ? ink : Colors.white30),
    ),
    child: Text(
      'HSK ${token.difficulty.clamp(1, 6)}',
      style: TextStyle(
        color: dark ? Colors.white : Colors.white70,
        fontSize: 10,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

class _StudyBar extends StatelessWidget {
  const _StudyBar({
    required this.sectionIndex,
    required this.sectionCount,
    required this.isCompletion,
    required this.isPlaying,
    required this.hasActiveSection,
    required this.speed,
    required this.pinyinMode,
    required this.palette,
    required this.onPrevious,
    required this.onNext,
    required this.onPlay,
    required this.onSpeed,
    required this.onPinyin,
    required this.onAction,
  });

  final int sectionIndex;
  final int sectionCount;
  final bool isCompletion;
  final bool isPlaying;
  final bool hasActiveSection;
  final double speed;
  final PinyinMode pinyinMode;
  final LevelPalette palette;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final VoidCallback onPlay;
  final ValueChanged<double> onSpeed;
  final VoidCallback onPinyin;
  final ValueChanged<_ReaderAction> onAction;

  String _speedText(double value) => value == value.roundToDouble()
      ? '${value.toStringAsFixed(1)}×'
      : '${value.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '')}×';

  String get pinyinLabel => switch (pinyinMode) {
    PinyinMode.all => 'All',
    PinyinMode.difficult => 'Focus',
    PinyinMode.hidden => 'Off',
  };

  @override
  Widget build(BuildContext context) => Material(
    elevation: 16,
    color: ink,
    child: SafeArea(
      top: false,
      child: SizedBox(
        height: 76,
        child: Row(
          children: [
            IconButton(
              tooltip: 'Previous section',
              onPressed: onPrevious,
              color: Colors.white,
              disabledColor: Colors.white24,
              icon: const Icon(Icons.chevron_left_rounded, size: 34),
            ),
            Text(
              '${sectionIndex + 1}/$sectionCount',
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.w700,
              ),
            ),
            IconButton(
              tooltip: isCompletion ? 'Story finished' : 'Next section',
              onPressed: onNext,
              color: Colors.white,
              disabledColor: Colors.white24,
              icon: const Icon(Icons.chevron_right_rounded, size: 34),
            ),
            Expanded(
              child: Center(
                child: PopupMenuButton<double>(
                  tooltip: 'Study pace',
                  initialValue: speed,
                  onSelected: onSpeed,
                  itemBuilder: (context) => const [
                    PopupMenuItem(
                      value: .5,
                      child: Text('Deep study · natural voice, long pauses'),
                    ),
                    PopupMenuItem(
                      value: .75,
                      child: Text('Study · gentle slowdown, longer pauses'),
                    ),
                    PopupMenuItem(value: 1, child: Text('Natural · 1×')),
                    PopupMenuItem(value: 1.25, child: Text('Quick · 1.25×')),
                    PopupMenuItem(value: 1.5, child: Text('Fast · 1.5×')),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                    child: Text(
                      _speedText(speed),
                      style: TextStyle(
                        color: palette.highlight,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Semantics(
              button: true,
              label: isPlaying && hasActiveSection
                  ? 'Pause section'
                  : 'Play section',
              child: IconButton.filled(
                tooltip: isPlaying && hasActiveSection
                    ? 'Pause section'
                    : 'Play section',
                onPressed: onPlay,
                style: IconButton.styleFrom(
                  backgroundColor: palette.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(54, 54),
                ),
                icon: Icon(
                  isPlaying && hasActiveSection
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  size: 34,
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: onPinyin,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 7,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '拼',
                          style: TextStyle(
                            color: palette.highlight,
                            fontSize: 21,
                            height: 1,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          pinyinLabel,
                          style: const TextStyle(
                            color: Colors.white60,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            PopupMenuButton<_ReaderAction>(
              tooltip: 'Lesson menu',
              color: ink,
              iconColor: Colors.white70,
              onSelected: onAction,
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: _ReaderAction.restartSection,
                  child: Text(
                    'Restart section',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
                PopupMenuItem(
                  value: _ReaderAction.markRead,
                  child: Text(
                    'Mark story read',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
                PopupMenuItem(
                  value: _ReaderAction.library,
                  child: Text(
                    'Back to library',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
    ),
  );
}

class _CompletionPage extends StatelessWidget {
  const _CompletionPage({
    required this.story,
    required this.palette,
    required this.onReadAgain,
    required this.onComplete,
  });

  final StoryDocument story;
  final LevelPalette palette;
  final VoidCallback onReadAgain;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) => Center(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 650),
        child: Column(
          children: [
            Container(
              width: 86,
              height: 86,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: palette.soft,
                shape: BoxShape.circle,
              ),
              child: Text(
                '读',
                style: TextStyle(
                  color: palette.deep,
                  fontSize: 44,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              story.title,
              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              'You reached the end of ${story.englishTitle}.',
              textAlign: TextAlign.center,
              style: TextStyle(color: ink.withValues(alpha: .62), fontSize: 18),
            ),
            const SizedBox(height: 34),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: [
                OutlinedButton.icon(
                  onPressed: onReadAgain,
                  icon: const Icon(Icons.replay_rounded),
                  label: const Text('Read again'),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: palette.primary,
                  ),
                  onPressed: onComplete,
                  icon: const Icon(Icons.check_circle_outline_rounded),
                  label: const Text('Mark read'),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
