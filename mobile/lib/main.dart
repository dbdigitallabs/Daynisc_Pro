import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app_router.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait on phones, allow landscape on tablets
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Hive local DB for offline cache
  await Hive.initFlutter();
  await Hive.openBox('auth');
  await Hive.openBox('cache');

  runApp(
    const ProviderScope(
      child: AIERPApp(),
    ),
  );
}

class AIERPApp extends ConsumerWidget {
  const AIERPApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final interTheme = GoogleFonts.interTextTheme(AppTheme.light.textTheme);

    return MaterialApp.router(
      title: 'Daynisc ERP',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light.copyWith(textTheme: interTheme),
      darkTheme: AppTheme.light.copyWith(textTheme: interTheme),
      themeMode: ThemeMode.light,
      routerConfig: router,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.noScaling),
          child: child!,
        );
      },
    );
  }
}
