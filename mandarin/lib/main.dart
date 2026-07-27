import 'package:flutter/material.dart';

import 'screens/library_screen.dart';
import 'services/story_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MandarinReaderApp());
}

class MandarinReaderApp extends StatelessWidget {
  const MandarinReaderApp({
    super.key,
    this.repository = const StoryRepository(),
  });

  final StoryRepository repository;

  static const ink = Color(0xFF17211B);
  static const jade = Color(0xFF286B55);
  static const paper = Color(0xFFF6F3EA);

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: jade,
      brightness: Brightness.light,
      surface: const Color(0xFFFFFDF8),
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Mandarin Reader',
      theme: ThemeData(
        colorScheme: colorScheme,
        scaffoldBackgroundColor: paper,
        fontFamily: 'Georgia',
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          foregroundColor: ink,
          surfaceTintColor: Colors.transparent,
        ),
        cardTheme: const CardThemeData(
          color: Color(0xFFFFFDF8),
          elevation: 0,
          margin: EdgeInsets.zero,
        ),
      ),
      home: LibraryScreen(repository: repository),
    );
  }
}
