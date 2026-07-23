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
    final audioFile = segment.audioFile;
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
  });

  final String id;
  final String english;
  final String chinese;
  final String pinyin;
  final String audioText;
  final String? audioFile;

  factory StorySegment.fromJson(Map<String, dynamic> json) {
    return StorySegment(
      id: json['id'] as String? ?? '',
      english: json['english'] as String? ?? '',
      chinese: json['chinese'] as String? ?? '',
      pinyin: json['pinyin'] as String? ?? '',
      audioText: json['audioText'] as String? ?? '',
      audioFile: json['audioFile'] as String?,
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
