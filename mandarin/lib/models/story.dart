class StorySummary {
  const StorySummary({
    required this.id,
    required this.path,
    required this.titleEnglish,
    required this.titleChinese,
    required this.titlePinyin,
    required this.summaryEnglish,
    required this.summaryChinese,
    required this.level,
    required this.segmentCount,
    required this.durationSeconds,
    required this.publishedAt,
  });

  final String id;
  final String path;
  final String titleEnglish;
  final String titleChinese;
  final String titlePinyin;
  final String summaryEnglish;
  final String summaryChinese;
  final String level;
  final int segmentCount;
  final int durationSeconds;
  final DateTime? publishedAt;

  factory StorySummary.fromJson(Map<String, dynamic> json) {
    return StorySummary(
      id: json['id'] as String? ?? '',
      path: json['path'] as String? ?? '',
      titleEnglish: json['titleEnglish'] as String? ?? 'Untitled Story',
      titleChinese: json['titleChinese'] as String? ?? '',
      titlePinyin: json['titlePinyin'] as String? ?? '',
      summaryEnglish: json['summaryEnglish'] as String? ?? '',
      summaryChinese: json['summaryChinese'] as String? ?? '',
      level: json['level'] as String? ?? 'HSK 1–2',
      segmentCount: (json['segmentCount'] as num?)?.toInt() ?? 0,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      publishedAt: DateTime.tryParse(json['publishedAt'] as String? ?? ''),
    );
  }
}

class Story {
  const Story({
    required this.id,
    required this.assetDirectory,
    required this.titleEnglish,
    required this.titleChinese,
    required this.titlePinyin,
    required this.level,
    required this.summaryEnglish,
    required this.summaryChinese,
    required this.summaryPinyin,
    required this.segments,
    required this.vocabulary,
  });

  final String id;
  final String assetDirectory;
  final String titleEnglish;
  final String titleChinese;
  final String titlePinyin;
  final String level;
  final String summaryEnglish;
  final String summaryChinese;
  final String summaryPinyin;
  final List<StorySegment> segments;
  final List<VocabularyItem> vocabulary;

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
      titlePinyin: title['pinyin'] as String? ?? '',
      level: json['level'] as String? ?? 'HSK 1–2',
      summaryEnglish: summary['english'] as String? ?? '',
      summaryChinese: summary['chinese'] as String? ?? '',
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
    required this.pinyin,
    required this.audioText,
    required this.audioFile,
    this.audioVariants = const {},
    required this.words,
  });

  final String id;
  final String english;
  final String chinese;
  final String pinyin;
  final String audioText;
  final String? audioFile;

  /// Pre-generated speed variants, keyed by speed (e.g. "0.75") with the
  /// audio file path as the value.
  final Map<String, String> audioVariants;
  final List<StoryWord> words;

  factory StorySegment.fromJson(Map<String, dynamic> json) {
    return StorySegment(
      id: json['id'] as String? ?? '',
      english: json['english'] as String? ?? '',
      chinese: json['chinese'] as String? ?? '',
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
    required this.pinyin,
    required this.english,
  });

  final String text;
  final String pinyin;
  final String english;

  factory StoryWord.fromJson(Map<String, dynamic> json) {
    return StoryWord(
      text: json['text'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      english: json['english'] as String? ?? '',
    );
  }
}

class VocabularyItem {
  const VocabularyItem({
    required this.simplified,
    required this.pinyin,
    required this.english,
  });

  final String simplified;
  final String pinyin;
  final String english;

  factory VocabularyItem.fromJson(Map<String, dynamic> json) {
    return VocabularyItem(
      simplified: json['simplified'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      english: json['english'] as String? ?? '',
    );
  }
}
