import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../models/story.dart';

class ReaderAudioController extends ChangeNotifier {
  static const sentenceGapAsset = 'assets/audio/sentence-gap.mp3';

  ReaderAudioController() {
    _indexSubscription = _player.currentIndexStream.listen((index) {
      _activeBlockIndex = index == null
          ? null
          : _rangeStartBlock + blockIndexForSequenceIndex(index, _pace);
      _safeNotify();
    });
    _stateSubscription = _player.playerStateStream.listen((_) => _safeNotify());
  }

  final AudioPlayer _player = AudioPlayer();
  StreamSubscription<int?>? _indexSubscription;
  StreamSubscription<PlayerState>? _stateSubscription;
  StoryDocument? _story;
  String? _storyId;
  int _rangeStartBlock = 0;
  int _rangeEndBlock = 0;
  int? _activeBlockIndex;
  double _pace = 1;
  String? _error;
  bool _disposed = false;

  void _safeNotify() {
    if (!_disposed) notifyListeners();
  }

  int? get activeBlockIndex => _activeBlockIndex;
  String? get storyId => _storyId;
  String? get error => _error;
  bool get isPlaying => _player.playing;
  bool get isComplete => _player.processingState == ProcessingState.completed;
  double get pace => _pace;

  /// The UI pace describes a study experience, not destructive time-stretching.
  /// At 0.5x the voice is only slightly slower while the silence between
  /// phrases is much longer, preserving Qwen's natural pronunciation.
  static double speechSpeedForPace(double pace) {
    if (pace <= .5) return .88;
    if (pace <= .75) return .94;
    if (pace <= 1) return 1;
    if (pace <= 1.25) return 1.08;
    return 1.16;
  }

  static int gapCountForPace(double pace) {
    if (pace <= .5) return 4;
    if (pace <= .75) return 2;
    return 1;
  }

  static int sequenceIndexForBlock(int blockIndex, [double pace = 1]) =>
      blockIndex * (gapCountForPace(pace) + 1);

  static int blockIndexForSequenceIndex(int sequenceIndex, [double pace = 1]) =>
      sequenceIndex ~/ (gapCountForPace(pace) + 1);

  static List<String> audioAssetsFor(StoryDocument story) =>
      story.blocks.map(story.audioAsset).toList();

  static List<AudioSource> audioSequenceFor(
    StoryDocument story, {
    double pace = 1,
    int startAt = 0,
    int? endBefore,
  }) {
    final safeStart = startAt.clamp(0, story.blocks.length);
    final safeEnd = (endBefore ?? story.blocks.length).clamp(
      safeStart,
      story.blocks.length,
    );
    final sequence = <AudioSource>[];
    for (var index = safeStart; index < safeEnd; index++) {
      sequence.add(AudioSource.asset(story.audioAsset(story.blocks[index])));
      if (index < safeEnd - 1) {
        for (var gap = 0; gap < gapCountForPace(pace); gap++) {
          sequence.add(AudioSource.asset(sentenceGapAsset));
        }
      }
    }
    return sequence;
  }

  Future<void> setSpeed(double pace) async {
    _pace = pace;
    await _player.setSpeed(speechSpeedForPace(pace));
    _safeNotify();
  }

  Future<void> setPace(double pace, {StoryDocument? story}) async {
    final currentStory = story ?? _story;
    final active = _activeBlockIndex ?? _rangeStartBlock;
    final wasPlaying = _player.playing;
    final shouldRebuild =
        currentStory != null && _storyId == currentStory.id && pace != _pace;
    _pace = pace;
    if (shouldRebuild) {
      await _loadRange(
        currentStory,
        startAt: active,
        endBefore: _rangeEndBlock,
      );
      if (wasPlaying) await _player.play();
    } else {
      await _player.setSpeed(speechSpeedForPace(pace));
    }
    _safeNotify();
  }

  Future<void> _loadRange(
    StoryDocument story, {
    required int startAt,
    required int endBefore,
  }) async {
    final safeStart = startAt.clamp(0, story.blocks.length - 1);
    final safeEnd = endBefore.clamp(safeStart + 1, story.blocks.length);
    _story = story;
    _storyId = story.id;
    _rangeStartBlock = safeStart;
    _rangeEndBlock = safeEnd;
    _activeBlockIndex = safeStart;
    await _player.setAudioSource(
      ConcatenatingAudioSource(
        children: audioSequenceFor(
          story,
          pace: _pace,
          startAt: safeStart,
          endBefore: safeEnd,
        ),
      ),
    );
    await _player.setSpeed(speechSpeedForPace(_pace));
  }

  Future<void> playRange(
    StoryDocument story, {
    required int startAt,
    required int endBefore,
    double? pace,
  }) async {
    try {
      _error = null;
      if (pace != null) _pace = pace;
      await _loadRange(story, startAt: startAt, endBefore: endBefore);
      await _player.play();
    } catch (_) {
      _error = 'This story audio could not be loaded.';
      _safeNotify();
    }
  }

  Future<void> playAll(StoryDocument story, {int startAt = 0, double? pace}) =>
      playRange(
        story,
        startAt: startAt,
        endBefore: story.blocks.length,
        pace: pace,
      );

  Future<void> toggleBlock(
    StoryDocument story,
    int index, {
    double? pace,
  }) async {
    if (_storyId == story.id && _activeBlockIndex == index) {
      await togglePause();
      return;
    }
    await playRange(story, startAt: index, endBefore: index + 1, pace: pace);
  }

  Future<void> togglePause() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> stop() async {
    if (_disposed) return;
    await _player.stop();
    _activeBlockIndex = null;
    _storyId = null;
    _story = null;
    _safeNotify();
  }

  @override
  void dispose() {
    _disposed = true;
    _indexSubscription?.cancel();
    _stateSubscription?.cancel();
    _player.dispose();
    super.dispose();
  }
}
