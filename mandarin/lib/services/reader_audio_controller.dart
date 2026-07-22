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
          : blockIndexForSequenceIndex(index);
      notifyListeners();
    });
    _stateSubscription = _player.playerStateStream.listen(
      (_) => notifyListeners(),
    );
  }

  final AudioPlayer _player = AudioPlayer();
  StreamSubscription<int?>? _indexSubscription;
  StreamSubscription<PlayerState>? _stateSubscription;
  String? _storyId;
  int? _activeBlockIndex;
  String? _error;

  int? get activeBlockIndex => _activeBlockIndex;
  String? get storyId => _storyId;
  String? get error => _error;
  bool get isPlaying => _player.playing;

  Future<void> setSpeed(double speed) => _player.setSpeed(speed);

  static List<String> audioAssetsFor(StoryDocument story) =>
      story.blocks.map(story.audioAsset).toList();

  static int sequenceIndexForBlock(int blockIndex) => blockIndex * 2;

  static int blockIndexForSequenceIndex(int sequenceIndex) =>
      sequenceIndex ~/ 2;

  static List<AudioSource> audioSequenceFor(StoryDocument story) {
    final sequence = <AudioSource>[];
    for (var index = 0; index < story.blocks.length; index++) {
      sequence.add(AudioSource.asset(story.audioAsset(story.blocks[index])));
      if (index < story.blocks.length - 1) {
        // A timeline gap is affected by setSpeed along with speech, so study
        // pace slows both the phrases and the pauses between sentences.
        // SilenceAudioSource is Android-only in just_audio 0.9.x. A real
        // packaged silence clip works on web and mobile, and setSpeed changes
        // its duration together with the spoken sentence.
        sequence.add(AudioSource.asset(sentenceGapAsset));
      }
    }
    return sequence;
  }

  Future<void> playAll(StoryDocument story, {int startAt = 0}) async {
    try {
      _error = null;
      _storyId = story.id;
      final playlist = ConcatenatingAudioSource(
        children: audioSequenceFor(story),
      );
      await _player.setAudioSource(
        playlist,
        initialIndex: sequenceIndexForBlock(startAt),
      );
      await _player.play();
    } catch (_) {
      _error = 'This story audio could not be loaded.';
      notifyListeners();
    }
  }

  Future<void> toggleBlock(StoryDocument story, int index) async {
    if (_storyId == story.id && _activeBlockIndex == index) {
      if (_player.playing) {
        await _player.pause();
      } else {
        await _player.play();
      }
      return;
    }
    await playAll(story, startAt: index);
  }

  Future<void> togglePause() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> stop() async {
    await _player.stop();
    _activeBlockIndex = null;
    _storyId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _indexSubscription?.cancel();
    _stateSubscription?.cancel();
    _player.dispose();
    super.dispose();
  }
}
