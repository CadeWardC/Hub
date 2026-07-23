import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/story.dart';

class StoryRepository {
  const StoryRepository();

  static const indexAsset = 'assets/content/index.json';

  Future<List<StorySummary>> loadLibrary() async {
    final raw = await rootBundle.loadString(indexAsset);
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return (json['stories'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(StorySummary.fromJson)
        .toList(growable: false);
  }

  Future<Story> loadStory(StorySummary summary) async {
    final raw = await rootBundle.loadString(summary.path);
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return Story.fromJson(json, assetPath: summary.path);
  }
}
