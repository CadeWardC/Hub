/// Which script the reader is showing.
///
/// Stories are authored and published in Traditional, because that is what
/// Taiwan uses. The Simplified fields are derived at publish time, so any of
/// them may be missing; everything here falls back to Traditional rather than
/// rendering a blank.
enum ChineseScript { traditional, simplified }

String _inScript(
  String traditional,
  String simplified,
  ChineseScript script,
) {
  if (script == ChineseScript.simplified && simplified.isNotEmpty) {
    return simplified;
  }
  return traditional;
}

/// Where a story sits inside a multi-chapter book. Standalone stories have
/// none; chapters published from the workshop carry one, and it is what lets
/// the library show a twelve-part book as a single shelf item.
class BookRef {
  const BookRef({
    required this.id,
    required this.titleEnglish,
    required this.titleChinese,
    this.titleChineseSimplified = '',
    required this.titlePinyin,
    required this.summaryEnglish,
    required this.chapterNumber,
    required this.chapterCount,
    required this.chapterTitleEnglish,
    required this.chapterTitleChinese,
    this.chapterTitleChineseSimplified = '',
  });

  final String id;
  final String titleEnglish;
  final String titleChinese;
  final String titleChineseSimplified;
  final String titlePinyin;
  final String summaryEnglish;
  final int chapterNumber;
  final int chapterCount;
  final String chapterTitleEnglish;
  final String chapterTitleChinese;
  final String chapterTitleChineseSimplified;

  String titleChineseIn(ChineseScript script) =>
      _inScript(titleChinese, titleChineseSimplified, script);

  String chapterTitleChineseIn(ChineseScript script) =>
      _inScript(chapterTitleChinese, chapterTitleChineseSimplified, script);

  static BookRef? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    final id = json['id'] as String? ?? '';
    if (id.isEmpty) return null;
    return BookRef(
      id: id,
      titleEnglish: json['titleEnglish'] as String? ?? 'Untitled Book',
      titleChinese: json['titleChinese'] as String? ?? '',
      titleChineseSimplified:
          json['titleChineseSimplified'] as String? ?? '',
      titlePinyin: json['titlePinyin'] as String? ?? '',
      summaryEnglish: json['summaryEnglish'] as String? ?? '',
      chapterNumber: (json['chapterNumber'] as num?)?.toInt() ?? 0,
      chapterCount: (json['chapterCount'] as num?)?.toInt() ?? 0,
      chapterTitleEnglish: json['chapterTitleEnglish'] as String? ?? '',
      chapterTitleChinese: json['chapterTitleChinese'] as String? ?? '',
      chapterTitleChineseSimplified:
          json['chapterTitleChineseSimplified'] as String? ?? '',
    );
  }
}

class StorySummary {
  const StorySummary({
    required this.id,
    required this.path,
    required this.titleEnglish,
    required this.titleChinese,
    this.titleChineseSimplified = '',
    required this.titlePinyin,
    required this.summaryEnglish,
    required this.summaryChinese,
    this.summaryChineseSimplified = '',
    required this.level,
    required this.segmentCount,
    required this.durationSeconds,
    required this.publishedAt,
    this.book,
  });

  final String id;
  final String path;
  final String titleEnglish;
  final String titleChinese;
  final String titleChineseSimplified;
  final String titlePinyin;
  final String summaryEnglish;
  final String summaryChinese;
  final String summaryChineseSimplified;
  final String level;
  final int segmentCount;
  final int durationSeconds;
  final DateTime? publishedAt;
  final BookRef? book;

  String titleChineseIn(ChineseScript script) =>
      _inScript(titleChinese, titleChineseSimplified, script);

  String summaryChineseIn(ChineseScript script) =>
      _inScript(summaryChinese, summaryChineseSimplified, script);

  factory StorySummary.fromJson(Map<String, dynamic> json) {
    return StorySummary(
      id: json['id'] as String? ?? '',
      path: json['path'] as String? ?? '',
      titleEnglish: json['titleEnglish'] as String? ?? 'Untitled Story',
      titleChinese: json['titleChinese'] as String? ?? '',
      titleChineseSimplified:
          json['titleChineseSimplified'] as String? ?? '',
      titlePinyin: json['titlePinyin'] as String? ?? '',
      summaryEnglish: json['summaryEnglish'] as String? ?? '',
      summaryChinese: json['summaryChinese'] as String? ?? '',
      summaryChineseSimplified:
          json['summaryChineseSimplified'] as String? ?? '',
      level: json['level'] as String? ?? 'TOCFL Novice 1',
      segmentCount: (json['segmentCount'] as num?)?.toInt() ?? 0,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      publishedAt: DateTime.tryParse(json['publishedAt'] as String? ?? ''),
      book: BookRef.fromJson(json['book'] as Map<String, dynamic>?),
    );
  }
}

class Story {
  const Story({
    required this.id,
    required this.assetDirectory,
    required this.titleEnglish,
    required this.titleChinese,
    this.titleChineseSimplified = '',
    required this.titlePinyin,
    required this.level,
    required this.summaryEnglish,
    required this.summaryChinese,
    this.summaryChineseSimplified = '',
    required this.summaryPinyin,
    required this.segments,
    required this.vocabulary,
  });

  final String id;
  final String assetDirectory;
  final String titleEnglish;
  final String titleChinese;
  final String titleChineseSimplified;
  final String titlePinyin;
  final String level;
  final String summaryEnglish;
  final String summaryChinese;
  final String summaryChineseSimplified;
  final String summaryPinyin;
  final List<StorySegment> segments;
  final List<VocabularyItem> vocabulary;

  String titleChineseIn(ChineseScript script) =>
      _inScript(titleChinese, titleChineseSimplified, script);

