import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/story_repository.dart';

import 'test_fixtures.dart';

class MemoryBundle extends CachingAssetBundle {
  MemoryBundle(this.assets);
  final Map<String, String> assets;

  @override
  Future<ByteData> load(String key) async {
    final bytes = Uint8List.fromList(utf8.encode(assets[key]!));
    return ByteData.sublistView(bytes);
  }
}

void main() {
  test(
    'repository loads catalog and story through the asset contract',
    () async {
      final catalog = jsonEncode({
        'stories': [
          {
            'id': 'test-story',
            'title': '小故事',
            'englishTitle': 'Small Story',
            'level': 'newbie',
            'path': 'assets/content/stories/test-story/story.json',
          },
        ],
      });
      final repository = StoryRepository(
        bundle: MemoryBundle({
          'assets/content/catalog.json': catalog,
          'assets/content/stories/test-story/story.json': storyJson,
        }),
      );

      expect((await repository.loadCatalog()).single.id, 'test-story');
      expect(
        (await repository.loadStory('test-story')).blocks.single.hanzi,
        '你好。',
      );
    },
  );
}
