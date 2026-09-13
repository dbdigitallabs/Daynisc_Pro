import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'login_screen.dart';
import 'scan_screen.dart';
import 'barcode_scanner_screen.dart';
import 'stub_screens.dart';

// ── Route constants ────────────────────────────────────────────────────────────

class Routes {
  static const login = '/login';
  static const scan = '/scan';
  static const barcodeScan = '/barcode-scan';
  static const extractionReview = '/scan/review/:id';
  // Fallbacks / aliases pointing to scan or login
  static const dashboard = '/scan';
  static const otp = '/login';
  static const stock = '/scan';
  static const stockMovement = '/scan';
  static const production = '/scan';
  static const productionOrder = '/scan';
  static const sales = '/scan';
  static const invoice = '/scan';
  static const purchase = '/scan';
  static const dispatch = '/scan';
  static const ledger = '/scan';
  static const profile = '/scan';
}

// ── Router provider ────────────────────────────────────────────────────────────

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: _isLoggedIn() ? Routes.scan : Routes.login,
    redirect: (context, state) {
      final loggedIn = _isLoggedIn();
      final onAuthRoute = state.matchedLocation == Routes.login;
      if (!loggedIn && !onAuthRoute) return Routes.login;
      if (loggedIn && onAuthRoute) return Routes.scan;
      return null;
    },
    routes: [
      // ── Auth ─────────────────────────────────────────────────────────────
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),

      // ── Dedicated Mobile Document Scanner / Upload Screen ────────────────
      GoRoute(
        path: Routes.scan,
        builder: (_, __) => const ScanScreen(),
        routes: [
          GoRoute(
            path: 'review/:id',
            builder: (_, state) =>
                ExtractionReviewScreen(extractionId: state.pathParameters['id']!),
          ),
        ],
      ),

      // ── Barcode Scanner to Add Items ─────────────────────────────────────
      GoRoute(
        path: Routes.barcodeScan,
        builder: (_, __) => const BarcodeScannerScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Page not found: ${state.uri}'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.go(Routes.scan),
              child: const Text('Go to Scanner'),
            ),
          ],
        ),
      ),
    ),
  );
});

bool _isLoggedIn() {
  final box = Hive.box('auth');
  return box.get('access_token') != null;
}
