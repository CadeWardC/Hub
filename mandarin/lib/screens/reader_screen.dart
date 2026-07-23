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
      _showMessage('This segment does not have audio yet.');
      return;
    }

    try {
      await _player.stop();
      await _player.setPlaybackRate(_speed);
      final sourcePath = asset.startsWith('assets/')
          ? asset.substring('assets/'.length)
          : asset;
      await _player.play(AssetSource(sourcePath));
      if (!mounted) return;
      setState(() {
        _playingIndex = index;
        _playAll = playAll;
      });
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
                onSpeedPressed: () => _cycleSpeed(),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 130),
                  children: [
                    _StoryHeader(story: story),
                    const SizedBox(height: 14),
                    for (var index = 0; index < story.segments.length; index++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _SegmentCard(
                          segment: story.segments[index],
                          index: index,
                          showPinyin: _showPinyin,
                          showEnglish: _showEnglish,
                          playing: _playingIndex == index,
                          onPlay: () => _playSegment(index),
                        ),
                      ),
                    if (story.vocabulary.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      _VocabularySection(items: story.vocabulary),
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
        onPressed: () {
          if (_playAll) {
            _player.stop();
            setState(() {
              _playAll = false;
              _playingIndex = null;
            });
          } else {
            _playSegment(0, playAll: true);
          }
        },
        backgroundColor: MandarinReaderApp.ink,
        foregroundColor: Colors.white,
        icon: Icon(_playAll ? Icons.stop_rounded : Icons.play_arrow_rounded),
        label: Text(_playAll ? 'Stop narration' : 'Play full story'),
      ),
    );
  }

  void _cycleSpeed() {
    const speeds = [0.75, 1.0, 1.25];
    final next = (speeds.indexOf(_speed) + 1) % speeds.length;
    setState(() => _speed = speeds[next]);
    _player.setPlaybackRate(_speed);
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
                title: const Text('Show English'),
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
    required this.onSpeedPressed,
  });

  final bool showPinyin;
  final bool showEnglish;
  final double speed;
  final ValueChanged<bool> onPinyinChanged;
  final ValueChanged<bool> onEnglishChanged;
  final VoidCallback onSpeedPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFFFFDF8),
        border: Border(bottom: BorderSide(color: Color(0xFFE1DCCF))),
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
          TextButton.icon(
            onPressed: onSpeedPressed,
            icon: const Icon(Icons.speed, size: 18),
            label: Text('$speed×'),
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
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E5745),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            story.level,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: const Color(0xFFB9DEC9),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            story.titleChinese,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (story.titlePinyin.isNotEmpty)
            Text(
              story.titlePinyin,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: const Color(0xFFD2E8DD)),
            ),
          const SizedBox(height: 8),
          Text(
            story.titleEnglish,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(color: const Color(0xFFFFE3A0)),
          ),
        ],
      ),
    );
  }
}

class _SegmentCard extends StatelessWidget {
  const _SegmentCard({
    required this.segment,
    required this.index,
    required this.showPinyin,
    required this.showEnglish,
    required this.playing,
    required this.onPlay,
  });

  final StorySegment segment;
  final int index;
  final bool showPinyin;
  final bool showEnglish;
  final bool playing;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        color: playing ? const Color(0xFFE2F0E9) : const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: playing ? MandarinReaderApp.jade : const Color(0xFFE1DCCF),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onPlay,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 12, 18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      segment.chinese,
                      style: const TextStyle(
                        fontSize: 25,
                        fontWeight: FontWeight.w600,
                        height: 1.55,
                      ),
                    ),
                    if (showPinyin && segment.pinyin.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        segment.pinyin,
                        style: const TextStyle(
                          color: MandarinReaderApp.jade,
                          fontSize: 15,
                          height: 1.5,
                        ),
                      ),
                    ],
                    if (showEnglish && segment.english.isNotEmpty) ...[
                      const SizedBox(height: 9),
                      Text(
                        segment.english,
                        style: const TextStyle(
                          color: Color(0xFF667069),
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                onPressed: onPlay,
                tooltip: 'Play segment ${index + 1}',
                icon: Icon(
                  playing ? Icons.graphic_eq : Icons.volume_up_outlined,
                  color: MandarinReaderApp.jade,
                ),
              ),
            ],
          ),
        ),
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
