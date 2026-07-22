import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/app.dart';
import 'package:mandarin_reader/providers/app_providers.dart';
import 'package:mandarin_reader/screens/reader_screen.dart';
import 'package:mandarin_reader/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_fixtures.dart';

void main() {
  testWidgets('library shell renders', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const MandarinReaderApp(),
      ),
    );
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Stories that meet you where you are.'), findsOneWidget);
    expect(find.text('Library'), findsOneWidget);
    expect(find.text('Saved words'), findsOneWidget);
  });

  testWidgets('lesson is paged, flowing, and supports hold-to-peek', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final story = pagedTestStory();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(preferences),
          storyProvider('red-umbrella').overrideWith((ref) async => story),
        ],
        child: MaterialApp(
          theme: buildAppTheme(),
          home: const ReaderScreen(storyId: 'red-umbrella'),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('1/3'), findsOneWidget);
    expect(find.byTooltip('Play section'), findsOneWidget);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('今天'), findsOneWidget);

    final gesture = await tester.startGesture(
      tester.getCenter(find.text('今天')),
    );
    await tester.pump(kLongPressTimeout + const Duration(milliseconds: 100));
    expect(find.textContaining('Release to return'), findsOneWidget);
    await gesture.up();
    await tester.pump();
    expect(find.textContaining('Release to return'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
