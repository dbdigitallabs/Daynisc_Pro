import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'theme.dart';
import 'app_router.dart';
import 'kpi_card.dart';
import 'section_header.dart';
import 'dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardDataProvider);

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SafeArea(
        child: dashAsync.when(
          loading: () => const _DashboardSkeleton(),
          error: (e, _) => Center(
            child: Text(e.toString(), style: AppTextStyles.body),
          ),
          data: (data) => RefreshIndicator(
            onRefresh: () => ref.refresh(dashboardDataProvider.future),
            color: AppColors.primary,
            backgroundColor: AppColors.cardBg,
            child: CustomScrollView(
              slivers: [
                // ── Top app bar ──────────────────────────────────────────
                SliverAppBar(
                  pinned: true,
                  backgroundColor: AppColors.cardBg,
                  surfaceTintColor: Colors.transparent,
                  shadowColor: const Color(0x14000000),
                  elevation: 0,
                  scrolledUnderElevation: 1,
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 28, height: 28,
                            decoration: BoxDecoration(
                              color: AppColors.primaryBg,
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: const Icon(Icons.bolt, color: AppColors.primary, size: 18),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Daynisc',
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.text1,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        data.formattedDate,
                        style: AppTextStyles.bodyMuted.copyWith(fontSize: 11),
                      ),
                    ],
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.notifications_outlined, color: AppColors.text2),
                      onPressed: () {},
                      tooltip: 'Notifications',
                    ),
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.primaryBg,
                        child: Text(
                          (data.companyName.isNotEmpty
                              ? data.companyName[0]
                              : 'D'),
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                // ── Company banner ───────────────────────────────────────
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF4361EE), Color(0xFF7C3AED)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: AppRadius.md,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome back!',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: Colors.white70, fontSize: 11,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                data.companyName,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: () => context.go(Routes.scan),
                          icon: const Icon(Icons.document_scanner, size: 15),
                          label: const Text('Scan Bill'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 0,
                            textStyle: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            shape: const RoundedRectangleBorder(
                                borderRadius: AppRadius.sm),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── Quick Actions ────────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: _QuickActions(),
                  ),
                ),

                // ── KPI Cards ────────────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
                    child: const SectionHeader(
                      label: "Today's Summary",
                      icon: Icons.bar_chart_rounded,
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.55,
                    children: [
                      KPICard(
                        label: "TODAY'S SALES",
                        value: '₹${data.todaySales}',
                        icon: Icons.trending_up_rounded,
                        iconColor: AppColors.primary,
                        iconBg: AppColors.primaryBg,
                        delta: data.salesDeltaPct,
                      ),
                      KPICard(
                        label: 'OUTSTANDING',
                        value: '₹${data.outstanding}',
                        icon: Icons.account_balance_wallet_outlined,
                        iconColor: AppColors.amber,
                        iconBg: AppColors.amberBg,
                        deltaIsGood: false,
                      ),
                      KPICard(
                        label: 'STOCK VALUE',
                        value: '₹${data.stockValue}',
                        icon: Icons.inventory_2_outlined,
                        iconColor: AppColors.green,
                        iconBg: AppColors.greenBg,
                      ),
                      KPICard(
                        label: 'PENDING AI',
                        value: data.pendingExtractions.toString(),
                        icon: Icons.document_scanner_outlined,
                        iconColor: AppColors.purple,
                        iconBg: const Color(0xFFF5F3FF),
                        onTap: () => context.go(Routes.scan),
                      ),
                    ],
                  ),
                ),

                // ── Pending Actions ──────────────────────────────────────
                if (data.pendingActions.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
                      child: const SectionHeader(
                        label: 'Pending Actions',
                        icon: Icons.pending_actions_outlined,
                        iconColor: AppColors.red,
                      ),
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => _PendingActionTile(
                        action: data.pendingActions[i],
                      ),
                      childCount: data.pendingActions.length,
                    ),
                  ),
                ],

                // ── Low Stock Alerts ─────────────────────────────────────
                if (data.lowStockItems.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
                      child: const SectionHeader(
                        label: 'Low Stock Alerts',
                        icon: Icons.warning_amber_rounded,
                        iconColor: AppColors.amber,
                      ),
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => _LowStockTile(item: data.lowStockItems[i]),
                      childCount: data.lowStockItems.length,
                    ),
                  ),
                ],

                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Quick Actions Row ─────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  final _actions = const [
    _QA(icon: Icons.camera_alt_outlined,    label: 'Scan',     color: AppColors.primary,  bg: AppColors.primaryBg, route: Routes.scan),
    _QA(icon: Icons.inventory_outlined,     label: 'Stock',    color: AppColors.green,    bg: AppColors.greenBg,   route: Routes.stock),
    _QA(icon: Icons.factory_outlined,       label: 'Produce',  color: AppColors.amber,    bg: AppColors.amberBg,   route: Routes.production),
    _QA(icon: Icons.local_shipping_outlined,label: 'Dispatch', color: AppColors.info,     bg: Color(0xFFECFEFF),   route: Routes.dispatch),
  ];

  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      decoration: cardDecoration(),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: _actions.map((a) => GestureDetector(
          onTap: () => context.go(a.route),
          child: Column(
            children: [
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(color: a.bg, borderRadius: AppRadius.sm),
                child: Icon(a.icon, color: a.color, size: 24),
              ),
              const SizedBox(height: 7),
              Text(
                a.label,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text2,
                ),
              ),
            ],
          ),
        )).toList(),
      ),
    );
  }
}

class _QA {
  final IconData icon;
  final String label;
  final Color color;
  final Color bg;
  final String route;
  const _QA({
    required this.icon, required this.label,
    required this.color, required this.bg, required this.route,
  });
}

// ── Pending Action Tile ───────────────────────────────────────────────────────

class _PendingActionTile extends StatelessWidget {
  final PendingAction action;
  const _PendingActionTile({required this.action});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: cardDecoration(),
      child: ListTile(
        leading: Container(
          width: 38, height: 38,
          decoration: BoxDecoration(
            color: AppColors.amberBg,
            borderRadius: AppRadius.sm,
          ),
          child: const Icon(Icons.document_scanner_outlined,
              color: AppColors.amber, size: 20),
        ),
        title: Text(action.title, style: AppTextStyles.cardTitle),
        subtitle: Text(action.subtitle, style: AppTextStyles.bodySmall),
        trailing: TextButton(
          onPressed: () => context.go(action.route),
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text('Review',
              style: TextStyle(
                fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w700,
              )),
        ),
      ),
    );
  }
}

// ── Low Stock Tile ────────────────────────────────────────────────────────────

class _LowStockTile extends StatelessWidget {
  final LowStockItem item;
  const _LowStockTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final pct = (item.current / item.reorder).clamp(0.0, 1.0);
    final isLow = pct < 0.25;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(14),
      decoration: cardDecoration(),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: isLow ? AppColors.redBg : AppColors.amberBg,
              borderRadius: AppRadius.sm,
            ),
            child: Icon(
              Icons.warning_amber_rounded,
              color: isLow ? AppColors.red : AppColors.amber,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.itemName, style: AppTextStyles.cardTitle),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: AppRadius.full,
                  child: LinearProgressIndicator(
                    value: pct,
                    backgroundColor: AppColors.border,
                    color: isLow ? AppColors.red : AppColors.amber,
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${item.current} ${item.unit}',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isLow ? AppColors.red : AppColors.amber,
                ),
              ),
              Text(
                'Min: ${item.reorder}',
                style: AppTextStyles.bodyMuted,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(
        color: AppColors.primary,
        strokeWidth: 2.5,
      ),
    );
  }
}
