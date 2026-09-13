import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:go_router/go_router.dart';
import 'theme.dart';
import 'api_client.dart';
import 'app_router.dart';

// ── Data model ────────────────────────────────────────────────────────────────

class StockItem {
  final String id;
  final String itemName;
  final String category;
  final String unit;
  final String? hsnCode;
  final double gstRate;
  final double reorderLevel;
  final double quantity;
  final double avgRate;
  final double totalValue;

  const StockItem({
    required this.id,
    required this.itemName,
    required this.category,
    required this.unit,
    this.hsnCode,
    required this.gstRate,
    required this.reorderLevel,
    required this.quantity,
    required this.avgRate,
    required this.totalValue,
  });

  factory StockItem.fromJson(Map<String, dynamic> j) => StockItem(
        id:           j['id']?.toString() ?? '',
        itemName:     j['item_name']?.toString() ?? '',
        category:     j['category']?.toString() ?? 'General',
        unit:         j['unit']?.toString() ?? 'PCS',
        hsnCode:      j['hsn_code']?.toString(),
        gstRate:      (j['gst_rate'] as num?)?.toDouble() ?? 0,
        reorderLevel: (j['reorder_level'] as num?)?.toDouble() ?? 0,
        quantity:     (j['quantity'] as num?)?.toDouble() ?? 0,
        avgRate:      (j['avg_rate'] as num?)?.toDouble() ?? 0,
        totalValue:   (j['total_value'] as num?)?.toDouble() ?? 0,
      );

  bool get isLowStock => reorderLevel > 0 && quantity < reorderLevel;
  bool get isOutOfStock => quantity <= 0;
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _searchProvider = StateProvider<String>((ref) => '');
final _lowStockOnlyProvider = StateProvider<bool>((ref) => false);

final stockProvider = FutureProvider.autoDispose
    .family<List<StockItem>, ({String search, bool lowOnly})>(
  (ref, args) async {
    final box = Hive.box('auth');
    final token = box.get('access_token');
    if (token == null) return [];

    final params = <String, dynamic>{'limit': 200};
    if (args.search.isNotEmpty) params['search'] = args.search;
    if (args.lowOnly) params['low_stock_only'] = true;

    try {
      final res = await ApiClient().dio.get(
        '/inventory/stock',
        queryParameters: params,
      );
      final items = (res.data['items'] as List? ?? []);
      return items.map((e) => StockItem.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw (e.error is ApiException)
          ? (e.error as ApiException).message
          : 'Failed to load stock';
    }
  },
);

// ── Screen ────────────────────────────────────────────────────────────────────

class StockScreen extends ConsumerStatefulWidget {
  const StockScreen({super.key});

  @override
  ConsumerState<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends ConsumerState<StockScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final search   = ref.watch(_searchProvider);
    final lowOnly  = ref.watch(_lowStockOnlyProvider);
    final stockAsync = ref.watch(stockProvider((search: search, lowOnly: lowOnly)));

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Inventory'),
        elevation: 0,
        scrolledUnderElevation: 1,
        actions: [
          // Barcode scanner button
          IconButton(
            tooltip: 'Scan Barcode to Add Item',
            icon: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary),
            onPressed: () => context.push(Routes.barcodeScan),
          ),
          // Low stock toggle
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: const Text('Low Stock'),
              selected: lowOnly,
              onSelected: (v) => ref.read(_lowStockOnlyProvider.notifier).state = v,
              selectedColor: AppColors.redBg,
              checkmarkColor: AppColors.red,
              labelStyle: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: lowOnly ? AppColors.red : AppColors.text3,
              ),
              side: BorderSide(color: lowOnly ? AppColors.red : AppColors.border),
              backgroundColor: AppColors.cardBg,
              padding: const EdgeInsets.symmetric(horizontal: 4),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: const Text(
          'Scan Barcode',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
          ),
        ),
        onPressed: () => context.push(Routes.barcodeScan),
      ),
      body: Column(
        children: [
          // ── Quick Barcode Scan Banner ──────────────────────────────────
          Container(
            color: AppColors.cardBg,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: InkWell(
              onTap: () => context.push(Routes.barcodeScan),
              borderRadius: AppRadius.md,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4361EE), Color(0xFF3A0CA3)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: AppRadius.md,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4361EE).withAlpha(50),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(40),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Scan Barcode to Add Item', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                          SizedBox(height: 2),
                          Text('Scan product packaging or barcode stickers', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 14),
                  ],
                ),
              ),
            ),
          ),

          // ── Search bar ──────────────────────────────────────────────────
          Container(
            color: AppColors.cardBg,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) =>
                  ref.read(_searchProvider.notifier).state = v.trim(),
              style: AppTextStyles.body.copyWith(color: AppColors.text1),
              decoration: InputDecoration(
                hintText: 'Search items…',
                prefixIcon: const Icon(Icons.search,
                    color: AppColors.text3, size: 20),
                suffixIcon: search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18,
                            color: AppColors.text3),
                        onPressed: () {
                          _searchCtrl.clear();
                          ref.read(_searchProvider.notifier).state = '';
                        },
                      )
                    : null,
              ),
            ),
          ),

          // ── Stock list ──────────────────────────────────────────────────
          Expanded(
            child: stockAsync.when(
              loading: () => const _StockSkeleton(),
              error: (e, _) => _ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(stockProvider),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return _EmptyState(
                    isFiltered: search.isNotEmpty || lowOnly,
                    onClear: () {
                      _searchCtrl.clear();
                      ref.read(_searchProvider.notifier).state = '';
                      ref.read(_lowStockOnlyProvider.notifier).state = false;
                    },
                  );
                }
                return _StockList(items: items);
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Stock list with KPI header ─────────────────────────────────────────────────

class _StockList extends StatelessWidget {
  final List<StockItem> items;
  const _StockList({required this.items});

  @override
  Widget build(BuildContext context) {
    final totalValue = items.fold(0.0, (s, i) => s + i.totalValue);
    final lowCount   = items.where((i) => i.isLowStock).length;
    final outCount   = items.where((i) => i.isOutOfStock).length;

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {},
      child: CustomScrollView(
        slivers: [
          // ── KPI strip ────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  _KPIChip(
                    label: 'TOTAL ITEMS',
                    value: '${items.length}',
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 10),
                  _KPIChip(
                    label: 'STOCK VALUE',
                    value: '₹${_fmt(totalValue)}',
                    color: AppColors.green,
                  ),
                  const SizedBox(width: 10),
                  _KPIChip(
                    label: 'LOW STOCK',
                    value: '$lowCount',
                    color: AppColors.amber,
                  ),
                  const SizedBox(width: 10),
                  _KPIChip(
                    label: 'OUT',
                    value: '$outCount',
                    color: AppColors.red,
                  ),
                ],
              ),
            ),
          ),

          // ── Item count label ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Text(
                '${items.length} items',
                style: AppTextStyles.label,
              ),
            ),
          ),

          // ── Item rows ─────────────────────────────────────────────────
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _StockItemTile(item: items[i]),
              childCount: items.length,
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  static String _fmt(double v) {
    if (v >= 10000000) return '${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000)   return '${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000)     return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }
}

