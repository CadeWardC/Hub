import 'package:flutter/material.dart';

import '../main.dart';
import '../services/back_translation.dart';
import '../services/pitch_recorder.dart';
import '../services/speech_recognizer.dart';
import '../services/tone_analyzer.dart';
import '../utils/tones.dart';

/// Say something in Mandarin and see what the phone heard: the characters, a
/// word-by-word gloss, an English translation where the platform can manage
/// one, and how each syllable's tone came out.
class SpeakScreen extends StatefulWidget {
  const SpeakScreen({
    super.key,
    this.recognizer,
    this.recorder,
    this.translator,
  });

  // Injected in tests; the real screen builds its own.
  final SpeechRecognizer? recognizer;
  final PitchRecorder? recorder;
  final BackTranslator? translator;

  @override
  State<SpeakScreen> createState() => _SpeakScreenState();
}

enum _Stage { idle, listening, thinking, done }

class _SpeakScreenState extends State<SpeakScreen> {
  late final SpeechRecognizer _recognizer =
      widget.recognizer ?? SpeechRecognizer();
  late final PitchRecorder _recorder = widget.recorder ?? PitchRecorder();
  late final BackTranslator _translator = widget.translator ?? BackTranslator();
  static const _analyzer = ToneAnalyzer();

  _Stage _stage = _Stage.idle;

  // The microphone takes a moment to open, and a button can be released
  // before it has.
  bool _starting = false;
  bool _stopRequested = false;

  /// False when the recorder could not take the microphone, so there is a
  /// transcript to show but no pitch to score.
  bool _pitchAvailable = true;

  bool _ready = false;
  String? _blocked;
  String _heard = '';
  BackTranslation? _translation;
  ToneReport? _tones;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  @override
  void dispose() {
    _recorder.dispose();
    _translator.dispose();
    super.dispose();
  }

  Future<void> _prepare() async {
    final ready = await _recognizer.initialize();
    if (!mounted) return;
    setState(() {
      _ready = ready;
      _blocked = ready ? null : _recognizer.unavailableReason;
    });
  }

