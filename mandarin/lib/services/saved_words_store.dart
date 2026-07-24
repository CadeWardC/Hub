import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// A word the learner bookmarked, plus its Leitner review state.
class SavedWord {
  const SavedWord({
    required this.text,
    required this.pinyin,
    required this.english,
    required this.storyId,
    required this.addedAt,
    this.box = 0,
    required this.dueAt,
  });

  final String text;
  final String pinyin;
  final String english;
  final String storyId;
  final DateTime addedAt;

  /// Leitner box 0-4; higher boxes review less often.
  final int box;
  final DateTime dueAt;

  SavedWord copyWith({int? box, DateTime? dueAt}) {
    return SavedWord(
      text: text,
      pinyin: pinyin,
      english: english,
      storyId: storyId,
      addedAt: addedAt,
      box: box ?? this.box,
      dueAt: dueAt ?? this.dueAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'text': text,
        'pinyin': pinyin,
        'english': english,
        'storyId': storyId,
        'addedAt': addedAt.toIso8601String(),
        'box': box,
        'dueAt': dueAt.toIso8601String(),
      };

  factory SavedWord.fromJson(Map<String, dynamic> json) {
    return SavedWord(
      text: json['text'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      english: json['english'] as String? ?? '',
      storyId: json['storyId'] as String? ?? '',
      addedAt:
          DateTime.tryParse(json['addedAt'] as String? ?? '') ?? DateTime.now(),
      box: json['box'] as int? ?? 0,
      dueAt: DateTime.tryParse(json['dueAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Bookmarked words persisted in SharedPreferences, keyed by the hanzi text.
class SavedWordsStore {
  static const _key = 'mandarin.savedWords.v1';

  /// Days until the next review per Leitner box.
  static const boxIntervals = [0, 1, 2, 4, 8];

  static Future<List<SavedWord>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(SavedWord.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _save(List<SavedWord> words) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _key,
      jsonEncode([for (final word in words) word.toJson()]),
    );
  }

  /// Adds the word if absent, removes it if present. Returns true if the
  /// word is saved after the call.
  static Future<bool> toggle({
    required String text,
    required String pinyin,
    required String english,
    required String storyId,
  }) async {
    final words = await load();
    final existing = words.indexWhere((word) => word.text == text);
    if (existing >= 0) {
      words.removeAt(existing);
      await _save(words);
      return false;
    }
    final now = DateTime.now();
    words.add(
      SavedWord(
        text: text,
        pinyin: pinyin,
        english: english,
        storyId: storyId,
        addedAt: now,
        dueAt: now,
      ),
    );
    await _save(words);
    return true;
  }

  static Future<void> remove(String text) async {
    final words = await load();
    words.removeWhere((word) => word.text == text);
    await _save(words);
  }

  static Future<Set<String>> savedTexts() async {
    return {for (final word in await load()) word.text};
  }

  static List<SavedWord> dueWords(List<SavedWord> words, {DateTime? now}) {
    final moment = now ?? DateTime.now();
    return [
      for (final word in words)
        if (!word.dueAt.isAfter(moment)) word,
    ]..sort((a, b) => a.dueAt.compareTo(b.dueAt));
  }

  /// Applies a review result: correct answers move the word up a box,
  /// wrong answers send it back to box 0 and make it due immediately.
  static Future<SavedWord> review(
    SavedWord word, {
    required bool correct,
    DateTime? now,
  }) async {
    final moment = now ?? DateTime.now();
    final box = correct ? (word.box + 1).clamp(0, boxIntervals.length - 1) : 0;
    final updated = word.copyWith(
      box: box,
      dueAt: moment.add(Duration(days: boxIntervals[box])),
    );
    final words = await load();
    final index = words.indexWhere((entry) => entry.text == word.text);
    if (index >= 0) {
      words[index] = updated;
      await _save(words);
    }
    return updated;
  }
}