class _KPIChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _KPIChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: AppRadius.md,
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                  fontFamily: 'Inter', fontSize: 15,
                  fontWeight: FontWeight.w800, color: color,
                )),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                  fontFamily: 'Inter', fontSize: 9,
                  fontWeight: FontWeight.w600, color: AppColors.text3,
                ),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ── Stock item tile ───────────────────────────────────────────────────────────

class _StockItemTile extends StatelessWidget {
  final StockItem item;
  const _StockItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final Color statusColor;
    final String statusLabel;

    if (item.isOutOfStock) {
      statusColor = AppColors.red;
      statusLabel = 'OUT';
    } else if (item.isLowStock) {
      statusColor = AppColors.amber;
      statusLabel = 'LOW';
    } else {
      statusColor = AppColors.green;
      statusLabel = 'OK';
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: cardDecoration(),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
            color: statusColor.withAlpha((0.10 * 255).round()),
            borderRadius: AppRadius.sm,
          ),
          child: Icon(Icons.inventory_2_outlined,
              color: statusColor, size: 22),
        ),
        title: Text(
          item.itemName,
          style: AppTextStyles.cardTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 3),
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha((0.10 * 255).round()),
                    borderRadius: AppRadius.full,
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontFamily: 'Inter', fontSize: 10,
                      fontWeight: FontWeight.w700, color: statusColor,
                    ),
                  ),
                ),
                Text(
                  item.category,
                  style: AppTextStyles.bodyMuted,
                ),
                if (item.hsnCode != null)
                  Text('HSN: ${item.hsnCode}',
                      style: AppTextStyles.bodyMuted),
              ],
            ),
            if (item.reorderLevel > 0) ...[
              const SizedBox(height: 5),
              ClipRRect(
                borderRadius: AppRadius.full,
                child: LinearProgressIndicator(
                  value: item.reorderLevel > 0
                      ? (item.quantity / (item.reorderLevel * 2)).clamp(0, 1)
                      : 1,
                  backgroundColor: AppColors.border,
                  color: statusColor,
                  minHeight: 3,
                ),
              ),
            ],
          ],
        ),
        trailing: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '${item.quantity.toStringAsFixed(item.quantity % 1 == 0 ? 0 : 2)} ${item.unit}',
              style: TextStyle(
                fontFamily: 'Inter', fontSize: 14,
                fontWeight: FontWeight.w800, color: statusColor,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              '₹${item.totalValue.toStringAsFixed(0)}',
              style: AppTextStyles.bodyMuted,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Helper widgets ────────────────────────────────────────────────────────────

class _StockSkeleton extends StatelessWidget {
  const _StockSkeleton();
  @override
  Widget build(BuildContext context) => const Center(
      child: CircularProgressIndicator(
          color: AppColors.primary, strokeWidth: 2.5));
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60, height: 60,
              decoration: const BoxDecoration(
                  color: AppColors.redBg, borderRadius: AppRadius.lg),
              child: const Icon(Icons.wifi_off_rounded,
                  color: AppColors.red, size: 30),
            ),
            const SizedBox(height: 16),
            const Text('Connection error', style: AppTextStyles.sectionTitle),
            const SizedBox(height: 6),
            Text(message,
                style: AppTextStyles.bodySmall,
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool isFiltered;
  final VoidCallback onClear;
  const _EmptyState({required this.isFiltered, required this.onClear});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64, height: 64,
            decoration: const BoxDecoration(
                color: AppColors.primaryBg, borderRadius: AppRadius.lg),
            child: const Icon(Icons.inventory_2_outlined,
                color: AppColors.primary, size: 32),
          ),
          const SizedBox(height: 16),
          Text(isFiltered ? 'No items found' : 'No stock items',
              style: AppTextStyles.sectionTitle),
          const SizedBox(height: 6),
          Text(
            isFiltered
                ? 'Try clearing your filters'
                : 'Scan any product barcode or QR to quickly add items to your inventory',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          if (isFiltered)
            TextButton.icon(
              onPressed: onClear,
              icon: const Icon(Icons.clear, size: 16),
              label: const Text('Clear filters'),
            )
          else
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              ),
              onPressed: () => context.push(Routes.barcodeScan),
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
              label: const Text(
                'Scan Barcode to Add Item',
                style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
    );
  }
}