  Future<void> _start() async {
    if (!_ready || _starting || _stage == _Stage.listening) return;
    _starting = true;
    _stopRequested = false;
    // Enter the listening state before any await: a quick tap can release the
    // button while the microphone is still opening, and the release must not
    // find the screen still idle.
    setState(() {
      _stage = _Stage.listening;
      _heard = '';
      _translation = null;
      _tones = null;
      _blocked = null;
    });

    if (!await _recorder.hasPermission()) {
      _starting = false;
      if (!mounted) return;
      setState(() {
        _stage = _Stage.idle;
        _blocked = 'The microphone permission was declined.';
      });
      return;
    }
    // The recogniser and the pitch track run on the same breath: one gives the
    // characters, the other the melody they were said with. Some platforms —
    // browsers in particular — will not hand the microphone to both at once,
    // and losing the tones is no reason to lose the transcript too.
    _pitchAvailable = true;
    try {
      await _recorder.start();
    } catch (_) {
      _pitchAvailable = false;
    }
    await _recognizer.listen(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() => _heard = text);
      },
    );
    _starting = false;
    if (_stopRequested) await _stop();
  }

  Future<void> _stop() async {
    // Released before recording actually began; stop once it has.
    if (_starting) {
      _stopRequested = true;
      return;
    }
    if (_stage != _Stage.listening) return;
    setState(() => _stage = _Stage.thinking);
    await _recognizer.stop();
    final samples = await _recorder.stop();
    // Give the recogniser a moment to deliver its final transcript.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    final heard = _heard.trim();
    if (heard.isEmpty) {
      setState(() {
        _stage = _Stage.done;
        _blocked = 'Nothing was recognised. Try again, closer to the mic.';
      });
      return;
    }

    final translation = await _translator.translate(heard);
    final tones = _pitchAvailable
        ? _analyzer.analyse(
            samples: samples,
            expectedPinyin: translation.pinyinSyllables,
          )
        : const ToneReport(
            syllables: [],
            note:
                'Tone scoring needs its own microphone stream, and this '
                'browser gave it to the recogniser instead. The characters '
                'and meaning above are still yours.',
          );
    if (!mounted) return;
    setState(() {
      _translation = translation;
      _tones = tones;
      _stage = _Stage.done;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
        children: [
          Text(
            'Say it out loud',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: MandarinReaderApp.ink,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Hold the button and speak Mandarin. You will see what the phone '
            'heard, what it means back in English, and how your tones landed.',
            style: TextStyle(color: Color(0xFF646B66), fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 22),
          _MicButton(
            stage: _stage,
            enabled: _ready,
            onPressStart: _start,
            onPressEnd: _stop,
          ),
          if (_blocked != null) ...[
            const SizedBox(height: 18),
            _Notice(message: _blocked!),
          ],
          if (_heard.isNotEmpty) ...[
            const SizedBox(height: 24),
            _HeardCard(
              chinese: _heard,
              translation: _translation,
              listening: _stage == _Stage.listening,
            ),
          ],
          if (_translation != null) ...[
            const SizedBox(height: 14),
            _GlossCard(words: _translation!.words),
          ],
          if (_tones != null) ...[
            const SizedBox(height: 14),
            _ToneCard(report: _tones!),
          ],
        ],
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  const _MicButton({
    required this.stage,
    required this.enabled,
    required this.onPressStart,
    required this.onPressEnd,
  });

  final _Stage stage;
  final bool enabled;
  final VoidCallback onPressStart;
  final VoidCallback onPressEnd;

  @override
  Widget build(BuildContext context) {
    final listening = stage == _Stage.listening;
    final label = switch (stage) {
      _Stage.listening => 'Listening — release when done',
      _Stage.thinking => 'Working it out…',
      _ => enabled ? 'Hold to speak' : 'Speech recognition unavailable',
    };
    return Column(
      children: [
        GestureDetector(
          onTapDown: enabled ? (_) => onPressStart() : null,
          onTapUp: enabled ? (_) => onPressEnd() : null,
          onTapCancel: enabled ? onPressEnd : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            width: listening ? 116 : 104,
            height: listening ? 116 : 104,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: !enabled
                  ? const Color(0xFFDDD8CC)
                  : listening
                  ? MandarinReaderApp.jade
                  : MandarinReaderApp.ink,
              boxShadow: [
                if (listening)
                  const BoxShadow(
                    color: Color(0x4028A06E),
                    blurRadius: 26,
                    spreadRadius: 4,
                  ),
              ],
            ),
            child: Icon(
              stage == _Stage.thinking
                  ? Icons.hourglass_top_rounded
                  : Icons.mic_rounded,
              color: Colors.white,
              size: 42,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          label,
          style: const TextStyle(color: Color(0xFF646B66), fontSize: 13),
        ),
      ],
    );
  }
}

class _HeardCard extends StatelessWidget {
  const _HeardCard({
    required this.chinese,
    required this.translation,
    required this.listening,
  });

  final String chinese;
  final BackTranslation? translation;
  final bool listening;

  @override
  Widget build(BuildContext context) {
    final sentence = translation?.sentence;
    return _Card(
      title: listening ? 'HEARING' : 'YOU SAID',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            chinese,
            style: const TextStyle(
              color: MandarinReaderApp.ink,
              fontSize: 26,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (translation != null) ...[
            const SizedBox(height: 10),
            Text(
              translation!.pinyinSyllables.join(' '),
              style: const TextStyle(
                color: MandarinReaderApp.jade,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (sentence != null) ...[
            const SizedBox(height: 14),
            Text(
              sentence,
              style: const TextStyle(
                color: MandarinReaderApp.ink,
                fontSize: 17,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              translation!.sentenceSource ?? '',
              style: const TextStyle(color: Color(0xFF9AA39D), fontSize: 11.5),
            ),
          ] else if (translation != null) ...[
            const SizedBox(height: 12),
            const Text(
              'Sentence translation is not available on this platform, so the '
              'word meanings below are the check.',
              style: TextStyle(color: Color(0xFF9AA39D), fontSize: 12, height: 1.4),
            ),
          ],
        ],
      ),
    );
  }
}

class _GlossCard extends StatelessWidget {
  const _GlossCard({required this.words});

  final List<GlossedWord> words;

  @override
  Widget build(BuildContext context) {
    return _Card(
      title: 'WORD BY WORD',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final word in words)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 74,
                    child: Text(
                      word.text,
                      style: const TextStyle(
                        color: MandarinReaderApp.ink,
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (word.pinyin.isNotEmpty)
                          Text(
                            word.pinyin,
                            style: const TextStyle(
                              color: MandarinReaderApp.jade,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        Text(
                          word.known
                              ? word.english
                              : 'not in the dictionary — the recogniser may '
                                    'have misheard this one',
                          style: TextStyle(
                            color: word.known
                                ? MandarinReaderApp.ink
                                : const Color(0xFF9AA39D),
                            fontSize: 14,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ToneCard extends StatelessWidget {
  const _ToneCard({required this.report});

  final ToneReport report;

  @override
  Widget build(BuildContext context) {
    final score = report.score;
    return _Card(
      title: 'TONES',
      trailing: score == null
          ? null
          : Text(
              '${report.correctCount}/${report.measured.length} right',
              style: TextStyle(
                color: score >= 0.8
                    ? MandarinReaderApp.jade
                    : const Color(0xFF9D4132),
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
      child: report.isEmpty
          ? Text(
              report.note ?? 'Nothing to score.',
              style: const TextStyle(
                color: Color(0xFF646B66),
                fontSize: 13.5,
                height: 1.45,
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final syllable in report.syllables)
                      _SyllableChip(syllable: syllable),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tone scoring reads the pitch of your voice. It is most '
                  'reliable on slow, clear speech — treat it as a hint, not a '
                  'verdict.',
                  style: TextStyle(
                    color: Color(0xFF9AA39D),
                    fontSize: 11.5,
                    height: 1.4,
                  ),
                ),
              ],
            ),
    );
  }
}

class _SyllableChip extends StatelessWidget {
  const _SyllableChip({required this.syllable});

  final SyllableTone syllable;

  static const _shapes = {
    1: 'flat',
    2: 'rising',
    3: 'dipping',
    4: 'falling',
    5: 'neutral',
  };

  @override
  Widget build(BuildContext context) {
    final unmeasured = !syllable.measured;
    final correct = syllable.correct;
    final background = unmeasured
        ? const Color(0xFFF0EDE4)
        : correct
        ? const Color(0xFFE0F0E7)
        : const Color(0xFFFBE7E2);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                syllable.pinyin,
                style: TextStyle(
                  color: toneColor(syllable.expectedTone),
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                unmeasured
                    ? Icons.help_outline_rounded
                    : correct
                    ? Icons.check_circle_rounded
                    : Icons.error_outline_rounded,
                size: 16,
                color: unmeasured
                    ? const Color(0xFF9AA39D)
                    : correct
                    ? MandarinReaderApp.jade
                    : const Color(0xFF9D4132),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            unmeasured
                ? 'too quiet to judge'
                : correct
                ? 'tone ${syllable.expectedTone} · ${_shapes[syllable.expectedTone]}'
                : 'said tone ${syllable.heardTone}, wanted ${syllable.expectedTone}',
            style: const TextStyle(color: Color(0xFF646B66), fontSize: 11.5),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child, this.trailing});

  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE3DED2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: MandarinReaderApp.jade,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              const Spacer(),
              ?trailing,
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFBE7E2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF9D4132)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFF7A3628),
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
