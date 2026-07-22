import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../models/story.dart';

class ReaderAudioController extends ChangeNotifier {
  ReaderAudioController() {
    _indexSubscription = _player.currentIndexStream.listen((index) {
      _activeBlockIndex = index;
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

  Future<void> playAll(StoryDocument story, {int startAt = 0}) async {
    try {
      _error = null;
      _storyId = story.id;
      final playlist = ConcatenatingAudioSource(
        children: audioAssetsFor(story).map(AudioSource.asset).toList(),
      );
      await _player.setAudioSource(playlist, initialIndex: startAt);
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
