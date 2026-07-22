import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/app_providers.dart';
import '../services/learning_store.dart';
import '../theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learning = ref.watch(learningProvider);
    final controller = ref.read(learningProvider.notifier);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 42, 24, 48),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'READING PREFERENCES',
                  style: TextStyle(
                    color: cinnabar,
                    letterSpacing: 2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Make the page yours.',
                  style: Theme.of(context).textTheme.displayMedium,
                ),
                const SizedBox(height: 32),
                _SettingCard(
                  title: 'Pinyin assistance',
                  description:
                      'Show pronunciation everywhere, only above difficult words, or not at all.',
                  child: SegmentedButton<PinyinMode>(
                    segments: const [
                      ButtonSegment(value: PinyinMode.all, label: Text('All')),
                      ButtonSegment(
                        value: PinyinMode.difficult,
                        label: Text('Difficult'),
                      ),
                      ButtonSegment(
                        value: PinyinMode.hidden,
                        label: Text('Hidden'),
                      ),
                    ],
                    selected: {learning.pinyinMode},
                    onSelectionChanged: (selection) =>
                        controller.setPinyinMode(selection.first),
                  ),
                ),
                const SizedBox(height: 14),
                _SettingCard(
                  title: 'English translations',
                  description:
                      'Start each story with translations open. You can still toggle individual blocks.',
                  child: Switch(
                    value: learning.showTranslations,
                    onChanged: controller.setTranslations,
                  ),
                ),
                const SizedBox(height: 14),
                _SettingCard(
                  title: 'Playback speed',
                  description:
                      'The speed applies to whole-story and individual-block playback.',
                  child: Wrap(
                    spacing: 8,
                    children: [.75, 1.0, 1.25, 1.5]
                        .map(
                          (speed) => ChoiceChip(
                            label: Text('$speed×'),
                            selected: learning.playbackSpeed == speed,
                            onSelected: (_) {
                              controller.setPlaybackSpeed(speed);
                              ref.read(readerAudioProvider).setSpeed(speed);
                            },
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(height: 14),
                _SettingCard(
                  title: 'Local study data',
                  description:
                      'Progress and saved words stay on this device. Story content and audio are read-only app assets.',
                  child: OutlinedButton.icon(
                    onPressed: () => _confirmClear(context, controller),
                    icon: const Icon(Icons.delete_outline_rounded),
                    label: const Text('Clear progress'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmClear(
    BuildContext context,
    LearningController controller,
  ) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear local study data?'),
        content: const Text(
          'This removes reading progress and saved words from this device.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (approved == true) controller.clearProgress();
  }
}

class _SettingCard extends StatelessWidget {
  const _SettingCard({
    required this.title,
    required this.description,
    required this.child,
  });
  final String title;
  final String description;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(22),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final stacked = constraints.maxWidth < 580;
          final copy = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 6),
              Text(
                description,
                style: TextStyle(
                  color: ink.withValues(alpha: .62),
                  height: 1.45,
                ),
              ),
            ],
          );
          if (stacked) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [copy, const SizedBox(height: 18), child],
            );
          }
          return Row(
            children: [
              Expanded(child: copy),
              const SizedBox(width: 24),
              child,
            ],
          );
        },
      ),
    ),
  );
}
