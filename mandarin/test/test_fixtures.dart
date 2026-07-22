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

const pagedStoryJson = '''
{
  "schemaVersion": 1,
  "id": "red-umbrella",
  "title": "红雨伞",
  "pinyinTitle": "hóng yǔsǎn",
  "englishTitle": "The Red Umbrella",
  "summary": "A tiny rainy-day story.",
  "level": "newbie",
  "topic": "Daily life",
  "minutes": 2,
  "voices": [{"id":"narrator","name":"Narrator","speaker":"Vivian"}],
  "blocks": [
    {
      "id": "b001",
      "kind": "narration",
      "speakerId": "narrator",
      "section": 1,
      "hanzi": "今天下雨。",
      "pinyin": "jīntiān xiàyǔ",
      "translation": "It is raining today.",
      "tokens": [
        {"text":"今天","pinyin":"jīntiān","gloss":"today","difficulty":1,"focus":true},
        {"text":"下雨","pinyin":"xiàyǔ","gloss":"to rain","difficulty":1,"focus":false},
        {"text":"。","pinyin":"","gloss":"","difficulty":0,"focus":false}
      ],
      "audio": {"path":"audio/b001.mp3","durationMs":1200}
    },
    {
      "id": "b002",
      "kind": "narration",
      "speakerId": "narrator",
      "section": 2,
      "hanzi": "我有一把红伞。",
      "pinyin": "wǒ yǒu yì bǎ hóng sǎn",
      "translation": "I have a red umbrella.",
      "tokens": [
        {"text":"我","pinyin":"wǒ","gloss":"I; me","difficulty":1,"focus":false},
        {"text":"有","pinyin":"yǒu","gloss":"to have","difficulty":1,"focus":false},
        {"text":"一把","pinyin":"yì bǎ","gloss":"one (for handled objects)","difficulty":1,"focus":false},
        {"text":"红伞","pinyin":"hóng sǎn","gloss":"red umbrella","difficulty":1,"focus":true},
        {"text":"。","pinyin":"","gloss":"","difficulty":0,"focus":false}
      ],
      "audio": {"path":"audio/b002.mp3","durationMs":1300}
    },
    {
      "id": "b003",
      "kind": "narration",
      "speakerId": "narrator",
      "section": 3,
      "hanzi": "我们一起走。",
      "pinyin": "wǒmen yìqǐ zǒu",
      "translation": "We walk together.",
      "tokens": [
        {"text":"我们","pinyin":"wǒmen","gloss":"we; us","difficulty":1,"focus":false},
        {"text":"一起","pinyin":"yìqǐ","gloss":"together","difficulty":1,"focus":true},
        {"text":"走","pinyin":"zǒu","gloss":"to walk","difficulty":1,"focus":false},
        {"text":"。","pinyin":"","gloss":"","difficulty":0,"focus":false}
      ],
      "audio": {"path":"audio/b003.mp3","durationMs":1100}
    }
  ]
}
''';

StoryDocument pagedTestStory() =>
    StoryDocument.fromJson(jsonDecode(pagedStoryJson) as Map<String, dynamic>);
