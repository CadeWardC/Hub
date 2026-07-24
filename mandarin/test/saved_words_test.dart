import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/services/saved_words_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('toggle saves and removes a word', () async {
    final saved = await SavedWordsStore.toggle(
      text: '猫',
      pinyin: 'māo',
      english: 'cat',
      storyId: 'story-1',
    );
    expect(saved, isTrue);
    expect(await SavedWordsStore.savedTexts(), {'猫'});

    final savedAgain = await SavedWordsStore.toggle(
      text: '猫',
      pinyin: 'māo',
      english: 'cat',
      storyId: 'story-1',
    );
    expect(savedAgain, isFalse);
    expect(await SavedWordsStore.savedTexts(), isEmpty);
  });

  test('new words are due immediately and promote through boxes', () async {
    await SavedWordsStore.toggle(
      text: '狗',
      pinyin: 'gǒu',
      english: 'dog',
      storyId: 'story-1',
    );
    var words = await SavedWordsStore.load();
    expect(SavedWordsStore.dueWords(words), hasLength(1));

    final now = DateTime(2026, 7, 24);
    var word = words.single;
    word = await SavedWordsStore.review(word, correct: true, now: now);
    expect(word.box, 1);
    expect(word.dueAt, now.add(const Duration(days: 1)));

    word = await SavedWordsStore.review(word, correct: true, now: now);
    expect(word.box, 2);
    expect(word.dueAt, now.add(const Duration(days: 2)));

    word = await SavedWordsStore.review(word, correct: false, now: now);
    expect(word.box, 0);
    expect(word.dueAt, now);

    words = await SavedWordsStore.load();
    expect(words.single.box, 0);
  });

  test('due filter excludes future words', () async {
    await SavedWordsStore.toggle(
      text: '鱼',
      pinyin: 'yú',
      english: 'fish',
      storyId: 'story-1',
    );
    final now = DateTime(2026, 7, 24);
    final word = (await SavedWordsStore.load()).single;
    await SavedWordsStore.review(word, correct: true, now: now);
    final words = await SavedWordsStore.load();
    expect(SavedWordsStore.dueWords(words, now: now), isEmpty);
    expect(
      SavedWordsStore.dueWords(words, now: now.add(const Duration(days: 1))),
      hasLength(1),
    );
  });
}
