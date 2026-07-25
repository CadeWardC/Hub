import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/dictionary.dart';

Dictionary buildDictionary() {
  return Dictionary.fromJson({
    'source': 'CC-CEDICT',
    'publisher': 'MDBG',
    'license': 'CC BY-SA 4.0',
    'entries': {
      '你好': [
        ['nǐ hǎo', ['hello; hi'], '你好'],
      ],
      '睡觉': [
        ['shuì jiào', ['to go to bed', 'to sleep'], '睡覺'],
      ],
      '睡': [
        ['shuì', ['to sleep'], '睡'],
      ],
      '苹果': [
        ['Píng guǒ', ['Apple (American tech company)'], '蘋果'],
        ['píng guǒ', ['apple', 'classifier: 个 (gè)'], '蘋果'],
      ],
      '猫': [
        ['māo', ['cat'], '貓'],
      ],
    },
  });
}

void main() {
  test('looks a word up by its simplified form', () {
    final entry = buildDictionary().lookup('睡觉')!;

    expect(entry.simplified, '睡觉');
    expect(entry.readings.single.pinyin, 'shuì jiào');
    expect(entry.readings.single.senses, ['to go to bed', 'to sleep']);
    expect(entry.readings.single.traditional, '睡覺');
  });

  test('keeps every reading of a word', () {
    final entry = buildDictionary().lookup('苹果')!;

    expect(entry.readings, hasLength(2));
    expect(entry.firstPinyin, 'Píng guǒ');
    expect(entry.summary, contains('apple'));
  });

  test('an unknown word returns null rather than throwing', () {
    expect(buildDictionary().lookup('鼃鼄'), isNull);
  });

  test('falls back to the longest known prefix', () {
    // The story tokenizer can hand over 睡觉了; the dictionary has 睡觉.
    expect(buildDictionary().lookupLongest('睡觉了')!.simplified, '睡觉');
    expect(buildDictionary().lookupLongest('睡吧')!.simplified, '睡');
    expect(buildDictionary().lookupLongest('鼃鼄'), isNull);
  });

  test('searching Chinese matches headword prefixes', () {
    final results = buildDictionary().search('睡');

    expect(results.map((entry) => entry.simplified), ['睡', '睡觉']);
  });

  test('searching pinyin ignores tones and spacing', () {
    final dictionary = buildDictionary();

    for (final query in ['ni hao', 'nǐ hǎo', 'nihao', 'NI']) {
      expect(
        dictionary.search(query).map((entry) => entry.simplified),
        contains('你好'),
        reason: 'query "$query" should find 你好',
      );
    }
  });

  test('searching English matches definitions', () {
    final results = buildDictionary().search('sleep');

    expect(results.map((entry) => entry.simplified), containsAll(['睡觉', '睡']));
  });

  test('search respects its limit', () {
    expect(buildDictionary().search('to', limit: 1), hasLength(1));
  });

  test('an exact match is listed first', () {
    final results = buildDictionary().search('睡觉');

    expect(results.first.simplified, '睡觉');
  });

  test('an empty query returns nothing', () {
    expect(buildDictionary().search('   '), isEmpty);
  });

  test('attribution carries the CC BY-SA credit', () {
    final line = buildDictionary().attribution.line;

    expect(line, contains('CC-CEDICT'));
    expect(line, contains('MDBG'));
    expect(line, contains('CC BY-SA 4.0'));
  });
}
