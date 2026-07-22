import 'dart:convert';

import 'package:mandarin_reader/models/story.dart';

const storyJson = '''
{
  "schemaVersion": 1,
  "id": "test-story",
  "title": "小故事",
  "pinyinTitle": "xiǎo gùshi",
  "englishTitle": "Small Story",
  "summary": "A test story.",
  "level": "newbie",
  "topic": "Test",
  "minutes": 2,
  "voices": [{"id":"narrator","name":"Narrator","speaker":"Vivian"}],
  "blocks": [{
    "id": "b001",
    "kind": "narration",
    "speakerId": "narrator",
    "hanzi": "你好。",
    "traditional": null,
    "pinyin": "nǐ hǎo",
    "translation": "Hello.",
    "tokens": [
      {"text":"你好","pinyin":"nǐ hǎo","gloss":"hello","difficulty":1,"focus":true},
      {"text":"。","pinyin":"","gloss":"","difficulty":0,"focus":false}
    ],
    "audio": {"path":"audio/b001.mp3","durationMs":1200}
  }]
}
''';

StoryDocument testStory() =>
    StoryDocument.fromJson(jsonDecode(storyJson) as Map<String, dynamic>);
