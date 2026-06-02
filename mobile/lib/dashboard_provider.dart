import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'api_client.dart';

// ── Models ────────────────────────────────────────────────────────────────────

class DashboardData {
  final String companyName;
  final String formattedDate;
  final String todaySales;
  final String outstanding;
  final String stockValue;
  final int pendingExtractions;
  final double? salesDeltaPct;
  final List<PendingAction> pendingActions;
  final List<LowStockItem> lowStockItems;

  const DashboardData({
    required this.companyName,
    required this.formattedDate,
    required this.todaySales,
    required this.outstanding,
    required this.stockValue,
    required this.pendingExtractions,
    this.salesDeltaPct,
    required this.pendingActions,
    required this.lowStockItems,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final kpis = json['kpis'] as Map<String, dynamic>? ?? {};
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    return DashboardData(
      companyName: json['company_name'] as String? ?? 'My Company',
      formattedDate: DateFormat('EEE, d MMM yyyy').format(DateTime.now()),
      todaySales: fmt.format((kpis['today_sales'] as num?)?.toInt() ?? 0),
      outstanding: fmt.format((kpis['outstanding_receivable'] as num?)?.toInt() ?? 0),
      stockValue: fmt.format((kpis['stock_value'] as num?)?.toInt() ?? 0),
      pendingExtractions: (kpis['pending_ai'] as num?)?.toInt() ?? 0,
      salesDeltaPct: (kpis['sales_delta_pct'] as num?)?.toDouble(),
      pendingActions: ((json['pending_actions'] as List?) ?? [])
          .map((a) => PendingAction.fromJson(a as Map<String, dynamic>))
          .toList(),
      lowStockItems: ((json['low_stock'] as List?) ?? [])
          .map((a) => LowStockItem.fromJson(a as Map<String, dynamic>))
          .toList(),
    );
  }
}

class PendingAction {
  final String id;
  final String title;
  final String subtitle;
  final String type;
  final String route;

  const PendingAction({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.type,
    required this.route,
  });

  factory PendingAction.fromJson(Map<String, dynamic> json) => PendingAction(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        subtitle: json['subtitle'] ?? '',
        type: json['type'] ?? 'ai_review',
        route: json['route'] ?? '/scan',
      );
}

class LowStockItem {
  final String itemCode;
  final String itemName;
  final double current;
  final double reorder;
  final String unit;

  const LowStockItem({
    required this.itemCode,
    required this.itemName,
    required this.current,
    required this.reorder,
    required this.unit,
  });

  factory LowStockItem.fromJson(Map<String, dynamic> json) => LowStockItem(
        itemCode: json['item_code'] ?? '',
        itemName: json['item_name'] ?? '',
        current: (json['quantity'] as num?)?.toDouble() ?? 0.0,
        reorder: (json['reorder_level'] as num?)?.toDouble() ?? 0.0,
        unit: json['unit'] ?? 'KG',
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────

final dashboardDataProvider = FutureProvider<DashboardData>((ref) async {
  final dio = ApiClient().dio;

  // Parallel fetch dashboard + low stock
  final responses = await Future.wait([
    dio.get('/dashboard'),
    dio.get('/inventory/stock', queryParameters: {
      'low_stock_only': true,
      'limit': 5,
    }),
  ]);

  final dashData = responses[0].data as Map<String, dynamic>;
  final stockData = responses[1].data as Map<String, dynamic>;

  final lowStock = ((stockData['items'] as List?) ?? [])
      .map((i) => LowStockItem.fromJson(i as Map<String, dynamic>))
      .toList();

  return DashboardData.fromJson({
    ...dashData,
    'low_stock': lowStock,
  });
});
