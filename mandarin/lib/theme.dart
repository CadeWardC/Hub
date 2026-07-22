import 'package:flutter/material.dart';

import 'models/story.dart';

const ink = Color(0xFF252421);
const paper = Color(0xFFF7F2E8);
const cinnabar = Color(0xFFD7482F);
const jade = Color(0xFF2F7464);
const gold = Color(0xFFE8B44F);

class LevelPalette {
  const LevelPalette({
    required this.primary,
    required this.deep,
    required this.soft,
    required this.highlight,
  });

  final Color primary;
  final Color deep;
  final Color soft;
  final Color highlight;

  LinearGradient get gradient => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, deep],
  );
}

LevelPalette levelPalette(MandarinLevel level) => switch (level) {
  MandarinLevel.newbie => const LevelPalette(
    primary: Color(0xFFE75D45),
    deep: Color(0xFF9F2F27),
    soft: Color(0xFFFFE3DA),
    highlight: Color(0xFFFFB39F),
  ),
  MandarinLevel.elementary => const LevelPalette(
    primary: Color(0xFFE5962D),
    deep: Color(0xFF9E571E),
    soft: Color(0xFFFFEBCB),
    highlight: Color(0xFFFFC86D),
  ),
  MandarinLevel.intermediate => const LevelPalette(
    primary: Color(0xFF2F9B86),
    deep: Color(0xFF176456),
    soft: Color(0xFFD8F1E9),
    highlight: Color(0xFF83D4C1),
  ),
  MandarinLevel.upperIntermediate => const LevelPalette(
    primary: Color(0xFF377FC4),
    deep: Color(0xFF245184),
    soft: Color(0xFFDCEBFA),
    highlight: Color(0xFF89BCEB),
  ),
  MandarinLevel.advanced => const LevelPalette(
    primary: Color(0xFF7655B7),
    deep: Color(0xFF493276),
    soft: Color(0xFFEAE1FA),
    highlight: Color(0xFFB9A0E8),
  ),
  MandarinLevel.master => const LevelPalette(
    primary: Color(0xFFBA496E),
    deep: Color(0xFF6E2944),
    soft: Color(0xFFF6DCE6),
    highlight: Color(0xFFE99BB5),
  ),
};

ThemeData buildAppTheme() {
  final scheme =
      ColorScheme.fromSeed(
        seedColor: cinnabar,
        brightness: Brightness.light,
        surface: paper,
      ).copyWith(
        primary: cinnabar,
        secondary: jade,
        tertiary: gold,
        onSurface: ink,
      );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: paper,
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -2),
      displayMedium: TextStyle(
        fontWeight: FontWeight.w800,
        letterSpacing: -1.5,
      ),
      headlineMedium: TextStyle(fontWeight: FontWeight.w800),
      titleLarge: TextStyle(fontWeight: FontWeight.w800),
      bodyLarge: TextStyle(height: 1.55),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white.withValues(alpha: .72),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0x1F4A4037)),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Color(0xFFFFFDF8),
      indicatorColor: Color(0x1FD7482F),
      height: 72,
    ),
  );
}
