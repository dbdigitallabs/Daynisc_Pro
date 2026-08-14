import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'login_screen.dart';
import 'dashboard_screen.dart';
import 'scan_screen.dart';
import 'production_screen.dart';
import 'inventory_screen.dart';
import 'stub_screens.dart';
import 'shell_scaffold.dart';
import 'profile_screen.dart';

// ── Route constants ────────────────────────────────────────────────────────────

class Routes {
  static const login = '/login';
  static const otp = '/otp';
  static const dashboard = '/dashboard';
  static const scan = '/scan';
  static const extractionReview = '/scan/review/:id';
  static const stock = '/inventory';
  static const stockMovement = '/inventory/movement';
  static const production = '/production';
  static const productionOrder = '/production/order/:id';
  static const sales = '/sales';
  static const invoice = '/sales/invoice/:id';
  static const purchase = '/purchase';
  static const dispatch = '/transport';
  static const ledger = '/accounting';
  static const profile = '/profile';
}

// ── Router provider ────────────────────────────────────────────────────────────

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: _isLoggedIn() ? Routes.dashboard : Routes.login,
    redirect: (context, state) {
      final loggedIn = _isLoggedIn();
      final onAuthRoute = state.matchedLocation == Routes.login;
      if (!loggedIn && !onAuthRoute) return Routes.login;
      if (loggedIn && onAuthRoute) return Routes.dashboard;
      return null;
    },
    routes: [
      // ── Auth (no shell) ──────────────────────────────────────────────────
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),

      // ── Main app with bottom nav shell ───────────────────────────────────

      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: Routes.dashboard,
            builder: (_, __) => const DashboardScreen(),
          ),
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
          GoRoute(
            path: Routes.stock,
            builder: (_, __) => const StockScreen(),
            routes: [
              GoRoute(
                path: 'movement',
                builder: (_, __) => const StockMovementScreen(),
              ),
            ],
          ),
          GoRoute(
            path: Routes.production,
            builder: (_, __) => const ProductionScreen(),
            routes: [
              GoRoute(
                path: 'order/:id',
                builder: (_, state) =>
                    ProductionOrderScreen(orderId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: Routes.sales,
            builder: (_, __) => const SalesScreen(),
            routes: [
              GoRoute(
                path: 'invoice/:id',
                builder: (_, state) =>
                    InvoiceScreen(invoiceId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: Routes.purchase, builder: (_, __) => const PurchaseScreen()),
          GoRoute(path: Routes.dispatch, builder: (_, __) => const DispatchScreen()),
          GoRoute(path: Routes.ledger, builder: (_, __) => const LedgerScreen()),
          GoRoute(path: Routes.profile, builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Route not found: ${state.uri}')),
    ),
  );
});

bool _isLoggedIn() {
  final box = Hive.box('auth');
  return box.get('access_token') != null;
}
