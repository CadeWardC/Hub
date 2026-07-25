import 'dart:async';

import 'package:flutter/material.dart';

import '../main.dart';
import '../services/dictionary.dart';
import '../services/saved_words_store.dart';
import '../utils/tones.dart';

/// The Chinese-English dictionary: opened on a specific word from the reader,
/// or browsed freely from the library's Dictionary tab.
class DictionaryScreen extends StatefulWidget {
  const DictionaryScreen({super.key, this.initialQuery, this.embedded = false});

  /// A word to look up straight away, e.g. the one held in the reader.
  final String? initialQuery;

  /// True when hosted inside the library's tab bar, which supplies its own
  /// scaffold and navigation.
  final bool embedded;

  @override
  State<DictionaryScreen> createState() => _DictionaryScreenState();
}

class _DictionaryScreenState extends State<DictionaryScreen> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initialQuery ?? '',
  );
  Dictionary? _dictionary;
  List<DictionaryEntry> _results = const [];
  Set<String> _savedTexts = {};
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final dictionary = await Dictionary.load();
    final saved = await SavedWordsStore.savedTexts();
    if (!mounted) return;
    setState(() {
      _dictionary = dictionary;
      _savedTexts = saved;
      _results = dictionary.search(_controller.text);
    });
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 180), () {
      final dictionary = _dictionary;
      if (dictionary == null || !mounted) return;
      setState(() => _results = dictionary.search(value));
    });
  }

  Future<void> _toggleSaved(DictionaryEntry entry) async {
    final saved = await SavedWordsStore.toggle(
      text: entry.simplified,
      pinyin: entry.firstPinyin,
      english: entry.summary,
      storyId: 'dictionary',
    );
    if (!mounted) return;
    setState(() {
      if (saved) {
        _savedTexts.add(entry.simplified);
      } else {
        _savedTexts.remove(entry.simplified);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final dictionary = _dictionary;
    final body = SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: TextField(
              controller: _controller,
              autofocus: widget.initialQuery == null && !widget.embedded,
              onChanged: _onQueryChanged,
              decoration: InputDecoration(
                hintText: 'Search 汉字, pinyin, or English',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () {
                          _controller.clear();
                          _onQueryChanged('');
                        },
                      ),
                filled: true,
                fillColor: const Color(0xFFFFFDF8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFE3DED2)),
                ),
              ),
            ),
          ),
          if (dictionary == null)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (dictionary.isEmpty)
            const Expanded(
              child: _DictionaryMessage(
                icon: Icons.menu_book_outlined,
                title: 'The dictionary is not available',
                detail:
                    'Rebuild it with tool/build_dictionary.py, then restart the app.',
              ),
            )
          else if (_controller.text.trim().isEmpty)
            Expanded(
              child: _DictionaryMessage(
                icon: Icons.travel_explore_rounded,
                title: '${_formatCount(dictionary.headwordCount)} words',
                detail:
                    'Look up any word by characters, pinyin (with or without tones), or English.',
                attribution: dictionary.attribution,
              ),
            )
          else if (_results.isEmpty)
            Expanded(
              child: _DictionaryMessage(
                icon: Icons.search_off_rounded,
                title: 'Nothing found for "${_controller.text.trim()}"',
                detail: 'Try fewer characters, or search the English meaning.',
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                itemCount: _results.length + 1,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index == _results.length) {
                    return _Attribution(attribution: dictionary.attribution);
                  }
                  final entry = _results[index];
                  return _EntryCard(
                    entry: entry,
                    saved: _savedTexts.contains(entry.simplified),
                    onToggleSaved: () => _toggleSaved(entry),
                  );
                },
              ),
            ),
        ],
      ),
    );

    if (widget.embedded) return body;
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      appBar: AppBar(title: Text(widget.initialQuery ?? 'Dictionary')),
      body: body,
    );
  }

  static String _formatCount(int count) {
    final digits = count.toString();
    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) buffer.write(',');
      buffer.write(digits[index]);
    }
    return buffer.toString();
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({
    required this.entry,
    required this.saved,
    required this.onToggleSaved,
  });

  final DictionaryEntry entry;
  final bool saved;
  final VoidCallback onToggleSaved;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 14, 8, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE3DED2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.simplified,
                  style: const TextStyle(
                    color: MandarinReaderApp.ink,
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                for (final reading in entry.readings) ...[
                  const SizedBox(height: 8),
                  Text.rich(
                    TextSpan(
                      children: pinyinSpans(
                        reading.pinyin,
                        colored: false,
                        fallback: MandarinReaderApp.jade,
                      ),
                    ),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (reading.traditional != null &&
                      reading.traditional!.isNotEmpty)
                    Text(
                      'traditional ${reading.traditional}',
                      style: const TextStyle(
                        color: Color(0xFF8A918B),
                        fontSize: 12,
                      ),
                    ),
                  const SizedBox(height: 4),
                  for (final sense in reading.senses)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '· $sense',
                        style: const TextStyle(
                          color: MandarinReaderApp.ink,
                          fontSize: 15,
                          height: 1.35,
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
          IconButton(
            onPressed: onToggleSaved,
            tooltip: saved ? 'Remove saved word' : 'Save word',
            icon: Icon(
              saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
              color: MandarinReaderApp.jade,
            ),
          ),
        ],
      ),
    );
  }
}

class _DictionaryMessage extends StatelessWidget {
  const _DictionaryMessage({
    required this.icon,
    required this.title,
    required this.detail,
    this.attribution,
  });

  final IconData icon;
  final String title;
  final String detail;
  final DictionaryAttribution? attribution;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(34),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42, color: const Color(0xFF9AA39D)),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF657068),
              ),
            ),
            if (attribution != null) ...[
              const SizedBox(height: 22),
              _Attribution(attribution: attribution!),
            ],
          ],
        ),
      ),
    );
  }
}

class _Attribution extends StatelessWidget {
  const _Attribution({required this.attribution});

  final DictionaryAttribution attribution;

  @override
  Widget build(BuildContext context) {
    if (attribution.line.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(
        attribution.line,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Color(0xFF9AA39D), fontSize: 11.5),
      ),
    );
  }
}
