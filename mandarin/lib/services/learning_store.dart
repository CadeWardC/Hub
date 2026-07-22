import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/story.dart';

enum PinyinMode { all, difficult, hidden }

class StoryProgress {
  const StoryProgress({required this.blockIndex, required this.completed});
  final int blockIndex;
  final bool completed;

  Map<String, dynamic> toJson() => {
    'blockIndex': blockIndex,
    'completed': completed,
  };

  factory StoryProgress.fromJson(Map<String, dynamic> json) => StoryProgress(
    blockIndex: (json['blockIndex'] as num?)?.toInt() ?? 0,
    completed: json['completed'] as bool? ?? false,
  );
}

class LearningState {
  const LearningState({
    required this.pinyinMode,
    required this.showTranslations,
    required this.playbackSpeed,
    required this.selectedLevel,
    required this.progress,
    required this.savedWords,
  });

  factory LearningState.defaults() => const LearningState(
    pinyinMode: PinyinMode.all,
    showTranslations: true,
    playbackSpeed: 1,
    selectedLevel: null,
    progress: {},
    savedWords: [],
  );

  final PinyinMode pinyinMode;
  final bool showTranslations;
  final double playbackSpeed;
  final String? selectedLevel;
  final Map<String, StoryProgress> progress;
  final List<SavedWord> savedWords;

  LearningState copyWith({
    PinyinMode? pinyinMode,
    bool? showTranslations,
    double? playbackSpeed,
    String? selectedLevel,
    bool clearSelectedLevel = false,
    Map<String, StoryProgress>? progress,
    List<SavedWord>? savedWords,
  }) => LearningState(
    pinyinMode: pinyinMode ?? this.pinyinMode,
    showTranslations: showTranslations ?? this.showTranslations,
    playbackSpeed: playbackSpeed ?? this.playbackSpeed,
    selectedLevel: clearSelectedLevel
        ? null
        : selectedLevel ?? this.selectedLevel,
    progress: progress ?? this.progress,
    savedWords: savedWords ?? this.savedWords,
  );

  Map<String, dynamic> toJson() => {
    'pinyinMode': pinyinMode.name,
    'showTranslations': showTranslations,
    'playbackSpeed': playbackSpeed,
    'selectedLevel': selectedLevel,
    'progress': progress.map((key, value) => MapEntry(key, value.toJson())),
    'savedWords': savedWords.map((word) => word.toJson()).toList(),
  };

  factory LearningState.fromJson(Map<String, dynamic> json) {
    final modeName = json['pinyinMode'] as String? ?? 'all';
    return LearningState(
      pinyinMode: PinyinMode.values.firstWhere(
        (mode) => mode.name == modeName,
        orElse: () => PinyinMode.all,
      ),
      showTranslations: json['showTranslations'] as bool? ?? false,
      playbackSpeed: (json['playbackSpeed'] as num?)?.toDouble() ?? 1,
      selectedLevel: json['selectedLevel'] as String?,
      progress: (json['progress'] as Map<String, dynamic>? ?? {}).map(
        (key, value) => MapEntry(
          key,
          StoryProgress.fromJson(value as Map<String, dynamic>),
        ),
      ),
      savedWords: (json['savedWords'] as List<dynamic>? ?? [])
          .map((item) => SavedWord.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class LearningController extends StateNotifier<LearningState> {
  LearningController(this._preferences) : super(_read(_preferences));
  static const storageKey = 'mandarinReader.v1';
  final SharedPreferences _preferences;

  static LearningState _read(SharedPreferences preferences) {
    try {
      final source = preferences.getString(storageKey);
      if (source == null) return LearningState.defaults();
      return LearningState.fromJson(jsonDecode(source) as Map<String, dynamic>);
    } catch (_) {
      return LearningState.defaults();
    }
  }

  void _commit(LearningState next) {
    state = next;
    _preferences.setString(storageKey, jsonEncode(next.toJson()));
  }

  void setPinyinMode(PinyinMode mode) =>
      _commit(state.copyWith(pinyinMode: mode));
  void setTranslations(bool value) =>
      _commit(state.copyWith(showTranslations: value));
  void setPlaybackSpeed(double value) =>
      _commit(state.copyWith(playbackSpeed: value));
  void setSelectedLevel(String? level) => _commit(
    state.copyWith(selectedLevel: level, clearSelectedLevel: level == null),
  );

  void setProgress(String storyId, int blockIndex, {bool completed = false}) {
    final current = state.progress[storyId];
    final nextIndex = current == null || blockIndex > current.blockIndex
        ? blockIndex
        : current.blockIndex;
    final next = Map<String, StoryProgress>.from(state.progress)
      ..[storyId] = StoryProgress(
        blockIndex: nextIndex,
        completed: completed || (current?.completed ?? false),
      );
    _commit(state.copyWith(progress: next));
  }

  void toggleSavedWord(SavedWord word) {
    final next = List<SavedWord>.from(state.savedWords);
    final index = next.indexWhere((saved) => saved.key == word.key);
    if (index >= 0) {
      next.removeAt(index);
    } else {
      next.insert(0, word);
    }
    _commit(state.copyWith(savedWords: next));
  }

  void clearProgress() =>
      _commit(state.copyWith(progress: const {}, savedWords: const []));
}
