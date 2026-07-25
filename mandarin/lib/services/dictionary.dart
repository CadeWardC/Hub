import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// One pronunciation of a headword, with its English senses.
class DictionaryReading {
  const DictionaryReading({
    required this.pinyin,
    required this.senses,
    this.traditional,
  });

  final String pinyin;
  final List<String> senses;

  /// The traditional form, when it differs from the simplified headword.
  final String? traditional;
}

class DictionaryEntry {
  const DictionaryEntry({required this.simplified, required this.readings});

  final String simplified;
  final List<DictionaryReading> readings;

  String get firstPinyin => readings.isEmpty ? '' : readings.first.pinyin;

  /// A one-line gloss for list rows.
  String get summary => readings
      .expand((reading) => reading.senses)
      .take(3)
      .join('; ');
}

/// The bundled CC-CEDICT dictionary.
///
/// The asset is ten megabytes, so it is decoded once on a background isolate
/// and then kept for the life of the process. Entries stay as raw JSON until
/// something actually looks them up — building 120,000 objects up front costs
/// far more than the lookups ever will.
class Dictionary {
  Dictionary._(this._entries, this.attribution);

  static const asset = 'assets/dictionary/cedict.json';

  final Map<String, dynamic> _entries;
  final DictionaryAttribution attribution;

  static Future<Dictionary>? _pending;

  static Future<Dictionary> load() {
    return _pending ??= _load();
  }

  /// Test seam: supplies a dictionary without touching the asset bundle.
  @visibleForTesting
  static Dictionary fromJson(Map<String, dynamic> json) {
    return Dictionary._(
      (json['entries'] as Map<String, dynamic>?) ?? const {},
      DictionaryAttribution.fromJson(json),
    );
  }

  @visibleForTesting
  static void resetForTest() => _pending = null;

  static Future<Dictionary> _load() async {
    try {
      final raw = await rootBundle.loadString(asset);
      final decoded = await compute(_decode, raw);
      return Dictionary.fromJson(decoded);
    } catch (error) {
      // A missing or damaged asset must not take the reader down with it; an
      // empty dictionary simply reports nothing found.
      debugPrint('Dictionary unavailable: $error');
      return Dictionary._(const {}, const DictionaryAttribution.empty());
    }
  }

  static Map<String, dynamic> _decode(String raw) =>
      jsonDecode(raw) as Map<String, dynamic>;

  bool get isEmpty => _entries.isEmpty;

  int get headwordCount => _entries.length;

  DictionaryEntry? lookup(String word) {
    final raw = _entries[word];
    if (raw is! List) return null;
    return _entryFrom(word, raw);
  }

  /// Best-effort lookup for a word the story tokenizer produced: the whole
  /// word first, then its longest prefix, so 睡觉了 still finds 睡觉.
  DictionaryEntry? lookupLongest(String word) {
    for (var end = word.length; end > 0; end--) {
      final entry = lookup(word.substring(0, end));
      if (entry != null) return entry;
    }
    return null;
  }

  /// Search by headword, pinyin, or English meaning.
  ///
  /// Chinese queries match headwords by prefix; anything else matches pinyin
  /// (with or without tone marks) and definitions. Results are capped because
  /// this runs on every keystroke.
  List<DictionaryEntry> search(String query, {int limit = 40}) {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return const [];

    final results = <DictionaryEntry>[?lookup(trimmed)];
    final isChinese = _han.hasMatch(trimmed);
    final needle = _stripTones(trimmed.toLowerCase());

    for (final headword in _entries.keys) {
      if (results.length >= limit) break;
      if (headword == trimmed) continue;
      if (isChinese) {
        if (!headword.startsWith(trimmed)) continue;
        final entry = lookup(headword);
        if (entry != null) results.add(entry);
        continue;
      }
      final entry = lookup(headword);
      if (entry == null) continue;
      final matches = entry.readings.any(
        (reading) =>
            _stripTones(reading.pinyin.toLowerCase()).startsWith(needle) ||
            reading.senses.any(
              (sense) => sense.toLowerCase().contains(needle),
            ),
      );
      if (matches) results.add(entry);
    }
    return results;
  }

  DictionaryEntry _entryFrom(String headword, List<dynamic> raw) {
    return DictionaryEntry(
      simplified: headword,
      readings: [
        for (final reading in raw)
          if (reading is List && reading.isNotEmpty)
            DictionaryReading(
              pinyin: reading[0] as String? ?? '',
              senses: [
                if (reading.length > 1 && reading[1] is List)
                  ...(reading[1] as List).whereType<String>(),
              ],
              traditional: reading.length > 2 ? reading[2] as String? : null,
            ),
      ],
    );
  }

  static final RegExp _han = RegExp(r'[一-鿿]');

  static const _toneless = {
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'u', 'ǘ': 'u', 'ǚ': 'u', 'ǜ': 'u', 'ü': 'u',
  };

  /// Lets "ni hao", "nǐ hǎo", and "nihao" all find 你好.
  static String _stripTones(String value) {
    final buffer = StringBuffer();
    for (final rune in value.runes) {
      final character = String.fromCharCode(rune);
      if (character == ' ') continue;
      buffer.write(_toneless[character] ?? character);
    }
    return buffer.toString();
  }
}

class DictionaryAttribution {
  const DictionaryAttribution({
    required this.source,
    required this.publisher,
    required this.license,
    required this.licenseUrl,
    required this.url,
    required this.version,
  });

  const DictionaryAttribution.empty()
    : source = '',
      publisher = '',
      license = '',
      licenseUrl = '',
      url = '',
      version = '';

  final String source;
  final String publisher;
  final String license;
  final String licenseUrl;
  final String url;
  final String version;

  factory DictionaryAttribution.fromJson(Map<String, dynamic> json) {
    return DictionaryAttribution(
      source: json['source'] as String? ?? '',
      publisher: json['publisher'] as String? ?? '',
      license: json['license'] as String? ?? '',
      licenseUrl: json['licenseUrl'] as String? ?? '',
      url: json['url'] as String? ?? '',
      version: json['version'] as String? ?? '',
    );
  }

  /// CC BY-SA requires the source and licence to be credited wherever the
  /// definitions are shown.
  String get line => source.isEmpty
      ? ''
      : '$source · published by $publisher · $license';
}
