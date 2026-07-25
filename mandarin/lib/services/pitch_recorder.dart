import 'dart:async';
import 'dart:typed_data';

import 'package:pitch_detector_dart/pitch_detector.dart';
import 'package:record/record.dart';

import 'tone_analyzer.dart';

/// Records the microphone and turns it into a pitch track.
///
/// The speech recogniser and this run at the same time on the same voice: one
/// produces the characters, the other the melody they were said with. Nothing
/// is written to disk — the PCM is analysed frame by frame and dropped.
class PitchRecorder {
  PitchRecorder({AudioRecorder? recorder, this.sampleRate = 16000})
    : _recorder = recorder ?? AudioRecorder();

  final AudioRecorder _recorder;
  final int sampleRate;

  /// YIN needs a window long enough to see a full pitch period of a low voice;
  /// 1024 samples at 16 kHz is 64 ms, which comfortably covers 80 Hz.
  static const bufferSize = 1024;

  late final PitchDetector _detector = PitchDetector(
    audioSampleRate: sampleRate.toDouble(),
    bufferSize: bufferSize,
  );

  StreamSubscription<Uint8List>? _subscription;
  final List<PitchSample> _samples = [];
  final BytesBuilder _pending = BytesBuilder(copy: false);
  int _framesRead = 0;
  bool _recording = false;

  bool get isRecording => _recording;

  Future<bool> hasPermission() => _recorder.hasPermission();

  Future<void> start() async {
    if (_recording) return;
    _samples.clear();
    _pending.clear();
    _framesRead = 0;

    final stream = await _recorder.startStream(
      RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: sampleRate,
        numChannels: 1,
        echoCancel: false,
        noiseSuppress: false,
      ),
    );
    _recording = true;
    _subscription = stream.listen(
      _onAudio,
      onError: (_) {},
      cancelOnError: false,
    );
  }

  /// Stops recording and returns everything heard, oldest first.
  Future<List<PitchSample>> stop() async {
    if (!_recording) return _ordered();
    _recording = false;
    await _recorder.stop();
    await _subscription?.cancel();
    _subscription = null;
    // Let the last few windows finish before reporting.
    await Future<void>.delayed(const Duration(milliseconds: 60));
    return _ordered();
  }

  /// Frames are analysed asynchronously, so they can land out of order.
  List<PitchSample> _ordered() {
    final ordered = [..._samples]
      ..sort((a, b) => a.timeSeconds.compareTo(b.timeSeconds));
    return List.unmodifiable(ordered);
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    await _recorder.dispose();
  }

  void _onAudio(Uint8List chunk) {
    // The recorder hands over arbitrary chunk sizes; YIN wants a fixed window,
    // so buffer and slice.
    _pending.add(chunk);
    const bytesPerFrame = bufferSize * 2;
    while (_pending.length >= bytesPerFrame) {
      final buffered = _pending.takeBytes();
      var offset = 0;
      while (buffered.length - offset >= bytesPerFrame) {
        final window = Uint8List.sublistView(
          buffered,
          offset,
          offset + bytesPerFrame,
        );
        _analyse(window);
        offset += bytesPerFrame;
      }
      if (offset < buffered.length) {
        _pending.add(Uint8List.sublistView(buffered, offset));
      }
    }
  }

  void _analyse(Uint8List window) {
    final time = _framesRead * bufferSize / sampleRate;
    _framesRead++;
    // The detector's API is async but the YIN implementation is synchronous
    // work; recording a sentence produces a few dozen of these.
    _detector.getPitchFromIntBuffer(window).then((result) {
      _samples.add(
        PitchSample(
          timeSeconds: time,
          frequencyHz: result.pitch,
          // Speech sits between roughly 70 Hz and 400 Hz; anything outside is
          // noise, not a voice.
          voiced: result.pitched &&
              result.probability > 0.55 &&
              result.pitch >= 70 &&
              result.pitch <= 450,
        ),
      );
    }).catchError((_) {});
  }
}
