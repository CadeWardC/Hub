import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/app.dart';
import 'package:mandarin_reader/providers/app_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
    await tester.pumpAndSettle();

    expect(find.text('Stories that meet you where you are.'), findsOneWidget);
    expect(find.text('Library'), findsOneWidget);
    expect(find.text('Saved words'), findsOneWidget);
  });
}
