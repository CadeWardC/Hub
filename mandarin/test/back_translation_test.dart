import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/back_translation.dart';
import 'package:mandarin_reader/services/dictionary.dart';
import 'package:mandarin_reader/services/sentence_translator_stub.dart';

Dictionary buildDictionary() {
  return Dictionary.fromJson({
    'source': 'CC-CEDICT',
    'entries': {
      '我': [
        ['wǒ', ['I', 'me']],
      ],
      '想': [
        ['xiǎng', ['to want', 'to think']],
      ],
      '吃': [
        ['chī', ['to eat']],
      ],
      '吃饭': [
        ['chī fàn', ['to eat a meal']],
      ],
      '饭': [
        ['fàn', ['cooked rice', 'meal']],
      ],
      '你好': [
        ['nǐ hǎo', ['hello']],
      ],
    },
  });
}

class FakeSentenceTranslator implements SentenceTranslator {
  FakeSentenceTranslator(this.result, {this.supported = true});

  final String? result;
  final bool supported;
  int calls = 0;
  bool disposed = false;

  @override
  bool get isSupported => supported;

  @override
  String get name => 'Fake translator';

  @override
  Future<String?> translate(String chinese) async {
    calls++;
    return result;
  }

  @override
  Future<void> dispose() async => disposed = true;
}

void main() {
  group('segmentation', () {
    test('prefers the longest word the dictionary knows', () {
      final words = BackTranslator.segment('我想吃饭', buildDictionary());

      expect(words.map((word) => word.text), ['我', '想', '吃饭']);
      expect(words.last.pinyin, 'chī fàn');
      expect(words.last.english, contains('to eat a meal'));
    });

    test('skips punctuation the recogniser inserted', () {
      final words = BackTranslator.segment('你好，我想吃饭。', buildDictionary());

      expect(words.map((word) => word.text), ['你好', '我', '想', '吃饭']);
    });

    test('keeps unknown characters and flags them', () {
      final words = BackTranslator.segment('我鼃', buildDictionary());

      expect(words.map((word) => word.text), ['我', '鼃']);
      expect(words.last.known, isFalse);
    });
  });

  group('back translation', () {
    test('glosses the words and adds a sentence when one is available', () async {
      final sentences = FakeSentenceTranslator('I want to eat.');
      final translator = BackTranslator(
        dictionary: buildDictionary(),
        sentences: sentences,
      );

      final result = await translator.translate('我想吃饭');

      expect(result.words, hasLength(3));
      expect(result.sentence, 'I want to eat.');
      expect(result.sentenceSource, 'Fake translator');
      expect(sentences.calls, 1);
    });

    test('still glosses when the platform cannot translate sentences', () async {
      final translator = BackTranslator(
        dictionary: buildDictionary(),
        sentences: FakeSentenceTranslator(null, supported: false),
      );

      final result = await translator.translate('我想吃饭');

      expect(result.sentence, isNull);
      expect(result.sentenceSource, isNull);
      expect(result.words.map((word) => word.english).join(' '), contains('want'));
      expect(translator.translatesSentences, isFalse);
    });

    test('reports pinyin one syllable at a time for tone scoring', () async {
      final translator = BackTranslator(
        dictionary: buildDictionary(),
        sentences: FakeSentenceTranslator(null, supported: false),
      );

      final result = await translator.translate('我想吃饭');

      // 吃饭 is one word but two syllables, and tones are scored per syllable.
      expect(result.pinyinSyllables, ['wǒ', 'xiǎng', 'chī', 'fàn']);
    });

    test('the stub translator is what non-mobile platforms get', () async {
      const stub = UnsupportedSentenceTranslator();

      expect(stub.isSupported, isFalse);
      expect(await stub.translate('我想吃饭'), isNull);
    });
  });
}
