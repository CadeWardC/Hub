import 'package:flutter/material.dart';

/// Mandarin tone helpers: split pinyin into syllables, detect each
/// syllable's tone from its diacritic, and map tones to display colors.

const Color tone1Color = Color(0xFFC0392B); // flat — red
const Color tone2Color = Color(0xFF27824C); // rising — green
const Color tone3Color = Color(0xFF2C63A8); // dipping — blue
const Color tone4Color = Color(0xFF7D3C98); // falling — purple
const Color toneNeutralColor = Color(0xFF7D827E); // neutral — gray

const Map<String, int> _diacriticTones = {
  'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
  'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
  'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
  'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4,
};

/// Returns 1-4 for a marked syllable, 5 for neutral/unmarked.
int toneOf(String syllable) {
  for (final rune in syllable.runes) {
    final tone = _diacriticTones[String.fromCharCode(rune)];
    if (tone != null) return tone;
  }
  return 5;
}

Color toneColor(int tone) {
  switch (tone) {
    case 1:
      return tone1Color;
    case 2:
      return tone2Color;
    case 3:
      return tone3Color;
    case 4:
      return tone4Color;
    default:
      return toneNeutralColor;
  }
}

/// Splits a word's pinyin into syllables on spaces and apostrophes, keeping
/// the separators attached to the preceding syllable so the joined result
/// reads the same as the input.
List<String> splitSyllables(String pinyin) {
  if (pinyin.trim().isEmpty) return const [];
  final syllables = <String>[];
  final buffer = StringBuffer();
  for (final rune in pinyin.runes) {
    final char = String.fromCharCode(rune);
    buffer.write(char);
    if (char == ' ' || char == "'" || char == '’') {
      syllables.add(buffer.toString());
      buffer.clear();
    }
  }
  if (buffer.isNotEmpty) syllables.add(buffer.toString());
  return syllables;
}

/// Builds inline spans for [pinyin] with one color per syllable when
/// [colored] is true, otherwise a single span in [fallback].
List<TextSpan> pinyinSpans(
  String pinyin, {
  required bool colored,
  required Color fallback,
}) {
  if (!colored) return [TextSpan(text: pinyin, style: TextStyle(color: fallback))];
  return [
    for (final syllable in splitSyllables(pinyin))
      TextSpan(
        text: syllable,
        style: TextStyle(color: toneColor(toneOf(syllable))),
      ),
  ];
}
