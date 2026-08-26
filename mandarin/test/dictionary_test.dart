import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/dictionary.dart';

/// Keyed by traditional headword, with the simplified form in the third slot
/// and a `simplifiedIndex` mapping back, exactly as build_dictionary.py emits.
Dictionary buildDictionary() {
  return Dictionary.fromJson({
    'source': 'CC-CEDICT',
    'publisher': 'MDBG',
    'license': 'CC BY-SA 4.0',
    'entries': {
      '你好': [
        ['nǐ hǎo', ['hello; hi']],
      ],
      '睡覺': [
        ['shuì jiào', ['to go to bed', 'to sleep'], '睡觉'],
      ],
      '睡': [
        ['shuì', ['to sleep']],
      ],
      '蘋果': [
        ['Píng guǒ', ['Apple (American tech company)'], '苹果'],
        ['píng guǒ', ['apple', 'classifier: 個 (gè)'], '苹果'],
      ],
      '貓': [
        ['māo', ['cat'], '猫'],
      ],
      // 发 stands for both of these, which is why the index holds a list.
      '發': [
        ['fā', ['to send out'], '发'],
      ],
      '髮': [
        ['fà', ['hair', 'Taiwan pr. fǎ'], '发'],
      ],
    },
    'simplifiedIndex': {
      '睡觉': ['睡覺'],
      '苹果': ['蘋果'],
      '猫': ['貓'],
      '发': ['發', '髮'],
    },
  });
}

void main() {
  test('looks a word up by its traditional form', () {
    final entry = buildDictionary().lookup('睡覺')!;

    expect(entry.traditional, '睡覺');
    expect(entry.readings.single.pinyin, 'shuì jiào');
    expect(entry.readings.single.senses, ['to go to bed', 'to sleep']);
    expect(entry.readings.single.simplified, '睡觉');
    expect(entry.simplified, '睡觉');
  });

  test('a simplified word resolves through the alias index', () {
    final entry = buildDictionary().lookup('睡觉')!;

    // The entry that comes back is the traditional one, so the reader shows
    // the script it teaches even when the query arrived in Simplified.
    expect(entry.traditional, '睡覺');
    expect(entry.firstPinyin, 'shuì jiào');
  });

  test('a word with no simplified form reports none', () {
    expect(buildDictionary().lookup('你好')!.simplified, isNull);
  });

  test('an ambiguous simplified form takes the first candidate', () {
    expect(buildDictionary().lookup('发')!.traditional, '發');
  });

  test('lookupAll returns every traditional form a simplified word can be', () {
    final entries = buildDictionary().lookupAll('发');

    expect(entries.map((entry) => entry.traditional), ['發', '髮']);
  });

  test('keeps every reading of a word', () {
    final entry = buildDictionary().lookup('蘋果')!;

    expect(entry.readings, hasLength(2));
    expect(entry.firstPinyin, 'Píng guǒ');
    expect(entry.summary, contains('apple'));
  });

  test('an unknown word returns null rather than throwing', () {
    expect(buildDictionary().lookup('鼃鼄'), isNull);
  });

  test('falls back to the longest known prefix', () {
    // The story tokenizer can hand over 睡覺了; the dictionary has 睡覺.
    expect(buildDictionary().lookupLongest('睡覺了')!.traditional, '睡覺');
    expect(buildDictionary().lookupLongest('睡吧')!.traditional, '睡');
    expect(buildDictionary().lookupLongest('鼃鼄'), isNull);
  });

  test('searching Chinese matches headword prefixes', () {
    final results = buildDictionary().search('睡');

    expect(results.map((entry) => entry.traditional), ['睡', '睡覺']);
  });

  test('searching a simplified prefix finds traditional entries', () {
    final results = buildDictionary().search('睡觉');

    expect(results.map((entry) => entry.traditional), contains('睡覺'));
  });

  test('searching pinyin ignores tones and spacing', () {
    final dictionary = buildDictionary();

    for (final query in ['ni hao', 'nǐ hǎo', 'nihao', 'NI']) {
      expect(
        dictionary.search(query).map((entry) => entry.traditional),
        contains('你好'),
        reason: 'query "$query" should find 你好',
      );
    }
  });

  test('searching English matches definitions', () {
    final results = buildDictionary().search('sleep');

    expect(
      results.map((entry) => entry.traditional),
      containsAll(['睡覺', '睡']),
    );
  });

  test('search respects its limit', () {
    expect(buildDictionary().search('to', limit: 1), hasLength(1));
  });

  test('an exact match is listed first', () {
    final results = buildDictionary().search('睡覺');

    expect(results.first.traditional, '睡覺');
  });

  test('search never repeats an entry', () {
    // 睡觉 matches by alias and again through the index sweep.
    final results = buildDictionary().search('睡觉');
    final traditionals = results.map((entry) => entry.traditional).toList();

    expect(traditionals.toSet(), hasLength(traditionals.length));
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
