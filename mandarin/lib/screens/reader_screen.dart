import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../models/story.dart';
import '../services/saved_words_store.dart';
import '../services/story_repository.dart';
import '../utils/tones.dart';
import '../widgets/player_bar.dart';

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
  bool _showToneColors = false;
  bool _showEnglish = true;
  bool _playAll = false;
  int _activeIndex = 0;
  int? _playingIndex;

  // When translations are hidden, the one sentence the reader tapped to
  // reveal.
  int? _revealedIndex;
  Set<String> _savedTexts = {};
  double _speed = 1;

  // Bumped whenever playback state changes so a pending auto-advance that was
  // scheduled before the change can detect it is stale and abort.
  int _playToken = 0;

  // When set, the top panel shows this word instead of the sentence
  // translation, mirroring Du Chinese's press-a-word behavior.
  StoryWord? _heldWord;
  int? _heldSegmentIndex;
  int? _heldWordIndex;

  // Words pressed in the story flow are transient — the definition lives only
  // as long as the finger is down. Words opened from the vocabulary list are
  // pinned instead, and stay until dismissed.
  bool _wordPinned = false;

  @override
  void initState() {
    super.initState();
    _story = widget.repository.loadStory(widget.summary);
    // The player bar lives outside the FutureBuilder, so surface the loaded
    // story through state as well.
    _story.then((story) {
      if (mounted) setState(() => _prepareStory(story));
    }).catchError((_) {});
    _completionSubscription = _player.onPlayerComplete.listen((_) {
      _handleAudioComplete();
    });
    _loadSavedWords();
    _recordLastRead();
  }

  Future<void> _loadSavedWords() async {
    final texts = await SavedWordsStore.savedTexts();
    if (mounted) setState(() => _savedTexts = texts);
  }

  Future<void> _recordLastRead() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      'mandarin.lastRead.v1',
      jsonEncode({
        'storyId': widget.summary.id,
        'at': DateTime.now().toIso8601String(),
      }),
    );
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

  /// Pressing a word shows its definition in the top panel and makes its
  /// sentence the active one, without starting audio — listening is driven
  /// from the player bar. The definition lasts only while the press is held.
  void _pressWord(int segmentIndex, int wordIndex, StoryWord word) {
    setState(() {
      _activeIndex = segmentIndex;
      _revealedIndex = null;
      _heldWord = word;
      _heldSegmentIndex = segmentIndex;
      _heldWordIndex = wordIndex;
      _wordPinned = false;
    });
  }

  /// Releasing (or cancelling, e.g. by scrolling away) returns the panel to
  /// the sentence translation. Pinned words are left alone.
  void _releaseWord() {
    if (_heldWord == null || _wordPinned) return;
    setState(() {
      _heldWord = null;
      _heldSegmentIndex = null;
      _heldWordIndex = null;
    });
  }

  void _togglePlay() {
    if (_playingIndex != null || _playAll) {
      _stopAudio();
    } else {
      _playSegment(_activeIndex, playAll: true);
    }
  }

  void _goToSegment(int index) {
    final story = _loadedStory;
    if (story == null || index < 0 || index >= story.segments.length) return;
    final wasPlaying = _playingIndex != null;
    setState(() {
      _activeIndex = index;
      _revealedIndex = null;
      _heldWord = null;
      _heldSegmentIndex = null;
      _heldWordIndex = null;
      _wordPinned = false;
    });
    _scrollToSegment(index);
    if (wasPlaying) {
      _playSegment(index, playAll: _playAll);
    } else {
      _playToken++;
    }
  }

  Future<void> _toggleSavedWord() async {
    final word = _heldWord;
    final story = _loadedStory;
    if (word == null || story == null) return;
    final saved = await SavedWordsStore.toggle(
      text: word.text,
      pinyin: word.pinyin,
      english: word.english,
      storyId: story.id,
    );
    if (!mounted) return;
    setState(() {
      if (saved) {
        _savedTexts.add(word.text);
      } else {
        _savedTexts.remove(word.text);
      }
    });
  }

  void _revealTranslation() {
    setState(() => _revealedIndex = _activeIndex);
  }

  void _dismissHeldWord() {
    setState(() {
      _heldWord = null;
      _heldSegmentIndex = null;
      _heldWordIndex = null;
      _wordPinned = false;
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
      _wordPinned = true;
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
                showToneColors: _showToneColors,
                showEnglish: _showEnglish,
                onPinyinChanged: (value) => setState(() => _showPinyin = value),
                onToneColorsChanged: (value) =>
                    setState(() => _showToneColors = value),
                onEnglishChanged: (value) => setState(() {
                  _showEnglish = value;
                  _revealedIndex = null;
                }),
              ),
              _TranslationPanel(
                segment: activeSegment,
                segmentNumber: _activeIndex + 1,
                segmentCount: story.segments.length,
                heldWord: _heldWord,
                wordPinned: _wordPinned,
                hidden: !_showEnglish && _revealedIndex != _activeIndex,
                toneColors: _showToneColors,
                heldWordSaved:
                    _heldWord != null && _savedTexts.contains(_heldWord!.text),
                onDismissWord: _dismissHeldWord,
                onReveal: _revealTranslation,
                onToggleSaved: _toggleSavedWord,
              ),
              Expanded(
                child: ListView(
                  key: const Key('storyScroll'),
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 40),
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
                                  toneColors: _showToneColors,
                                  activeIndex: _activeIndex,
                                  playingIndex: _playingIndex,
                                  heldSegmentIndex: _heldSegmentIndex,
                                  heldWordIndex: _heldWordIndex,
                                  savedTexts: _savedTexts,
                                  onWordPressed: _pressWord,
                                  onWordReleased: _releaseWord,
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
      bottomNavigationBar: _loadedStory == null
          ? null
          : PlayerBar(
              playing: _playingIndex != null,
              sentenceNumber: _activeIndex + 1,
              sentenceCount: _loadedStory!.segments.length,
              speed: _speed,
              onPlayPause: _togglePlay,
              onPrevious: _activeIndex > 0
                  ? () => _goToSegment(_activeIndex - 1)
                  : null,
              onNext: _activeIndex + 1 < _loadedStory!.segments.length
                  ? () => _goToSegment(_activeIndex + 1)
                  : null,
              onSpeedChanged: _setSpeed,
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
    required this.wordPinned,
    required this.hidden,
    required this.toneColors,
    required this.heldWordSaved,
    required this.onDismissWord,
    required this.onReveal,
    required this.onToggleSaved,
  });

  final StorySegment? segment;
  final int segmentNumber;
  final int segmentCount;
  final StoryWord? heldWord;
  final bool wordPinned;
  final bool hidden;
  final bool toneColors;
  final bool heldWordSaved;
  final VoidCallback onDismissWord;
  final VoidCallback onReveal;
  final VoidCallback onToggleSaved;

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
    final english = segment?.english.isNotEmpty == true
        ? segment!.english
        : 'Hold a word below to see its meaning here.';
    return GestureDetector(
      key: ValueKey('translation-$hidden'),
      behavior: HitTestBehavior.opaque,
      onTap: hidden ? onReveal : null,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 14, 22, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              hidden
                  ? 'SENTENCE $segmentNumber OF $segmentCount · TAP TO REVEAL'
                  : 'SENTENCE $segmentNumber OF $segmentCount · ENGLISH',
              style: const TextStyle(
                color: MandarinReaderApp.jade,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              english,
              style: hidden
                  // Blur the translation in hide-English mode; the shadow is
                  // the only visible ink.
                  ? const TextStyle(
                      color: Colors.transparent,
                      fontSize: 17,
                      height: 1.45,
                      shadows: [
                        Shadow(color: Color(0xFF9AA39D), blurRadius: 10),
                      ],
                    )
                  : const TextStyle(
                      color: MandarinReaderApp.ink,
                      fontSize: 17,
                      height: 1.45,
                    ),
            ),
          ],
        ),
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
                  Text.rich(
                    TextSpan(
                      children: pinyinSpans(
                        word.pinyin,
                        colored: toneColors,
                        fallback: MandarinReaderApp.jade,
                      ),
                    ),
                    style: const TextStyle(
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
          // A word being held disappears the moment the finger lifts, so its
          // buttons would be unreachable — only pinned words get them.
          if (wordPinned) ...[
            IconButton(
              onPressed: onToggleSaved,
              tooltip: heldWordSaved ? 'Remove saved word' : 'Save word',
              icon: Icon(
                heldWordSaved
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                color: MandarinReaderApp.jade,
              ),
            ),
            IconButton(
              onPressed: onDismissWord,
              tooltip: 'Back to translation',
              icon: const Icon(Icons.close_rounded, color: Color(0xFF7D827E)),
            ),
          ] else
            const SizedBox(width: 12),
        ],
      ),
    );
  }
}

