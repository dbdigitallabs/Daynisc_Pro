import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';
import 'app_router.dart';

class ShellScaffold extends ConsumerWidget {
  final Widget child;
  const ShellScaffold({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.home_outlined,            label: 'Home',        route: Routes.dashboard),
    (icon: Icons.account_balance_outlined, label: 'Bank',        route: Routes.bank),
    (icon: Icons.menu_book_outlined,       label: 'Accounting',  route: Routes.accounting),
    (icon: Icons.inventory_2_outlined,     label: 'Inventory',   route: Routes.stock),
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
