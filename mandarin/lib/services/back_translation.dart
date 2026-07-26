import 'dictionary.dart';
import 'sentence_translator_stub.dart'
    if (dart.library.io) 'sentence_translator_mlkit.dart'
    if (dart.library.js_interop) 'sentence_translator_web.dart';

/// One recognised word and what it means.
class GlossedWord {
  const GlossedWord({
    required this.text,
    required this.pinyin,
    required this.english,
  });

  final String text;
  final String pinyin;
  final String english;

  bool get known => english.isNotEmpty;
}

/// What the app makes of what you said.
class BackTranslation {
  const BackTranslation({
    required this.chinese,
    required this.words,
    required this.sentence,
    required this.sentenceSource,
  });

  final String chinese;

  /// Word-by-word meanings, always present.
  final List<GlossedWord> words;

  /// A whole-sentence English translation, when a translator is available on
  /// this platform.
  final String? sentence;

  /// Where [sentence] came from, for the credit line under it.
  final String? sentenceSource;

  /// The pinyin of the whole utterance, syllable by syllable.
  List<String> get pinyinSyllables => [
    for (final word in words)
      if (word.pinyin.trim().isNotEmpty) ...word.pinyin.trim().split(' '),
  ];
}

/// Turns recognised Chinese back into English so you can check that what you
/// said means what you meant.
///
/// The word-by-word gloss comes from the bundled CC-CEDICT and works
/// everywhere, offline. A fluent sentence translation is added on platforms
/// that have an on-device translator — Android and iOS through ML Kit. On the
/// web there is no such engine (Chrome's is desktop-only and needs tens of
/// gigabytes free), so the gloss stands alone there.
class BackTranslator {
  BackTranslator({Dictionary? dictionary, SentenceTranslator? sentences})
    : _dictionary = dictionary,
      _sentences = sentences ?? createSentenceTranslator();

  Dictionary? _dictionary;
  final SentenceTranslator _sentences;

  bool get translatesSentences => _sentences.isSupported;

  Future<BackTranslation> translate(String chinese) async {
    final dictionary = _dictionary ??= await Dictionary.load();
    final words = segment(chinese, dictionary);
    final sentence = await _sentences.translate(chinese);
    return BackTranslation(
      chinese: chinese,
      words: words,
      sentence: sentence,
      sentenceSource: sentence == null ? null : _sentences.name,
    );
  }

  Future<void> dispose() => _sentences.dispose();

  /// Longest-match segmentation against the dictionary, the same approach the
  /// story tokenizer uses. Recognised speech has no spaces, so 我想吃饭 has to
  /// be cut into 我 / 想 / 吃饭 before anything can be looked up.
  static List<GlossedWord> segment(String chinese, Dictionary dictionary) {
    const longestWord = 6;
    final words = <GlossedWord>[];
    var offset = 0;
    while (offset < chinese.length) {
      final character = chinese[offset];
      if (character.trim().isEmpty || _punctuation.hasMatch(character)) {
        offset++;
        continue;
      }
      DictionaryEntry? match;
      var length = 0;
      for (
        var end = (offset + longestWord).clamp(0, chinese.length);
        end > offset;
        end--
      ) {
        final candidate = chinese.substring(offset, end);
        final entry = dictionary.lookup(candidate);
        if (entry != null) {
          match = entry;
          length = end - offset;
          break;
        }
      }
      if (match == null) {
        words.add(
          GlossedWord(text: character, pinyin: '', english: ''),
        );
        offset++;
        continue;
      }
      words.add(
        GlossedWord(
          text: chinese.substring(offset, offset + length),
          pinyin: match.firstPinyin,
          english: match.summary,
        ),
      );
      offset += length;
    }
    return words;
  }

  static final RegExp _punctuation = RegExp(
    r'[\s，。！？；：“”‘’、,.!?;:—…（）()]',
  );
}