/// The whole story rendered as one continuous, book-like flow of pressable
/// words. Sentences are not boxed apart; the active sentence is highlighted
/// inline, and pinyin sits above each word as ruby text.
///
/// The press is tracked by the flow as a whole rather than by per-word gesture
/// detectors, so a press can slide from word to word without lifting: the
/// definition always follows whichever word the pointer is currently over.
class _StoryFlow extends StatefulWidget {
  const _StoryFlow({
    required this.story,
    required this.segmentWords,
    required this.segmentKeys,
    required this.showPinyin,
    required this.toneColors,
    required this.activeIndex,
    required this.playingIndex,
    required this.heldSegmentIndex,
    required this.heldWordIndex,
    required this.savedTexts,
    required this.onWordPressed,
    required this.onWordReleased,
  });

  final Story story;
  final List<List<StoryWord>> segmentWords;
  final Map<int, GlobalKey> segmentKeys;
  final bool showPinyin;
  final bool toneColors;
  final int activeIndex;
  final int? playingIndex;
  final int? heldSegmentIndex;
  final int? heldWordIndex;
  final Set<String> savedTexts;
  final void Function(int segmentIndex, int wordIndex, StoryWord word)
      onWordPressed;
  final VoidCallback onWordReleased;

  @override
  State<_StoryFlow> createState() => _StoryFlowState();
}

