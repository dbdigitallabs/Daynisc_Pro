import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'theme.dart';
import 'app_router.dart';
import 'api_client.dart';

// ── Models ────────────────────────────────────────────────────────────────────

class ProductionOrderSummary {
  final String id;
  final String orderNumber;
  final String finishedName;
  final double plannedQty;
  final double? actualQty;
  final String status;
  final String plannedDate;
  final String? shift;

  const ProductionOrderSummary({
    required this.id,
    required this.orderNumber,
    required this.finishedName,
    required this.plannedQty,
    this.actualQty,
    required this.status,
    required this.plannedDate,
    this.shift,
  });

  factory ProductionOrderSummary.fromJson(Map<String, dynamic> json) =>
      ProductionOrderSummary(
        id: json['id'] ?? '',
        orderNumber: json['order_number'] ?? '',
        finishedName: json['finished_name'] ?? '',
        plannedQty: (json['planned_qty'] as num?)?.toDouble() ?? 0,
        actualQty: (json['actual_qty'] as num?)?.toDouble(),
        status: json['status'] ?? 'planned',
        plannedDate: json['planned_date'] ?? '',
        shift: json['shift'],
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────

final productionOrdersProvider =
    FutureProvider<List<ProductionOrderSummary>>((ref) async {
  final dio = ref.watch(_dioProvider);
  final resp = await dio.get('/production/orders', queryParameters: {'limit': 30});
  final items = (resp.data['items'] as List?) ?? [];
  return items
      .map((j) => ProductionOrderSummary.fromJson(j as Map<String, dynamic>))
      .toList();
});

final _dioProvider = Provider<Dio>((_) => ApiClient().dio);

// ── Main Screen ───────────────────────────────────────────────────────────────

class ProductionScreen extends ConsumerStatefulWidget {
  const ProductionScreen({super.key});

  @override
  ConsumerState<ProductionScreen> createState() => _ProductionScreenState();
}

class _ProductionScreenState extends ConsumerState<ProductionScreen> {
  String _statusFilter = '';

  static const _statusColors = {
    'planned': AppColors.textMuted,
    'in_progress': AppColors.cyan,
    'completed': AppColors.success,
    'on_hold': AppColors.amber,
    'cancelled': AppColors.error,
  };

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(productionOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.inkDark,
      appBar: AppBar(
        title: const Text('Production'),
        backgroundColor: AppColors.steelDark,
      ),
      body: Column(
        children: [
          // Status filter chips
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                '',
                'planned',
                'in_progress',
                'completed',
                'on_hold',
              ].map((s) {
                final isSelected = _statusFilter == s;
                final color = _statusColors[s] ?? AppColors.cyan;
                return GestureDetector(
                  onTap: () => setState(() => _statusFilter = s),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSelected ? color.withAlpha((0.12 * 255).round()) : AppColors.cardDark,
                      borderRadius: AppRadius.full,
                      border: Border.all(
                        color: isSelected ? color : AppColors.borderDark,
                      ),
                    ),
                    child: Text(
                      s.isEmpty ? 'All' : s.replaceAll('_', ' ').toUpperCase(),
                      style: AppTextStyles.monoSmall.copyWith(
                        color: isSelected ? color : AppColors.textMuted,
                        fontSize: 10,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Orders list
          Expanded(
            child: ordersAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.amber),
              ),
              error: (e, _) => Center(
                child: Text(e.toString(), style: AppTextStyles.bodySmall),
              ),
              data: (orders) {
                final filtered = _statusFilter.isEmpty
                    ? orders
                    : orders
                        .where((o) => o.status == _statusFilter)
                        .toList();
                return filtered.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('🏭', style: TextStyle(fontSize: 48)),
                            SizedBox(height: 12),
                            Text('No production orders',
                                style: AppTextStyles.bodySmall),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => ref.refresh(productionOrdersProvider.future),
                        color: AppColors.amber,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (ctx, i) =>
                              _OrderCard(order: filtered[i]),
                        ),
                      );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Order Card ────────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final ProductionOrderSummary order;
  const _OrderCard({required this.order});

  static const _statusColors = {
    'planned': AppColors.textMuted,
    'in_progress': AppColors.cyan,
    'completed': AppColors.success,
    'on_hold': AppColors.amber,
    'cancelled': AppColors.error,
  };

  @override
  Widget build(BuildContext context) {
    final statusColor =
        _statusColors[order.status] ?? AppColors.textMuted;
    final efficiency = order.actualQty != null && order.plannedQty > 0
        ? (order.actualQty! / order.plannedQty * 100)
        : null;

    return GestureDetector(
      onTap: () => context.push('${Routes.production}/order/${order.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: AppRadius.md,
          border: Border.all(color: AppColors.borderDark),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(order.orderNumber,
                          style: AppTextStyles.monoSmall
                              .copyWith(color: AppColors.cyan)),
                      const SizedBox(height: 2),
                      Text(order.finishedName,
                          style: AppTextStyles.cardTitle),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha((0.1 * 255).round()),
                    borderRadius: AppRadius.full,
                    border: Border.all(
                        color: statusColor.withAlpha((0.3 * 255).round())),
                  ),
                  child: Text(
                    order.status.replaceAll('_', ' ').toUpperCase(),
                    style: AppTextStyles.monoSmall.copyWith(
                      color: statusColor, fontSize: 9, letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                _Stat(
                  label: 'PLANNED',
                  value: '${order.plannedQty.toStringAsFixed(0)} KG',
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 20),
                if (order.actualQty != null)
                  _Stat(
                    label: 'ACTUAL',
                    value: '${order.actualQty!.toStringAsFixed(0)} KG',
                    color: AppColors.green,
                  ),
                const Spacer(),
                if (efficiency != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: efficiency >= 90
                          ? AppColors.success.withAlpha((0.1 * 255).round())
                          : AppColors.amber.withAlpha((0.1 * 255).round()),
                      borderRadius: AppRadius.full,
                    ),
                    child: Text(
                      '${efficiency.toStringAsFixed(1)}% eff.',
                      style: AppTextStyles.monoSmall.copyWith(
                        color: efficiency >= 90
                            ? AppColors.success
                            : AppColors.amber,
                        fontSize: 10,
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today,
                    size: 12, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(order.plannedDate,
                    style: AppTextStyles.monoSmall),
                if (order.shift != null) ...[
                  const SizedBox(width: 12),
                  const Icon(Icons.access_time,
                      size: 12, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text('Shift ${order.shift}',
                      style: AppTextStyles.monoSmall),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: AppTextStyles.label.copyWith(fontSize: 8)),
        Text(value,
            style: AppTextStyles.mono.copyWith(
                color: color, fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// placeholder screens for routes that need them
class ProductionOrderScreen extends ConsumerWidget {
  final String orderId;
  const ProductionOrderScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text('Order $orderId')),
      body: const Center(child: Text('Production order details')),
    );
  }
}