  String summaryChineseIn(ChineseScript script) =>
      _inScript(summaryChinese, summaryChineseSimplified, script);

  /// Whether this story carries a Simplified rendering at all. The reader hides
  /// the script toggle when it does not, rather than offering a switch that
  /// changes nothing.
  bool get hasSimplified =>
      segments.any((segment) => segment.chineseSimplified.isNotEmpty);

  factory Story.fromJson(
    Map<String, dynamic> json, {
    required String assetPath,
  }) {
    final title = json['title'] as Map<String, dynamic>? ?? const {};
    final summary = json['summary'] as Map<String, dynamic>? ?? const {};
    final slash = assetPath.lastIndexOf('/');
    final assetDirectory = slash == -1 ? '' : assetPath.substring(0, slash);

    return Story(
      id: json['storyId'] as String? ?? '',
      assetDirectory: assetDirectory,
      titleEnglish: title['english'] as String? ?? 'Untitled Story',
      titleChinese: title['chinese'] as String? ?? '',
      titleChineseSimplified: title['chineseSimplified'] as String? ?? '',
      titlePinyin: title['pinyin'] as String? ?? '',
      level: json['level'] as String? ?? 'TOCFL Novice 1',
      summaryEnglish: summary['english'] as String? ?? '',
      summaryChinese: summary['chinese'] as String? ?? '',
      summaryChineseSimplified:
          summary['chineseSimplified'] as String? ?? '',
      summaryPinyin: summary['pinyin'] as String? ?? '',
      segments: (json['segments'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(StorySegment.fromJson)
          .toList(growable: false),
      vocabulary: (json['vocabulary'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VocabularyItem.fromJson)
          .toList(growable: false),
    );
  }

  String? audioAssetFor(StorySegment segment) {
    return _resolveAudioPath(segment.audioFile);
  }

  /// Picks the audio file and playback rate for [speed]. Slow speeds prefer a
  /// pre-generated variant played at 1.0 so the browser never has to
  /// time-stretch; without a variant (or for fast speeds) the normal file is
  /// rate-adjusted instead.
  ({String asset, double playbackRate})? audioPlanFor(
    StorySegment segment,
    double speed,
  ) {
    final variant = _resolveAudioPath(segment.audioVariants['$speed']);
    if (variant != null) return (asset: variant, playbackRate: 1.0);
    final asset = audioAssetFor(segment);
    if (asset == null) return null;
    return (asset: asset, playbackRate: speed);
  }

  String? _resolveAudioPath(String? audioFile) {
    if (audioFile == null || audioFile.isEmpty) return null;
    if (audioFile.startsWith('assets/')) return audioFile;
    return '$assetDirectory/$audioFile';
  }
}

class StorySegment {
  const StorySegment({
    required this.id,
    required this.english,
    required this.chinese,
    this.chineseSimplified = '',
    required this.pinyin,
    required this.audioText,
    required this.audioFile,
    this.audioVariants = const {},
    required this.words,
  });

  final String id;
  final String english;

  /// The segment in Traditional characters, as authored.
  final String chinese;

  /// The same segment in Simplified, derived at publish time. Empty when the
  /// workshop could not derive it.
  final String chineseSimplified;
  final String pinyin;

  /// The text handed to speech synthesis. Traditional, like [chinese]:
  /// converting down to Simplified would introduce reading ambiguity that the
  /// Traditional form does not have (乾 and 幹 both become 干).
  final String audioText;
  final String? audioFile;

  /// Pre-generated speed variants, keyed by speed (e.g. "0.75") with the
  /// audio file path as the value.
  final Map<String, String> audioVariants;
  final List<StoryWord> words;

  String chineseIn(ChineseScript script) =>
      _inScript(chinese, chineseSimplified, script);

  factory StorySegment.fromJson(Map<String, dynamic> json) {
    return StorySegment(
      id: json['id'] as String? ?? '',
      english: json['english'] as String? ?? '',
      chinese: json['chinese'] as String? ?? '',
      chineseSimplified: json['chineseSimplified'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      audioText: json['audioText'] as String? ?? '',
      audioFile: json['audioFile'] as String?,
      audioVariants: {
        for (final entry
            in (json['audioVariants'] as Map<String, dynamic>? ?? const {})
                .entries)
          if (entry.value is String) entry.key: entry.value as String,
      },
      words: (json['words'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(StoryWord.fromJson)
          .where((word) => word.text.isNotEmpty)
          .toList(growable: false),
    );
  }
}

class StoryWord {
  const StoryWord({
    required this.text,
    this.textSimplified = '',
    required this.pinyin,
    required this.english,
  });

  /// The word in Traditional characters.
  final String text;

  /// The word in Simplified, derived at publish time; empty when unavailable.
  final String textSimplified;
  final String pinyin;
  final String english;

  String textIn(ChineseScript script) =>
      _inScript(text, textSimplified, script);

  factory StoryWord.fromJson(Map<String, dynamic> json) {
    return StoryWord(
      text: json['text'] as String? ?? '',
      textSimplified: json['textSimplified'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      english: json['english'] as String? ?? '',
    );
  }
}

class VocabularyItem {
  const VocabularyItem({
    required this.traditional,
    this.simplified = '',
    required this.pinyin,
    required this.english,
  });

  final String traditional;
  final String simplified;
  final String pinyin;
  final String english;

  String textIn(ChineseScript script) =>
      _inScript(traditional, simplified, script);

  factory VocabularyItem.fromJson(Map<String, dynamic> json) {
    return VocabularyItem(
      traditional: json['traditional'] as String? ?? '',
      simplified: json['simplified'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      english: json['english'] as String? ?? '',
    );
  }
}
