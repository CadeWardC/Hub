import 'dart:convert';

enum MandarinLevel {
  newbie('newbie', 'Newbie', 1, 150),
  elementary('elementary', 'Elementary', 2, 300),
  intermediate('intermediate', 'Intermediate', 3, 600),
  upperIntermediate('upper-intermediate', 'Upper Intermediate', 4, 1000),
  advanced('advanced', 'Advanced', 5, 1500),
  master('master', 'Master', 6, 2500);

  const MandarinLevel(this.id, this.label, this.rank, this.vocabularyBase);
  final String id;
  final String label;
  final int rank;
  final int vocabularyBase;

  static MandarinLevel fromId(String id) => values.firstWhere(
    (level) => level.id == id,
    orElse: () => MandarinLevel.newbie,
  );
}

class StoryCatalogEntry {
  const StoryCatalogEntry({
    required this.id,
    required this.title,
    required this.englishTitle,
    required this.summary,
    required this.level,
    required this.topic,
    required this.minutes,
    required this.blockCount,
    required this.path,
    required this.glyph,
    required this.colors,
  });

  final String id;
  final String title;
  final String englishTitle;
  final String summary;
  final MandarinLevel level;
  final String topic;
  final int minutes;
  final int blockCount;
  final String path;
  final String glyph;
  final List<String> colors;

  factory StoryCatalogEntry.fromJson(Map<String, dynamic> json) =>
      StoryCatalogEntry(
        id: json['id'] as String,
        title: json['title'] as String,
        englishTitle: json['englishTitle'] as String,
        summary: json['summary'] as String? ?? '',
        level: MandarinLevel.fromId(json['level'] as String),
        topic: json['topic'] as String? ?? 'Story',
        minutes: (json['minutes'] as num?)?.toInt() ?? 4,
        blockCount: (json['blockCount'] as num?)?.toInt() ?? 0,
        path: json['path'] as String,
        glyph: json['glyph'] as String? ?? '读',
        colors: (json['colors'] as List<dynamic>? ?? ['#D7482F', '#8E2F21'])
            .cast<String>(),
      );
}

class StoryDocument {
  const StoryDocument({
    required this.schemaVersion,
    required this.id,
    required this.title,
    required this.pinyinTitle,
    required this.englishTitle,
    required this.summary,
    required this.level,
    required this.topic,
    required this.minutes,
    required this.voices,
    required this.blocks,
  });

  final int schemaVersion;
  final String id;
  final String title;
  final String pinyinTitle;
  final String englishTitle;
  final String summary;
  final MandarinLevel level;
  final String topic;
  final int minutes;
  final List<CharacterVoice> voices;
  final List<StoryBlock> blocks;

  factory StoryDocument.fromJson(Map<String, dynamic> json) => StoryDocument(
    schemaVersion: (json['schemaVersion'] as num?)?.toInt() ?? 1,
    id: json['id'] as String,
    title: json['title'] as String,
    pinyinTitle: json['pinyinTitle'] as String? ?? '',
    englishTitle: json['englishTitle'] as String,
    summary: json['summary'] as String? ?? '',
    level: MandarinLevel.fromId(json['level'] as String),
    topic: json['topic'] as String? ?? 'Story',
    minutes: (json['minutes'] as num?)?.toInt() ?? 4,
    voices: (json['voices'] as List<dynamic>? ?? [])
        .map((item) => CharacterVoice.fromJson(item as Map<String, dynamic>))
        .toList(),
    blocks: (json['blocks'] as List<dynamic>? ?? [])
        .map((item) => StoryBlock.fromJson(item as Map<String, dynamic>))
        .toList(),
  );

  String audioAsset(StoryBlock block) =>
      'assets/content/stories/$id/${block.audio.path}';
}

class CharacterVoice {
  const CharacterVoice({
    required this.id,
    required this.name,
    required this.speaker,
  });
  final String id;
  final String name;
  final String speaker;

  factory CharacterVoice.fromJson(Map<String, dynamic> json) => CharacterVoice(
    id: json['id'] as String,
    name: json['name'] as String,
    speaker: json['speaker'] as String,
  );
}

class StoryBlock {
  const StoryBlock({
    required this.id,
    required this.kind,
    required this.speakerId,
    required this.hanzi,
    required this.traditional,
    required this.pinyin,
    required this.translation,
    required this.tokens,
    required this.audio,
  });

  final String id;
  final String kind;
  final String speakerId;
  final String hanzi;
  final String? traditional;
  final String pinyin;
  final String translation;
  final List<StoryToken> tokens;
  final StoryAudio audio;

  factory StoryBlock.fromJson(Map<String, dynamic> json) => StoryBlock(
    id: json['id'] as String,
    kind: json['kind'] as String? ?? 'narration',
    speakerId: json['speakerId'] as String? ?? 'narrator',
    hanzi: json['hanzi'] as String,
    traditional: json['traditional'] as String?,
    pinyin: json['pinyin'] as String? ?? '',
    translation: json['translation'] as String? ?? '',
    tokens: (json['tokens'] as List<dynamic>? ?? [])
        .map((item) => StoryToken.fromJson(item as Map<String, dynamic>))
        .toList(),
    audio: StoryAudio.fromJson(json['audio'] as Map<String, dynamic>? ?? {}),
  );
}

class StoryToken {
  const StoryToken({
    required this.text,
    required this.pinyin,
    required this.gloss,
    required this.difficulty,
    required this.focus,
  });

  final String text;
  final String pinyin;
  final String gloss;
  final int difficulty;
  final bool focus;
  bool get isLexical => pinyin.isNotEmpty || gloss.isNotEmpty;

  factory StoryToken.fromJson(Map<String, dynamic> json) => StoryToken(
    text: json['text'] as String,
    pinyin: json['pinyin'] as String? ?? '',
    gloss: json['gloss'] as String? ?? '',
    difficulty: (json['difficulty'] as num?)?.toInt() ?? 1,
    focus: json['focus'] as bool? ?? false,
  );
}

class StoryAudio {
  const StoryAudio({required this.path, required this.durationMs});
  final String path;
  final int durationMs;

  factory StoryAudio.fromJson(Map<String, dynamic> json) => StoryAudio(
    path: json['path'] as String? ?? '',
    durationMs: (json['durationMs'] as num?)?.toInt() ?? 0,
  );
}

class SavedWord {
  const SavedWord({
    required this.text,
    required this.pinyin,
    required this.gloss,
    required this.storyId,
    required this.storyTitle,
    required this.blockId,
  });

  final String text;
  final String pinyin;
  final String gloss;
  final String storyId;
  final String storyTitle;
  final String blockId;
  String get key => '$storyId::$blockId::$text';

  Map<String, dynamic> toJson() => {
    'text': text,
    'pinyin': pinyin,
    'gloss': gloss,
    'storyId': storyId,
    'storyTitle': storyTitle,
    'blockId': blockId,
  };

  factory SavedWord.fromJson(Map<String, dynamic> json) => SavedWord(
    text: json['text'] as String,
    pinyin: json['pinyin'] as String? ?? '',
    gloss: json['gloss'] as String? ?? '',
    storyId: json['storyId'] as String,
    storyTitle: json['storyTitle'] as String,
    blockId: json['blockId'] as String,
  );
}

Map<String, dynamic> decodeObject(String source) =>
    jsonDecode(source) as Map<String, dynamic>;
