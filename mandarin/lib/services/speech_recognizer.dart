import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Speaks-to-characters, using whatever recogniser the device provides.
///
/// The platform recognisers are built for short phrases, not dictation, so
/// this is shaped the same way: hold to talk, release to get a result.
class SpeechRecognizer {
  SpeechRecognizer({SpeechToText? speech}) : _speech = speech ?? SpeechToText();

  final SpeechToText _speech;

  /// Mandarin locale ids, best first. Devices differ in what they call it.
  ///
  /// Taiwan comes first deliberately. A mainland recogniser transcribes into
  /// Simplified characters, which then have to be mapped back before they match
  /// a Traditional story — and it scores Taiwan pronunciation against mainland
  /// expectations. `zh` is kept as a last resort because some devices offer
  /// nothing more specific.
  static const _preferredLocales = [
    'zh_TW',
    'zh-TW',
    'cmn_TW',
    'cmn-Hant-TW',
    'zh_Hant_TW',
    'zh_Hant',
    'zh_HK',
    'zh',
  ];

  bool _available = false;
  String? _localeId;
  String? _unavailableReason;

  bool get isAvailable => _available;
  bool get isListening => _speech.isListening;

  /// Why recognition cannot be used, ready to show to the reader.
  String? get unavailableReason => _unavailableReason;

  /// The Mandarin locale actually in use, e.g. `zh_CN`.
  String? get localeId => _localeId;

  Future<bool> initialize() async {
    if (_available) return true;
    try {
      _available = await _speech.initialize(
        onError: (error) => _unavailableReason = error.errorMsg,
        finalTimeout: const Duration(milliseconds: 800),
      );
    } catch (error) {
      _available = false;
      _unavailableReason = '$error';
      return false;
    }
    if (!_available) {
      _unavailableReason ??=
          'This device did not allow speech recognition. Check the microphone '
          'and speech permissions.';
      return false;
    }

    final locales = await _speech.locales();
    for (final preferred in _preferredLocales) {
      final match = locales.where(
        (locale) =>
            locale.localeId.toLowerCase().replaceAll('-', '_') ==
            preferred.toLowerCase().replaceAll('-', '_'),
      );
      if (match.isNotEmpty) {
        _localeId = match.first.localeId;
        break;
      }
    }
    _localeId ??= locales
        .where((locale) => locale.localeId.toLowerCase().startsWith('zh'))
        .map((locale) => locale.localeId)
        .firstOrNull;
    if (_localeId == null) {
      _available = false;
      _unavailableReason =
          'No Mandarin speech recognition is installed on this device. On '
          'Android, add Chinese (Taiwan) in the Google app\'s voice settings.';
    }
    return _available;
  }

  /// Starts listening. [onResult] fires as words firm up, with `isFinal` set
  /// on the last one.
  Future<void> listen({
    required void Function(String text, bool isFinal) onResult,
    Duration listenFor = const Duration(seconds: 20),
  }) async {
    if (!_available) return;
    await _speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: _localeId,
        listenFor: listenFor,
        partialResults: true,
        // Dictation-style: keep listening through short pauses rather than
        // stopping at the first gap between words.
        listenMode: ListenMode.dictation,
        cancelOnError: true,
      ),
      onResult: (SpeechRecognitionResult result) =>
          onResult(result.recognizedWords, result.finalResult),
    );
  }

  Future<void> stop() => _speech.stop();

  Future<void> cancel() => _speech.cancel();
}
