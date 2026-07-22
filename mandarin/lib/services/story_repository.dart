import 'package:flutter/services.dart';

import '../models/story.dart';

class StoryRepository {
  StoryRepository({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;
  final AssetBundle _bundle;

  Future<List<StoryCatalogEntry>> loadCatalog() async {
    final source = await _bundle.loadString('assets/content/catalog.json');
    final json = decodeObject(source);
    return (json['stories'] as List<dynamic>? ?? [])
        .map((item) => StoryCatalogEntry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<StoryDocument> loadStory(String id) async {
    final catalog = await loadCatalog();
    final entry = catalog.firstWhere((story) => story.id == id);
    final source = await _bundle.loadString(entry.path);
    return StoryDocument.fromJson(decodeObject(source));
  }
}
