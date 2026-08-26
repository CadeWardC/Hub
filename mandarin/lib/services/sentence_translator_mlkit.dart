import 'dart:io';

import 'package:google_mlkit_translation/google_mlkit_translation.dart';

import 'sentence_translator_stub.dart';

export 'sentence_translator_stub.dart' show SentenceTranslator;

/// On-device Chinese to English translation through Google's ML Kit.
///
/// ML Kit exists only on Android and iOS, so desktop falls back to the gloss.
/// The language model is roughly thirty megabytes and is fetched once, on the
/// first translation; after that this works with no network at all.
///
/// ML Kit ships exactly one Chinese model (`zh`) with no Traditional variant, so
/// Traditional input goes through a Simplified-oriented model. In practice it
/// copes, and the word-by-word gloss — which is keyed by Traditional headword
/// and always present — is what the Speak tab actually relies on. If sentence
/// quality ever proves a problem, the fix is to convert to Simplified before
/// calling, not to change the script the reader teaches.
class MlKitSentenceTranslator implements SentenceTranslator {
  MlKitSentenceTranslator();

  final _modelManager = OnDeviceTranslatorModelManager();
  OnDeviceTranslator? _translator;
  bool _modelReady = false;

  @override
  bool get isSupported => Platform.isAndroid || Platform.isIOS;

  @override
  String get name => 'Google ML Kit, on device';

  @override
  Future<String?> translate(String chinese) async {
    if (!isSupported || chinese.trim().isEmpty) return null;
    try {
      await _ensureModel();
      final translator = _translator ??= OnDeviceTranslator(
        sourceLanguage: TranslateLanguage.chinese,
        targetLanguage: TranslateLanguage.english,
      );
      final english = await translator.translateText(chinese);
      return english.trim().isEmpty ? null : english;
    } catch (_) {
      // No model and no network on the first run, or ML Kit missing on this
      // device: the caller still has the word-by-word gloss.
      return null;
    }
  }

  Future<void> _ensureModel() async {
    if (_modelReady) return;
    for (final language in [
      TranslateLanguage.chinese.bcpCode,
      TranslateLanguage.english.bcpCode,
    ]) {
      final downloaded = await _modelManager.isModelDownloaded(language);
      if (!downloaded) {
        await _modelManager.downloadModel(language);
      }
    }
    _modelReady = true;
  }

  @override
  Future<void> dispose() async {
    await _translator?.close();
    _translator = null;
  }
}

SentenceTranslator createSentenceTranslator() {
  if (Platform.isAndroid || Platform.isIOS) return MlKitSentenceTranslator();
  return const UnsupportedSentenceTranslator();
}
