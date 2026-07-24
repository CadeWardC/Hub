import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/story.dart';
import '../services/story_repository.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({
    super.key,
    required this.summary,
    required this.repository,
  });

  final StorySummary summary;
  final StoryRepository repository;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  final AudioPlayer _player = AudioPlayer();
  late Future<Story> _story;
  StreamSubscription<void>? _completionSubscription;
  Story? _loadedStory;
  List<List<StoryWord>> _segmentWords = const [];
  final Map<int, GlobalKey> _segmentKeys = {};

  bool _showPinyin = true;
  bool _playAll = false;
  int _activeIndex = 0;
  int? _playingIndex;
  double _speed = 1;

  // Bumped whenever playback state changes so a pending auto-advance that was
  // scheduled before the change can detect it is stale and abort.
  int _playToken = 0;

  // When set, the top panel shows this word instead of the sentence
  // translation, mirroring Du Chinese's press-a-word behavior.
  StoryWord? _heldWord;
  int? _heldSegmentIndex;
  int? _heldWordIndex;

  @override
  void initState() {
    super.initState();
    _story = widget.repository.loadStory(widget.summary);
    _completionSubscription = _player.onPlayerComplete.listen((_) {
      _handleAudioComplete();
    });
  }

  @override
  void dispose() {
    _completionSubscription?.cancel();
    _player.dispose();
    super.dispose();
  }

  void _prepareStory(Story story) {
    if (identical(_loadedStory, story)) return;
    _loadedStory = story;
    _segmentWords = [
      for (final segment in story.segments)
        _WordTokenizer.tokenize(segment, story.vocabulary),
    ];
    for (var i = 0; i < story.segments.length; i++) {
      _segmentKeys[i] = GlobalKey();
    }
  }

  void _selectSegment(int index, {bool play = true}) {
    setState(() {
      _activeIndex = index;
      _heldWord = null;
      _heldSegmentIndex = null;
      _heldWordIndex = null;
    });
    if (play) _playSegment(index);
  }

  void _holdWord(int segmentIndex, int wordIndex, StoryWord word) {
    setState(() {
      _activeIndex = segmentIndex;
      _heldWord = word;
      _heldSegmentIndex = segmentIndex;
      _heldWordIndex = wordIndex;
    });
  }

  void _dismissHeldWord() {
    setState(() {
      _heldWord = null;
      _heldSegmentIndex = null;
      _heldWordIndex = null;
    });
  }

  void _showVocabularyWord(VocabularyItem item) {
    setState(() {
      _heldWord = StoryWord(
        text: item.simplified,
        pinyin: item.pinyin,
        english: item.english,
      );
      // Vocabulary entries are not tied to a sentence, so nothing in the
      // story flow gets highlighted.
      _heldSegmentIndex = null;
      _heldWordIndex = null;
    });
  }

  Future<void> _playSegment(int index, {bool playAll = false}) async {
    final story = _loadedStory;
    if (story == null) return;
    final segment = story.segments[index];
    final plan = story.audioPlanFor(segment, _speed);
    if (plan == null) {
      _showMessage('This paragraph does not have audio yet.');
      return;
    }

    if (mounted) {
      setState(() {
        _activeIndex = index;
        _playingIndex = index;
        _playAll = playAll;
      });
      _scrollToSegment(index);
    }

    _playToken++;
    try {
      await _player.stop();
      final sourcePath = plan.asset.startsWith('assets/')
          ? plan.asset.substring('assets/'.length)
          : plan.asset;
      // Load the source and apply the rate before starting playback so the
      // first syllable is never clipped by a cold decoder or late rate change.
      await _player.setSource(AssetSource(sourcePath));
      await _player.setPlaybackRate(plan.playbackRate);
      await _player.resume();
      await _saveProgress(index);
    } catch (_) {
      if (!mounted) return;
      _showMessage(
        'Audio could not be played. Re-publish this story from the workshop.',
      );
      setState(() {
        _playingIndex = null;
        _playAll = false;
      });
    }
  }

  void _scrollToSegment(int index) {
    final key = _segmentKeys[index];
    final context = key?.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      alignment: 0.25,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _setSpeed(double speed) async {
    setState(() => _speed = speed);
    // The slow speeds may use a different audio file entirely, so restart the
    // current segment rather than adjusting the rate mid-stream.
    final playing = _playingIndex;
    if (playing != null) {
      await _playSegment(playing, playAll: _playAll);
    }
  }

  Future<void> _handleAudioComplete() async {
    final story = _loadedStory;
    final index = _playingIndex;
    if (story == null || index == null || !mounted) return;
    if (_playAll && index + 1 < story.segments.length) {
      // Short breather between sentences; abort if the user stopped or
      // started other playback while we were waiting.
      final token = ++_playToken;
      await Future<void>.delayed(const Duration(milliseconds: 280));
      if (!mounted || token != _playToken || !_playAll) return;
      await _playSegment(index + 1, playAll: true);
      return;
    }
    setState(() {
      _playingIndex = null;
      _playAll = false;
    });
    if (index == story.segments.length - 1) {
      await _markComplete(story.id);
    }
  }

  Future<void> _stopAudio() async {
    _playToken++;
    await _player.stop();
    if (!mounted) return;
    setState(() {
      _playAll = false;
      _playingIndex = null;
    });
  }

  Future<void> _saveProgress(int index) async {
    final story = _loadedStory;
    if (story == null) return;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setInt('mandarin.progress.${story.id}', index);
  }

  Future<void> _markComplete(String storyId) async {
    final preferences = await SharedPreferences.getInstance();
    final completed =
        preferences.getStringList('mandarin.completedStories')?.toSet() ?? {};
    completed.add(storyId);
    await preferences.setStringList(
      'mandarin.completedStories',
      completed.toList(),
    );
    if (mounted) _showMessage('Story complete — 太好了!');
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      appBar: AppBar(title: Text(widget.summary.titleChinese)),
      body: FutureBuilder<Story>(
        future: _story,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return const Center(child: Text('This story could not be opened.'));
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final story = snapshot.data!;
          _prepareStory(story);
          final activeSegment =
              _activeIndex < story.segments.length
                  ? story.segments[_activeIndex]
                  : null;
          return Column(
            children: [
              _ReaderControls(
                showPinyin: _showPinyin,
                speed: _speed,
                onPinyinChanged: (value) => setState(() => _showPinyin = value),
                onSpeedChanged: _setSpeed,
              ),
              _TranslationPanel(
                segment: activeSegment,
                segmentNumber: _activeIndex + 1,
                segmentCount: story.segments.length,
                heldWord: _heldWord,
                onDismissWord: _dismissHeldWord,
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 130),
                  children: [
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 760),
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFDF8),
                            borderRadius: BorderRadius.circular(22),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x100F2F26),
                                blurRadius: 22,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _StoryHeader(story: story),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  22,
                                  14,
                                  22,
                                  30,
                                ),
                                child: _StoryFlow(
                                  story: story,
                                  segmentWords: _segmentWords,
                                  segmentKeys: _segmentKeys,
                                  showPinyin: _showPinyin,
                                  activeIndex: _activeIndex,
                                  playingIndex: _playingIndex,
                                  heldSegmentIndex: _heldSegmentIndex,
                                  heldWordIndex: _heldWordIndex,
                                  onTapSegment: _selectSegment,
                                  onHoldWord: _holdWord,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (story.vocabulary.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 760),
                          child: _VocabularySection(
                            items: story.vocabulary,
                            onTapItem: _showVocabularyWord,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _playAll
            ? _stopAudio
            : () => _playSegment(_activeIndex, playAll: true),
        backgroundColor: MandarinReaderApp.ink,
        foregroundColor: Colors.white,
        icon: Icon(_playAll ? Icons.stop_rounded : Icons.play_arrow_rounded),
        label: Text(_playAll ? 'Stop narration' : 'Play story'),
      ),
    );
  }
}

