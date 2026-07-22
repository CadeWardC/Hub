import 'package:flutter/material.dart';

const ink = Color(0xFF252421);
const paper = Color(0xFFF7F2E8);
const cinnabar = Color(0xFFD7482F);
const jade = Color(0xFF2F7464);
const gold = Color(0xFFE8B44F);

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
