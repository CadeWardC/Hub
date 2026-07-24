import 'package:flutter/material.dart';

import '../main.dart';

/// The docked audio bar at the bottom of the reader: play/pause, previous and
/// next sentence, position, and narration speed.
class PlayerBar extends StatelessWidget {
  const PlayerBar({
    super.key,
    required this.playing,
    required this.sentenceNumber,
    required this.sentenceCount,
    required this.speed,
    required this.onPlayPause,
    required this.onPrevious,
    required this.onNext,
    required this.onSpeedChanged,
  });

  final bool playing;
  final int sentenceNumber;
  final int sentenceCount;
  final double speed;
  final VoidCallback onPlayPause;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final ValueChanged<double> onSpeedChanged;

  String _speedLabel(double value) {
    return value == value.roundToDouble()
        ? '${value.toStringAsFixed(1)}×'
        : '${value.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '')}×';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFFFFDF8),
        border: Border(top: BorderSide(color: Color(0xFFE7E1D5))),
        boxShadow: [
          BoxShadow(
            color: Color(0x140F2F26),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              Text(
                '$sentenceNumber / $sentenceCount',
                style: const TextStyle(
                  color: Color(0xFF59635D),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: onPrevious,
                tooltip: 'Previous sentence',
                icon: const Icon(Icons.skip_previous_rounded, size: 30),
                color: MandarinReaderApp.ink,
              ),
              const SizedBox(width: 4),
              FilledButton(
                onPressed: onPlayPause,
                style: FilledButton.styleFrom(
                  backgroundColor: MandarinReaderApp.ink,
                  shape: const CircleBorder(),
                  padding: const EdgeInsets.all(12),
                ),
                child: Icon(
                  playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  size: 30,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                onPressed: onNext,
                tooltip: 'Next sentence',
                icon: const Icon(Icons.skip_next_rounded, size: 30),
                color: MandarinReaderApp.ink,
              ),
              const Spacer(),
              PopupMenuButton<double>(
                tooltip: 'Narration speed',
                initialValue: speed,
                onSelected: onSpeedChanged,
                itemBuilder: (context) => [
                  for (final value in const [0.5, 0.75, 1.0, 1.25, 1.5])
                    PopupMenuItem(
                      value: value,
                      child: Row(
                        children: [
                          if (value == speed)
                            const Icon(
                              Icons.check_rounded,
                              size: 18,
                              color: MandarinReaderApp.jade,
                            )
                          else
                            const SizedBox(width: 18),
                          const SizedBox(width: 8),
                          Text(_speedLabel(value)),
                        ],
                      ),
                    ),
                ],
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 10,
                  ),
                  child: Text(
                    _speedLabel(speed),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: MandarinReaderApp.ink,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