/// The persistent panel pinned under the toolbar. It always shows the English
/// translation of the sentence the reader is on; while a word is being held
/// it switches to that word's definition, like Du Chinese.
class _TranslationPanel extends StatelessWidget {
  const _TranslationPanel({
    required this.segment,
    required this.segmentNumber,
    required this.segmentCount,
    required this.heldWord,
    required this.onDismissWord,
  });

  final StorySegment? segment;
  final int segmentNumber;
  final int segmentCount;
  final StoryWord? heldWord;
  final VoidCallback onDismissWord;

  @override
  Widget build(BuildContext context) {
    final word = heldWord;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFFFFFDF8),
        border: Border(
          bottom: BorderSide(color: Color(0xFFE7E1D5)),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x0D0F2F26),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760, minHeight: 84),
          child: AnimatedSize(
            duration: const Duration(milliseconds: 160),
            alignment: Alignment.topCenter,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 140),
              child: word != null
                  ? _wordView(context, word)
                  : _translationView(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _translationView(BuildContext context) {
    return Padding(
      key: const ValueKey('translation'),
      padding: const EdgeInsets.fromLTRB(22, 14, 22, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'SENTENCE $segmentNumber OF $segmentCount · ENGLISH',
            style: const TextStyle(
              color: MandarinReaderApp.jade,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            segment?.english.isNotEmpty == true
                ? segment!.english
                : 'Tap a sentence below to hear it and see its translation.',
            style: const TextStyle(
              color: MandarinReaderApp.ink,
              fontSize: 17,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _wordView(BuildContext context, StoryWord word) {
    return Padding(
      key: ValueKey('word-${word.text}'),
      padding: const EdgeInsets.fromLTRB(22, 12, 10, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            word.text,
            style: const TextStyle(
              color: MandarinReaderApp.ink,
              fontSize: 34,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (word.pinyin.isNotEmpty)
                  Text(
                    word.pinyin,
                    style: const TextStyle(
                      color: MandarinReaderApp.jade,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                Text(
                  word.english.isNotEmpty
                      ? word.english
                      : 'No definition added for this word yet.',
                  style: const TextStyle(
                    color: MandarinReaderApp.ink,
                    fontSize: 16,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onDismissWord,
            tooltip: 'Back to translation',
            icon: const Icon(Icons.close_rounded, color: Color(0xFF7D827E)),
          ),
        ],
      ),
    );
  }
}

/// The whole story rendered as one continuous, book-like flow of tappable
/// words. Sentences are not boxed apart; the active sentence is highlighted
/// inline, and pinyin sits above each word as ruby text.
class _StoryFlow extends StatelessWidget {
  const _StoryFlow({
    required this.story,
    required this.segmentWords,
    required this.segmentKeys,
    required this.showPinyin,
    required this.activeIndex,
    required this.playingIndex,
    required this.heldSegmentIndex,
    required this.heldWordIndex,
    required this.onTapSegment,
    required this.onHoldWord,
  });

  final Story story;
  final List<List<StoryWord>> segmentWords;
  final Map<int, GlobalKey> segmentKeys;
  final bool showPinyin;
  final int activeIndex;
  final int? playingIndex;
  final int? heldSegmentIndex;
  final int? heldWordIndex;
  final void Function(int index) onTapSegment;
  final void Function(int segmentIndex, int wordIndex, StoryWord word)
      onHoldWord;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    for (var s = 0; s < story.segments.length; s++) {
      final words = s < segmentWords.length ? segmentWords[s] : const <StoryWord>[];
      for (var w = 0; w < words.length; w++) {
        final word = words[w];
        final punctuation = _WordTokenizer.isPunctuation(word.text);
        Widget child = _WordChip(
          word: word,
          showPinyin: showPinyin,
          active: s == activeIndex,
          playing: s == playingIndex,
          held: s == heldSegmentIndex && w == heldWordIndex,
        );
        if (!punctuation) {
          final segmentIndex = s;
          final wordIndex = w;
          child = GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onTapSegment(segmentIndex),
            onLongPress: () => onHoldWord(segmentIndex, wordIndex, word),
            child: child,
          );
        }
        if (w == 0) {
          child = KeyedSubtree(key: segmentKeys[s], child: child);
        }
        children.add(child);
      }
    }
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.end,
      runSpacing: showPinyin ? 10 : 6,
      children: children,
    );
  }
}

class _WordChip extends StatelessWidget {
  const _WordChip({
    required this.word,
    required this.showPinyin,
    required this.active,
    required this.playing,
    required this.held,
  });

  final StoryWord word;
  final bool showPinyin;
  final bool active;
  final bool playing;
  final bool held;

  @override
  Widget build(BuildContext context) {
    final background = held
        ? const Color(0xFFBFE3D2)
        : active
            ? const Color(0xFFE6F2EB)
            : Colors.transparent;
    final hanzi = Text(
      word.text,
      style: TextStyle(
        color: MandarinReaderApp.ink,
        fontSize: 26,
        fontWeight: playing ? FontWeight.w600 : FontWeight.w500,
        height: 1.35,
      ),
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(6),
      ),
      child: showPinyin
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 15,
                  child: Text(
                    word.pinyin,
                    style: const TextStyle(
                      color: MandarinReaderApp.jade,
                      fontSize: 11.5,
                      height: 1.15,
                    ),
                  ),
                ),
                hanzi,
              ],
            )
          : hanzi,
    );
  }
}

class _ReaderControls extends StatelessWidget {
  const _ReaderControls({
    required this.showPinyin,
    required this.speed,
    required this.onPinyinChanged,
    required this.onSpeedChanged,
  });

  final bool showPinyin;
  final double speed;
  final ValueChanged<bool> onPinyinChanged;
  final ValueChanged<double> onSpeedChanged;

  String _speedLabel(double value) {
    return value == value.roundToDouble()
        ? '${value.toStringAsFixed(1)}×'
        : '${value.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '')}×';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFFFFDF8),
        border: Border(bottom: BorderSide(color: Color(0xFFE7E1D5))),
      ),
      child: Row(
        children: [
          FilterChip(
            selected: showPinyin,
            onSelected: onPinyinChanged,
            label: const Text('拼 Pinyin'),
          ),
          const Spacer(),
          PopupMenuButton<double>(
            tooltip: 'Narration speed',
            initialValue: speed,
            onSelected: onSpeedChanged,
            itemBuilder: (context) => [
              for (final value in const [0.5, 0.75, 1.0, 1.25, 1.5])
                PopupMenuItem(
                  value: value,
                  child: Row(
                    children: [
                      if (value == speed)
                        const Icon(
                          Icons.check_rounded,
                          size: 18,
                          color: MandarinReaderApp.jade,
                        )
                      else
                        const SizedBox(width: 18),
                      const SizedBox(width: 8),
                      Text(_speedLabel(value)),
                    ],
                  ),
                ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: Row(
                children: [
                  const Icon(Icons.speed_rounded, size: 19),
                  const SizedBox(width: 6),
                  Text(
                    _speedLabel(speed),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StoryHeader extends StatelessWidget {
  const _StoryHeader({required this.story});

  final Story story;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
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
                  color: const Color(0xFFE2F0E9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  story.level,
                  style: const TextStyle(
                    color: MandarinReaderApp.jade,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
              const Spacer(),
              const Icon(
                Icons.touch_app_outlined,
                size: 18,
                color: Color(0xFF7D827E),
              ),
              const SizedBox(width: 5),
              const Text(
                'Hold a word · tap a sentence',
                style: TextStyle(color: Color(0xFF7D827E), fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            story.titleChinese,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: MandarinReaderApp.ink,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (story.titlePinyin.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              story.titlePinyin,
              style: const TextStyle(
                color: MandarinReaderApp.jade,
                fontSize: 15,
              ),
            ),
          ],
          const SizedBox(height: 5),
          Text(
            story.titleEnglish,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(color: const Color(0xFF646B66)),
          ),
          const SizedBox(height: 20),
          const Divider(height: 1, color: Color(0xFFE7E1D5)),
        ],
      ),
    );
  }
}

/// Splits a segment's Chinese text into tappable words using the segment's own
/// word data when present, otherwise the story vocabulary plus a small
/// built-in HSK glossary.
class _WordTokenizer {
  static final RegExp _punctuation = RegExp(r'^[\s，。！？；：“”‘’、,.!?;:—…（）()]+$');

  static bool isPunctuation(String text) => _punctuation.hasMatch(text);

  static const List<VocabularyItem> _fallbackGlossary = [
    VocabularyItem(simplified: '我', pinyin: 'wǒ', english: 'I; me'),
    VocabularyItem(simplified: '是', pinyin: 'shì', english: 'to be'),
    VocabularyItem(
      simplified: '的',
      pinyin: 'de',
      english: 'possessive particle',
    ),
    VocabularyItem(
      simplified: '了',
      pinyin: 'le',
      english: 'change or completion particle',
    ),
    VocabularyItem(simplified: '在', pinyin: 'zài', english: 'at; in; on'),
    VocabularyItem(
      simplified: '有',
      pinyin: 'yǒu',
      english: 'to have; there is',
    ),
    VocabularyItem(simplified: '不', pinyin: 'bù', english: 'not; no'),
    VocabularyItem(simplified: '很', pinyin: 'hěn', english: 'very'),
    VocabularyItem(simplified: '去', pinyin: 'qù', english: 'to go'),
    VocabularyItem(simplified: '看', pinyin: 'kàn', english: 'to look; to see'),
    VocabularyItem(simplified: '里', pinyin: 'lǐ', english: 'inside'),
    VocabularyItem(simplified: '上', pinyin: 'shàng', english: 'on; above'),
    VocabularyItem(simplified: '但是', pinyin: 'dànshì', english: 'but; however'),
    VocabularyItem(
      simplified: '还是',
      pinyin: 'háishì',
      english: 'still; nevertheless',
    ),
    VocabularyItem(simplified: '可以', pinyin: 'kěyǐ', english: 'can; may'),
    VocabularyItem(
      simplified: '没有',
      pinyin: 'méiyǒu',
      english: 'to not have; there is not',
    ),
    VocabularyItem(simplified: '看见', pinyin: 'kànjiàn', english: 'to see'),
    VocabularyItem(simplified: '喜欢', pinyin: 'xǐhuan', english: 'to like'),
    VocabularyItem(simplified: '这里', pinyin: 'zhèlǐ', english: 'here'),
    VocabularyItem(simplified: '这个', pinyin: 'zhège', english: 'this'),
    VocabularyItem(simplified: '现在', pinyin: 'xiànzài', english: 'now'),
    VocabularyItem(
      simplified: '非常',
      pinyin: 'fēicháng',
      english: 'extremely; very',
    ),
    VocabularyItem(
      simplified: '回到',
      pinyin: 'huí dào',
      english: 'to return to',
    ),
    VocabularyItem(simplified: '睁开', pinyin: 'zhēngkāi', english: 'to open'),
    VocabularyItem(simplified: '闭上', pinyin: 'bì shàng', english: 'to close'),
    VocabularyItem(
      simplified: '坐在',
      pinyin: 'zuò zài',
      english: 'to sit on or at',
    ),
    VocabularyItem(
      simplified: '跳上',
      pinyin: 'tiào shàng',
      english: 'to jump onto',
    ),
    VocabularyItem(simplified: '找', pinyin: 'zhǎo', english: 'to look for'),
    VocabularyItem(simplified: '走', pinyin: 'zǒu', english: 'to walk'),
    VocabularyItem(simplified: '喝', pinyin: 'hē', english: 'to drink'),
    VocabularyItem(simplified: '吃', pinyin: 'chī', english: 'to eat'),
    VocabularyItem(simplified: '叫', pinyin: 'jiào', english: 'to be called'),
    VocabularyItem(simplified: '名字', pinyin: 'míngzi', english: 'name'),
    VocabularyItem(simplified: '眼睛', pinyin: 'yǎnjing', english: 'eyes'),
    VocabularyItem(simplified: '房间', pinyin: 'fángjiān', english: 'room'),
    VocabularyItem(simplified: '杯子', pinyin: 'bēizi', english: 'cup'),
    VocabularyItem(
      simplified: '地上',
      pinyin: 'dìshang',
      english: 'on the floor',
    ),
    VocabularyItem(
      simplified: '床边',
      pinyin: 'chuángbiān',
      english: 'beside the bed',
    ),
    VocabularyItem(simplified: '一只', pinyin: 'yì zhī', english: 'one (animal)'),
    VocabularyItem(
      simplified: '一把',
      pinyin: 'yì bǎ',
      english: 'one (object with a handle)',
    ),
    VocabularyItem(
      simplified: '一张',
      pinyin: 'yì zhāng',
      english: 'one (flat object)',
    ),
    VocabularyItem(simplified: '一个', pinyin: 'yí ge', english: 'one; a'),
    VocabularyItem(
      simplified: '雪儿',
      pinyin: "Xuě'ér",
      english: 'Snow (a name)',
    ),
    VocabularyItem(simplified: '那儿', pinyin: 'nàr', english: 'there'),
    VocabularyItem(simplified: '往', pinyin: 'wǎng', english: 'toward'),
    VocabularyItem(simplified: '给', pinyin: 'gěi', english: 'for; to give'),
    VocabularyItem(simplified: '啊', pinyin: 'a', english: 'softening particle'),
    VocabularyItem(simplified: '大', pinyin: 'dà', english: 'big'),
    VocabularyItem(simplified: '高', pinyin: 'gāo', english: 'high; tall'),
    VocabularyItem(simplified: '凉', pinyin: 'liáng', english: 'cool; cold'),
    VocabularyItem(simplified: '好吃', pinyin: 'hǎochī', english: 'delicious'),
    VocabularyItem(simplified: '更好', pinyin: 'gèng hǎo', english: 'better'),
    VocabularyItem(simplified: '饱', pinyin: 'bǎo', english: 'full; not hungry'),
    VocabularyItem(simplified: '困', pinyin: 'kùn', english: 'sleepy'),
  ];

  static List<StoryWord> tokenize(
    StorySegment segment,
    List<VocabularyItem> vocabulary,
  ) {
    if (segment.words.isNotEmpty) return segment.words;

    final glossary = [...vocabulary, ..._fallbackGlossary]
      ..sort((a, b) => b.simplified.length.compareTo(a.simplified.length));
    final words = <StoryWord>[];
    var offset = 0;
    while (offset < segment.chinese.length) {
      VocabularyItem? match;
      for (final item in glossary) {
        if (item.simplified.isNotEmpty &&
            segment.chinese.startsWith(item.simplified, offset)) {
          match = item;
          break;
        }
      }
      if (match != null) {
        words.add(
          StoryWord(
            text: match.simplified,
            pinyin: match.pinyin,
            english: match.english,
          ),
        );
        offset += match.simplified.length;
      } else {
        final rune = segment.chinese.substring(offset).runes.first;
        final text = String.fromCharCode(rune);
        words.add(StoryWord(text: text, pinyin: '', english: ''));
        offset += text.length;
      }
    }
    return words;
  }
}

class _VocabularySection extends StatelessWidget {
  const _VocabularySection({required this.items, required this.onTapItem});

  final List<VocabularyItem> items;
  final ValueChanged<VocabularyItem> onTapItem;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Useful words',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFFFFDF8),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE1DCCF)),
          ),
          child: Column(
            children: [
              for (var index = 0; index < items.length; index++) ...[
                ListTile(
                  onTap: () => onTapItem(items[index]),
                  title: Text(
                    items[index].simplified,
                    style: const TextStyle(fontSize: 20),
                  ),
                  subtitle: Text(items[index].pinyin),
                  trailing: Text(items[index].english),
                ),
                if (index != items.length - 1) const Divider(height: 1),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
