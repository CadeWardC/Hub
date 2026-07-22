import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/app_providers.dart';
import '../theme.dart';

class SavedWordsScreen extends ConsumerWidget {
  const SavedWordsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final words = ref.watch(learningProvider).savedWords;
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 42, 24, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MY WORDS',
                        style: TextStyle(
                          color: cinnabar,
                          letterSpacing: 2,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Words worth returning to.',
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${words.length} contextual definitions saved from your reading.',
                        style: TextStyle(color: ink.withValues(alpha: .62)),
                      ),
                    ],
                  ),
                ),
              ),
              if (words.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Text('Tap a word inside any story to save it here.'),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
                  sliver: SliverList.separated(
                    itemCount: words.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final word = words[index];
                      return Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 10,
                          ),
                          title: Row(
                            children: [
                              Text(
                                word.text,
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Text(
                                word.pinyin,
                                style: const TextStyle(
                                  color: cinnabar,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 7),
                            child: Text(
                              '${word.gloss}\n${word.storyTitle}',
                              style: const TextStyle(height: 1.45),
                            ),
                          ),
                          isThreeLine: true,
                          onTap: () => context.go('/story/${word.storyId}'),
                          trailing: IconButton(
                            tooltip: 'Remove saved word',
                            icon: const Icon(Icons.bookmark_remove_outlined),
                            onPressed: () => ref
                                .read(learningProvider.notifier)
                                .toggleSavedWord(word),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
