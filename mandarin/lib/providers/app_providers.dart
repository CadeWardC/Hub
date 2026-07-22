import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/story.dart';
import '../services/learning_store.dart';
import '../services/reader_audio_controller.dart';
import '../services/story_repository.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw StateError('SharedPreferences was not initialized.'),
);

final storyRepositoryProvider = Provider<StoryRepository>(
  (ref) => StoryRepository(),
);

final catalogProvider = FutureProvider<List<StoryCatalogEntry>>(
  (ref) => ref.watch(storyRepositoryProvider).loadCatalog(),
);

final storyProvider = FutureProvider.family<StoryDocument, String>(
  (ref, id) => ref.watch(storyRepositoryProvider).loadStory(id),
);

final learningProvider =
    StateNotifierProvider<LearningController, LearningState>(
      (ref) => LearningController(ref.watch(sharedPreferencesProvider)),
    );

final readerAudioProvider = ChangeNotifierProvider<ReaderAudioController>((
  ref,
) {
  return ReaderAudioController();
});
