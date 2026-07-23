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
  bool _showPinyin = true;
  bool _showEnglish = false;
  bool _playAll = false;
  int? _playingIndex;
  double _speed = 1;

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

  Future<void> _playSegment(int index, {bool playAll = false}) async {
    final story = _loadedStory;
    if (story == null) return;
    final segment = story.segments[index];
    final asset = story.audioAssetFor(segment);
    if (asset == null) {
      _showMessage('This paragraph does not have audio yet.');
      return;
    }

    if (mounted) {
      setState(() {
        _playingIndex = index;
        _playAll = playAll;
      });
    }

    try {
      await _player.stop();
      final sourcePath = asset.startsWith('assets/')
          ? asset.substring('assets/'.length)
          : asset;
      await _player.play(AssetSource(sourcePath));
      // Audioplayers needs an active source before web/mobile playback rate
      // changes are consistently honored.
      await _player.setPlaybackRate(_speed);
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

  Future<void> _setSpeed(double speed) async {
    setState(() => _speed = speed);
    if (_playingIndex == null) return;
    try {
      await _player.setPlaybackRate(speed);
    } catch (_) {
      if (mounted) {
        _showMessage('The speed will be applied when the next audio starts.');
      }
    }
  }

  Future<void> _handleAudioComplete() async {
    final story = _loadedStory;
    final index = _playingIndex;
    if (story == null || index == null || !mounted) return;
    if (_playAll && index + 1 < story.segments.length) {
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
      appBar: AppBar(
        title: Text(widget.summary.titleChinese),
        actions: [
          IconButton(
            onPressed: () => _showSettings(context),
            icon: const Icon(Icons.tune),
            tooltip: 'Reading settings',
          ),
        ],
      ),
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
          _loadedStory = story;
          return Column(
            children: [
              _ReaderControls(
                showPinyin: _showPinyin,
                showEnglish: _showEnglish,
                speed: _speed,
                onPinyinChanged: (value) => setState(() => _showPinyin = value),
                onEnglishChanged: (value) =>
                    setState(() => _showEnglish = value),
                onSpeedChanged: _setSpeed,
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
                                  10,
                                  22,
                                  28,
                                ),
                                child: Column(
                                  children: [
                                    for (
                                      var index = 0;
                                      index < story.segments.length;
                                      index++
                                    )
                                      _StoryParagraph(
                                        segment: story.segments[index],
                                        vocabulary: story.vocabulary,
                                        index: index,
                                        showPinyin: _showPinyin,
                                        showEnglish:
                                            _showEnglish ||
                                            _playingIndex == index,
                                        playing: _playingIndex == index,
                                        onPlay: () => _playSegment(index),
                                      ),
                                  ],
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
                          child: _VocabularySection(items: story.vocabulary),
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
        onPressed: _playAll ? _stopAudio : () => _playSegment(0, playAll: true),
        backgroundColor: MandarinReaderApp.ink,
        foregroundColor: Colors.white,
        icon: Icon(_playAll ? Icons.stop_rounded : Icons.play_arrow_rounded),
        label: Text(_playAll ? 'Stop narration' : 'Play full story'),
      ),
    );
  }

  Future<void> _showSettings(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Reading help',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Show pinyin'),
                value: _showPinyin,
                onChanged: (value) {
                  setState(() => _showPinyin = value);
                  Navigator.pop(context);
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Always show English'),
                subtitle: const Text(
                  'The current paragraph is translated automatically.',
                ),
                value: _showEnglish,
                onChanged: (value) {
                  setState(() => _showEnglish = value);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ReaderControls extends StatelessWidget {
  const _ReaderControls({
    required this.showPinyin,
    required this.showEnglish,
    required this.speed,
    required this.onPinyinChanged,
    required this.onEnglishChanged,
    required this.onSpeedChanged,
  });

  final bool showPinyin;
  final bool showEnglish;
  final double speed;
  final ValueChanged<bool> onPinyinChanged;
  final ValueChanged<bool> onEnglishChanged;
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
          const SizedBox(width: 8),
          FilterChip(
            selected: showEnglish,
            onSelected: onEnglishChanged,
            label: const Text('EN'),
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
                'Hold a word',
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

class _StoryParagraph extends StatelessWidget {
  const _StoryParagraph({
    required this.segment,
    required this.vocabulary,
    required this.index,
    required this.showPinyin,
    required this.showEnglish,
    required this.playing,
    required this.onPlay,
  });

  final StorySegment segment;
  final List<VocabularyItem> vocabulary;
  final int index;
  final bool showPinyin;
  final bool showEnglish;
  final bool playing;
  final VoidCallback onPlay;

  static final RegExp _punctuation = RegExp(r'^[\s，。！？；：“”‘’、,.!?;:—…（）()]+$');
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

  List<StoryWord> _words() {
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

  void _showDefinition(BuildContext context, StoryWord word) {
    if (_punctuation.hasMatch(word.text)) return;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                word.text,
                style: const TextStyle(
                  color: MandarinReaderApp.ink,
                  fontSize: 36,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (word.pinyin.isNotEmpty) ...[
                const SizedBox(height: 3),
                Text(
                  word.pinyin,
                  style: const TextStyle(
                    color: MandarinReaderApp.jade,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Text(
                word.english.isNotEmpty
                    ? word.english
                    : 'A definition has not been added for this word yet.',
                style: const TextStyle(fontSize: 17, height: 1.45),
              ),
              const SizedBox(height: 18),
              Text(
                segment.english,
                style: const TextStyle(
                  color: Color(0xFF747A75),
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final words = _words();
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.fromLTRB(12, 14, 8, 14),
      decoration: BoxDecoration(
        color: playing ? const Color(0xFFEAF4EE) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        border: Border(
          left: BorderSide(
            color: playing ? MandarinReaderApp.jade : Colors.transparent,
            width: 3,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      for (final word in words)
                        WidgetSpan(
                          alignment: PlaceholderAlignment.baseline,
                          baseline: TextBaseline.ideographic,
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onLongPress: () => _showDefinition(context, word),
                            child: Text(
                              word.text,
                              style: TextStyle(
                                color: MandarinReaderApp.ink,
                                fontSize: 26,
                                fontWeight: playing
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                height: 1.6,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              IconButton(
                onPressed: onPlay,
                tooltip: 'Play paragraph ${index + 1}',
                visualDensity: VisualDensity.compact,
                icon: Icon(
                  playing ? Icons.graphic_eq_rounded : Icons.volume_up_outlined,
                  color: MandarinReaderApp.jade,
                ),
              ),
            ],
          ),
          if (showPinyin && segment.pinyin.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              segment.pinyin,
              style: const TextStyle(
                color: MandarinReaderApp.jade,
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ],
          AnimatedSize(
            duration: const Duration(milliseconds: 180),
            alignment: Alignment.topCenter,
            child: showEnglish && segment.english.isNotEmpty
                ? Padding(
                    padding: const EdgeInsets.only(top: 8, right: 38),
                    child: Text(
                      segment.english,
                      style: const TextStyle(
                        color: Color(0xFF59635D),
                        fontSize: 15,
                        height: 1.5,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _VocabularySection extends StatelessWidget {
  const _VocabularySection({required this.items});

  final List<VocabularyItem> items;

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
