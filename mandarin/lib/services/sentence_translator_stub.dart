/// A whole-sentence Chinese to English translator, where the platform has one.
abstract class SentenceTranslator {
  bool get isSupported;

  /// Human-readable name for the credit line under a translation.
  String get name;

  /// Returns null when this platform cannot translate sentences.
  Future<String?> translate(String chinese);

  Future<void> dispose();
}

/// The web (and anything else without an on-device engine) gets the
/// dictionary gloss only. Chrome does ship a built-in Translator API, but it
/// is desktop-only and needs tens of gigabytes of free disk, so it is not
/// something to depend on here.
class UnsupportedSentenceTranslator implements SentenceTranslator {
  const UnsupportedSentenceTranslator();

  @override
  bool get isSupported => false;

  @override
  String get name => '';

  @override
  Future<String?> translate(String chinese) async => null;

  @override
  Future<void> dispose() async {}
}

SentenceTranslator createSentenceTranslator() =>
    const UnsupportedSentenceTranslator();
