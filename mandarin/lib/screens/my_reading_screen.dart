import 'package:flutter/material.dart';

import '../main.dart';
import '../services/saved_words_store.dart';
import '../utils/tones.dart';

/// The learner's saved words: a browsable list plus a flashcard review flow
/// driven by the Leitner boxes in [SavedWordsStore].
class MyReadingScreen extends StatefulWidget {
  const MyReadingScreen({super.key});

  @override
  State<MyReadingScreen> createState() => _MyReadingScreenState();
}

class _MyReadingScreenState extends State<MyReadingScreen> {
  List<SavedWord> _words = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final words = await SavedWordsStore.load();
    if (!mounted) return;
    setState(() {
      _words = words..sort((a, b) => b.addedAt.compareTo(a.addedAt));
      _loading = false;
    });
  }

  Future<void> _remove(SavedWord word) async {
    await SavedWordsStore.remove(word.text);
    await _reload();
  }

  Future<void> _startReview() async {
    final due = SavedWordsStore.dueWords(_words);
    if (due.isEmpty) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => _ReviewScreen(words: due)),
    );
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final due = SavedWordsStore.dueWords(_words);
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _words.isEmpty
                ? const _EmptyDeck()
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Saved words',
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(
                                          color: MandarinReaderApp.ink,
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '${_words.length} saved · ${due.length} due for review',
                                    style: const TextStyle(
                                      color: Color(0xFF646B66),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            FilledButton.icon(
                              onPressed: due.isEmpty ? null : _startReview,
                              style: FilledButton.styleFrom(
                                backgroundColor: MandarinReaderApp.ink,
                              ),
                              icon: const Icon(Icons.style_rounded, size: 18),
                              label: Text(
                                due.isEmpty ? 'All done' : 'Review ${due.length}',
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                          itemCount: _words.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final word = _words[index];
                            return Dismissible(
                              key: ValueKey(word.text),
                              direction: DismissDirection.endToStart,
                              onDismissed: (_) => _remove(word),
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 20),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3D9D3),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(
                                  Icons.delete_outline_rounded,
                                  color: Color(0xFFB3402F),
                                ),
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFFDF8),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: const Color(0xFFE1DCCF),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Text(
                                      word.text,
                                      style: const TextStyle(
                                        color: MandarinReaderApp.ink,
                                        fontSize: 24,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text.rich(
                                            TextSpan(
                                              children: pinyinSpans(
                                                word.pinyin,
                                                colored: true,
                                                fallback:
                                                    MandarinReaderApp.jade,
                                              ),
                                            ),
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          Text(
                                            word.english,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: Color(0xFF59635D),
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    _BoxBadge(box: word.box),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _BoxBadge extends StatelessWidget {
  const _BoxBadge({required this.box});

  final int box;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFE2F0E9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        'Lv ${box + 1}',
        style: const TextStyle(
          color: MandarinReaderApp.jade,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _EmptyDeck extends StatelessWidget {
  const _EmptyDeck();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.bookmark_border_rounded,
              size: 44,
              color: Color(0xFF9AA39D),
            ),
            const SizedBox(height: 12),
            Text(
              'No saved words yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: MandarinReaderApp.ink,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            const Text(
              'While reading, tap a word and press the bookmark to add it to your deck.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF646B66), height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

/// One pass over the due words: front shows the hanzi, tap to flip, then
/// grade yourself. Wrong answers return to the end of the session queue.
class _ReviewScreen extends StatefulWidget {
  const _ReviewScreen({required this.words});

  final List<SavedWord> words;

  @override
  State<_ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<_ReviewScreen> {
  late final List<SavedWord> _queue = [...widget.words];
  bool _flipped = false;
  int _done = 0;
  late final int _total = widget.words.length;

  Future<void> _grade(bool correct) async {
    final word = _queue.removeAt(0);
    final updated = await SavedWordsStore.review(word, correct: correct);
    if (!mounted) return;
    setState(() {
      _flipped = false;
      if (correct) {
        _done++;
      } else {
        _queue.add(updated);
      }
    });
    if (_queue.isEmpty && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final word = _queue.isEmpty ? null : _queue.first;
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      appBar: AppBar(title: Text('Review · $_done of $_total done')),
      body: word == null
          ? const SizedBox.shrink()
          : Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: () => setState(() => _flipped = true),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 48,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFDF8),
                            borderRadius: BorderRadius.circular(22),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x140F2F26),
                                blurRadius: 20,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              Text(
                                word.text,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: MandarinReaderApp.ink,
                                  fontSize: 52,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 18),
                              if (_flipped) ...[
                                Text.rich(
                                  TextSpan(
                                    children: pinyinSpans(
                                      word.pinyin,
                                      colored: true,
                                      fallback: MandarinReaderApp.jade,
                                    ),
                                  ),
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  word.english,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Color(0xFF404844),
                                    fontSize: 17,
                                    height: 1.4,
                                  ),
                                ),
                              ] else
                                const Text(
                                  'Tap to reveal',
                                  style: TextStyle(
                                    color: Color(0xFF9AA39D),
                                    fontSize: 14,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (_flipped)
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => _grade(false),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFB3402F),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                ),
                                child: const Text('Again'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                onPressed: () => _grade(true),
                                style: FilledButton.styleFrom(
                                  backgroundColor: MandarinReaderApp.jade,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                ),
                                child: const Text('Got it'),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