class _StoryFlowState extends State<_StoryFlow> {
  /// One key per pressable word, kept across rebuilds so the boxes we hit-test
  /// against stay put. Keyed by `'segment:word'`.
  final Map<String, GlobalKey> _wordKeys = {};

  bool _pressing = false;
  String? _pressedKey;
  Offset _pressOrigin = Offset.zero;

  // Set once a press has clearly become a sweep across words rather than the
  // start of a scroll, after which vertical movement no longer cancels it.
  bool _sweeping = false;

  void _handlePointerDown(PointerDownEvent event) {
    _pressing = true;
    _pressedKey = null;
    _pressOrigin = event.position;
    // A mouse drag never scrolls the story, so it is a sweep from the outset.
    _sweeping = event.kind != PointerDeviceKind.touch;
    _updateForPosition(event.position);
  }

  /// The flow sits inside a vertically scrolling list, and a [Listener] does
  /// not compete in the gesture arena, so a press that turns into a vertical
  /// drag has to bow out by hand — otherwise the definition would ride along
  /// while the reader scrolls.
  void _handlePointerMove(PointerMoveEvent event) {
    if (!_pressing) return;
    if (!_sweeping) {
      final delta = event.position - _pressOrigin;
      if (delta.dx.abs() > kTouchSlop && delta.dx.abs() > delta.dy.abs()) {
        _sweeping = true;
      } else if (delta.dy.abs() > kTouchSlop) {
        _endPress();
        return;
      }
    }
    _updateForPosition(event.position);
  }

  void _endPress() {
    if (!_pressing) return;
    _pressing = false;
    _pressedKey = null;
    _sweeping = false;
    widget.onWordReleased();
  }

