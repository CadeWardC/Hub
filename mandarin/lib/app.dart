import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/library_screen.dart';
import 'screens/reader_screen.dart';
import 'screens/saved_words_screen.dart';
import 'screens/settings_screen.dart';
import 'theme.dart';

class MandarinReaderApp extends ConsumerWidget {
  const MandarinReaderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: '声场 Mandarin Reader',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    routes: [
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const LibraryScreen(),
          ),
          GoRoute(
            path: '/saved',
            builder: (context, state) => const SavedWordsScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/story/:storyId',
            builder: (context, state) =>
                ReaderScreen(storyId: state.pathParameters['storyId']!),
          ),
        ],
      ),
    ],
  );
});

class AppShell extends StatelessWidget {
  const AppShell({required this.location, required this.child, super.key});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isReader = location.startsWith('/story/');
    final selected = location == '/saved'
        ? 1
        : location == '/settings'
        ? 2
        : 0;
    return Scaffold(
      body: child,
      bottomNavigationBar: isReader
          ? null
          : NavigationBar(
              selectedIndex: selected,
              onDestinationSelected: (index) {
                if (index == 0) context.go('/');
                if (index == 1) context.go('/saved');
                if (index == 2) context.go('/settings');
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.auto_stories_outlined),
                  selectedIcon: Icon(Icons.auto_stories),
                  label: 'Library',
                ),
                NavigationDestination(
                  icon: Icon(Icons.bookmark_border_rounded),
                  selectedIcon: Icon(Icons.bookmark_rounded),
                  label: 'Saved words',
                ),
                NavigationDestination(
                  icon: Icon(Icons.tune_rounded),
                  label: 'Settings',
                ),
              ],
            ),
    );
  }
}
