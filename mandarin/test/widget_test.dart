import 'package:flutter_test/flutter_test.dart';
import 'package:mandarin_reader/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows the graded story library', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MandarinReaderApp());
    await tester.pumpAndSettle();

    expect(find.text('Read a little.\nUnderstand a lot.'), findsOneWidget);
    expect(find.text('一杯热茶'), findsOneWidget);
    expect(find.text('A Cup of Hot Tea'), findsOneWidget);
  });
}
