import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'sentence_translator_stub.dart';

export 'sentence_translator_stub.dart' show SentenceTranslator;

/// Chinese to English through the browser's own translator.
///
/// Chrome and Edge ship an on-device Translator API (`self.Translator`). It
/// keeps the text on the machine and works offline once the language pack is
/// downloaded, but it is desktop-only and needs a lot of free disk, so every
/// step here is guarded and any failure falls back to the word-by-word gloss.
///
/// https://developer.chrome.com/docs/ai/translator-api
class BrowserSentenceTranslator implements SentenceTranslator {
  BrowserSentenceTranslator();

  /// Traditional Chinese, because that is the script the reader recognises and
  /// displays. Chrome treats `zh` and `zh-Hant` as separate languages with
  /// separate packs, so asking for `zh` would send Traditional text to the
  /// Simplified model. `availability` is checked before use, so a browser that
  /// does not offer this pair falls back to the word-by-word gloss.
  static const _source = 'zh-Hant';
  static const _target = 'en';

  JSObject? _translator;
  bool _unavailable = false;

  @override
  bool get isSupported => globalContext.has('Translator');

  @override
  String get name => 'Your browser, on device';

  @override
  Future<String?> translate(String chinese) async {
    if (!isSupported || _unavailable || chinese.trim().isEmpty) return null;
    try {
      final translator = await _instance();
      if (translator == null) return null;
      final result = await translator
          .callMethod<JSPromise<JSString>>('translate'.toJS, chinese.toJS)
          .toDart;
      final english = result.toDart.trim();
      return english.isEmpty ? null : english;
    } catch (_) {
      // No language pack, not enough disk, or the call arrived outside the
      // user-activation window the API requires. The gloss still stands.
      return null;
    }
  }

  Future<JSObject?> _instance() async {
    final existing = _translator;
    if (existing != null) return existing;

    final api = globalContext.getProperty<JSObject>('Translator'.toJS);
    final options = JSObject()
      ..setProperty('sourceLanguage'.toJS, _source.toJS)
      ..setProperty('targetLanguage'.toJS, _target.toJS);

    final availability = (await api
            .callMethod<JSPromise<JSString>>('availability'.toJS, options)
            .toDart)
        .toDart;
    // 'available' is ready to go and 'downloadable' fetches on create; both
    // 'unavailable' and any unknown answer mean this pair is not offered.
    if (availability != 'available' && availability != 'downloadable') {
      _unavailable = true;
      return null;
    }

    final translator = await api
        .callMethod<JSPromise<JSObject>>('create'.toJS, options)
        .toDart;
    return _translator = translator;
  }

  @override
  Future<void> dispose() async {
    final translator = _translator;
    _translator = null;
    if (translator == null) return;
    try {
      if (translator.has('destroy')) {
        translator.callMethod<JSAny?>('destroy'.toJS);
      }
    } catch (_) {}
  }
}

SentenceTranslator createSentenceTranslator() {
  if (globalContext.has('Translator')) return BrowserSentenceTranslator();
  return const UnsupportedSentenceTranslator();
}