  /// Shows the definition of whichever word sits under [globalPosition]. When
  /// the pointer is between words — on punctuation, a gap, or off the
  /// paragraph — the current definition simply stays put, so sliding along a
  /// line does not flicker.
  void _updateForPosition(Offset globalPosition) {
    for (final entry in _wordKeys.entries) {
      final box = entry.value.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.hasSize) continue;
      final rect = box.localToGlobal(Offset.zero) & box.size;
      if (!rect.contains(globalPosition)) continue;
      if (entry.key == _pressedKey) return;
      final parts = entry.key.split(':');
      final segmentIndex = int.parse(parts[0]);
      final wordIndex = int.parse(parts[1]);
      final words = segmentIndex < widget.segmentWords.length
          ? widget.segmentWords[segmentIndex]
          : const <StoryWord>[];
      if (wordIndex >= words.length) return;
      _pressedKey = entry.key;
      widget.onWordPressed(segmentIndex, wordIndex, words[wordIndex]);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final story = widget.story;
    final children = <Widget>[];
    final liveKeys = <String>{};
    for (var s = 0; s < story.segments.length; s++) {
      final words = s < widget.segmentWords.length
          ? widget.segmentWords[s]
          : const <StoryWord>[];
      for (var w = 0; w < words.length; w++) {
        final word = words[w];
        Widget child = _WordChip(
          word: word,
          showPinyin: widget.showPinyin,
          toneColors: widget.toneColors,
          active: s == widget.activeIndex,
          playing: s == widget.playingIndex,
          held: s == widget.heldSegmentIndex && w == widget.heldWordIndex,
          saved: widget.savedTexts.contains(word.text),
        );
        if (!_WordTokenizer.isPunctuation(word.text)) {
          final id = '$s:$w';
          liveKeys.add(id);
          child = KeyedSubtree(
            key: _wordKeys.putIfAbsent(id, GlobalKey.new),
            child: child,
          );
        }
        if (w == 0) {
          child = KeyedSubtree(key: widget.segmentKeys[s], child: child);
        }
        children.add(child);
      }
    }
    _wordKeys.removeWhere((id, _) => !liveKeys.contains(id));

    // The definition is shown for exactly as long as the pointer is down:
    // press to reveal, drag to move between words, release to dismiss.
    return Listener(
      onPointerDown: _handlePointerDown,
      onPointerMove: _handlePointerMove,
      onPointerUp: (_) => _endPress(),
      onPointerCancel: (_) => _endPress(),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.end,
        runSpacing: widget.showPinyin ? 10 : 6,
        children: children,
      ),
    );
  }
}

class _WordChip extends StatelessWidget {
  const _WordChip({
    required this.word,
    required this.showPinyin,
    required this.toneColors,
    required this.active,
    required this.playing,
    required this.held,
    required this.saved,
  });

  final StoryWord word;
  final bool showPinyin;
  final bool toneColors;
  final bool active;
  final bool playing;
  final bool held;
  final bool saved;

  @override
  Widget build(BuildContext context) {
    final background = held
        ? const Color(0xFFBFE3D2)
        : active
            ? const Color(0xFFE6F2EB)
            : Colors.transparent;
    final hanzi = Container(
      decoration: saved
          ? const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: MandarinReaderApp.jade, width: 2),
              ),
            )
          : null,
      child: Text(
        word.text,
        style: TextStyle(
          color: MandarinReaderApp.ink,
          fontSize: 26,
          fontWeight: playing ? FontWeight.w600 : FontWeight.w500,
          height: 1.35,
        ),
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
                  child: Text.rich(
                    TextSpan(
                      children: pinyinSpans(
                        word.pinyin,
                        colored: toneColors,
                        fallback: MandarinReaderApp.jade,
                      ),
                    ),
                    style: const TextStyle(fontSize: 11.5, height: 1.15),
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
    required this.showToneColors,
    required this.showEnglish,
    required this.onPinyinChanged,
    required this.onToneColorsChanged,
    required this.onEnglishChanged,
  });

  final bool showPinyin;
  final bool showToneColors;
  final bool showEnglish;
  final ValueChanged<bool> onPinyinChanged;
  final ValueChanged<bool> onToneColorsChanged;
  final ValueChanged<bool> onEnglishChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFFFFDF8),
        border: Border(bottom: BorderSide(color: Color(0xFFE7E1D5))),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Center(
            child: FilterChip(
              selected: showPinyin,
              onSelected: onPinyinChanged,
              label: const Text('拼 Pinyin'),
            ),
          ),
          const SizedBox(width: 8),
          Center(
            child: FilterChip(
              selected: showToneColors,
              onSelected: onToneColorsChanged,
              label: const Text('声 Tones'),
            ),
          ),
          const SizedBox(width: 8),
          Center(
            child: FilterChip(
              selected: showEnglish,
              onSelected: onEnglishChanged,
              label: const Text('EN'),
              tooltip: 'Show translations (off = tap to reveal)',
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
                'Hold a word for its meaning',
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
