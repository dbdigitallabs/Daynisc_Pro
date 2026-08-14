import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';
import 'app_router.dart';

class ShellScaffold extends ConsumerWidget {
  final Widget child;
  const ShellScaffold({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_outlined,        label: 'Dashboard',  route: Routes.dashboard),
    (icon: Icons.document_scanner_outlined, label: 'Scan',       route: Routes.scan),
    (icon: Icons.inventory_2_outlined,      label: 'Inventory',  route: Routes.stock),
    (icon: Icons.factory_outlined,          label: 'Production', route: Routes.production),
    (icon: Icons.receipt_long_outlined,     label: 'Sales',      route: Routes.sales),
    (icon: Icons.person_outline,            label: 'Profile',    route: Routes.profile),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    int currentIdx = _tabs.indexWhere((t) => location.startsWith(t.route));
    if (currentIdx == -1) currentIdx = 0;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.cardBg,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          backgroundColor: AppColors.cardBg,
          indicatorColor: AppColors.primaryBg,
          selectedIndex: currentIdx,
          onDestinationSelected: (i) => context.go(_tabs[i].route),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          height: 64,
          destinations: _tabs.map((t) => NavigationDestination(
            icon: Icon(t.icon, color: AppColors.text3, size: 22),
            selectedIcon: Icon(t.icon, color: AppColors.primary, size: 22),
            label: t.label,
          )).toList(),
        ),
      ),
    );
  }
}
