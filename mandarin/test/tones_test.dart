import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/utils/tones.dart';

void main() {
  test('detects tones from diacritics on any vowel', () {
    expect(toneOf('mā'), 1);
    expect(toneOf('xué'), 2);
    expect(toneOf('wǒ'), 3);
    expect(toneOf('shì'), 4);
    expect(toneOf('ma'), 5);
    expect(toneOf('nǚ'), 3);
    expect(toneOf('lǜ'), 4);
    expect(toneOf(''), 5);
  });

  test('splits multi-syllable pinyin', () {
    expect(splitSyllables('nǐ hǎo'), ['nǐ ', 'hǎo']);
    expect(splitSyllables("Xuě'ér"), ["Xuě'", 'ér']);
    expect(splitSyllables('mā'), ['mā']);
    expect(splitSyllables(''), isEmpty);
    expect(splitSyllables('nǐ hǎo').join(), 'nǐ hǎo');
  });

  test('colors syllables independently', () {
    final spans = pinyinSpans('nǐ hǎo ma', colored: true, fallback: tone1Color);
    expect(spans, hasLength(3));
    expect(spans[0].style?.color, tone3Color);
    expect(spans[1].style?.color, tone3Color);
    expect(spans[2].style?.color, toneNeutralColor);

    final plain = pinyinSpans('nǐ hǎo', colored: false, fallback: tone1Color);
    expect(plain, hasLength(1));
    expect(plain.single.style?.color, tone1Color);
  });
}
