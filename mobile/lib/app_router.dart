import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'login_screen.dart';
import 'scan_screen.dart';
import 'barcode_scanner_screen.dart';
import 'stub_screens.dart';
import 'bank_screen.dart';
import 'accounting_screen.dart';
import 'inventory_screen.dart';
import 'shell_scaffold.dart';

// ── Route constants ────────────────────────────────────────────────────────────

class Routes {
  static const login = '/login';
  static const home = '/home';
  static const scan = '/home'; // alias
  static const bank = '/bank';
  static const accounting = '/accounting';
  static const inventory = '/inventory';
  static const barcodeScan = '/barcode-scan';
  static const extractionReview = '/home/review/:id';
  // Fallbacks / aliases pointing to app tabs
  static const dashboard = '/home';
  static const otp = '/login';
  static const stock = '/inventory';
  static const stockMovement = '/inventory';
  static const production = '/home';
  static const productionOrder = '/home';
  static const sales = '/accounting';
  static const invoice = '/accounting';
  static const purchase = '/accounting';
  static const dispatch = '/home';
  static const ledger = '/accounting';
  static const profile = '/home';
}

// ── Router provider ────────────────────────────────────────────────────────────

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: _isLoggedIn() ? Routes.home : Routes.login,
    redirect: (context, state) {
      final loggedIn = _isLoggedIn();
      final onAuthRoute = state.matchedLocation == Routes.login;
      if (!loggedIn && !onAuthRoute) return Routes.login;
      if (loggedIn && onAuthRoute) return Routes.home;
      return null;
    },
    routes: [
      // ── Auth ─────────────────────────────────────────────────────────────
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),

      // ── Main Shell with 4-Tab Navigation Bar ──────────────────────────────
      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          // 1. Home (Document Ingestion & AI Verification)
          GoRoute(
            path: Routes.home,
            builder: (_, __) => const ScanScreen(),
            routes: [
              GoRoute(
                path: 'review/:id',
                builder: (_, state) =>
                    ExtractionReviewScreen(extractionId: state.pathParameters['id']!),
              ),
            ],
          ),

          // 2. Bank (Statements & BRS Automation)
          GoRoute(
            path: Routes.bank,
            builder: (_, __) => const BankScreen(),
          ),

          // 3. Accounting (Vouchers & Tally Prime Sync)
          GoRoute(
            path: Routes.accounting,
            builder: (_, __) => const AccountingScreen(),
          ),

          // 4. Inventory (Stock Items & Barcode Scanner)
          GoRoute(
            path: Routes.inventory,
            builder: (_, __) => const StockScreen(),
          ),
        ],
      ),

      // ── Immersive Barcode Scanner (No bottom bar for camera view) ─────────
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
