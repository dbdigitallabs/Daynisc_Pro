import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'api_client.dart';

// ── Models ────────────────────────────────────────────────────────────────────

class StockItem {
  final String itemCode;
  final String itemName;
  final String unit;
  final double quantity;
  final double reorderLevel;
  final double? value;
  final String? warehouseName;
  final String? hsn;
  final double gstRate;

  const StockItem({
    required this.itemCode,
    required this.itemName,
    required this.unit,
    required this.quantity,
    required this.reorderLevel,
    this.value,
    this.warehouseName,
    this.hsn,
    this.gstRate = 18.0,
  });

  factory StockItem.fromJson(Map<String, dynamic> json) => StockItem(
        itemCode: json['item_code'] ?? '',
        itemName: json['item_name'] ?? '',
        unit: json['unit'] ?? 'KG',
        quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
        reorderLevel: (json['reorder_level'] as num?)?.toDouble() ?? 0.0,
        value: (json['value'] as num?)?.toDouble(),
        warehouseName: json['warehouse_name'],
        hsn: json['hsn_code'],
        gstRate: (json['gst_rate'] as num?)?.toDouble() ?? 18.0,
      );
}

class StockMovement {
  final String id;
  final String itemName;
  final String movementType;
  final double quantity;
  final double balance;
  final String unit;
  final String warehouseName;
  final String date;

  const StockMovement({
    required this.id,
    required this.itemName,
    required this.movementType,
    required this.quantity,
    required this.balance,
    required this.unit,
    required this.warehouseName,
    required this.date,
  });

  factory StockMovement.fromJson(Map<String, dynamic> json) => StockMovement(
        id: json['id'] ?? '',
        itemName: json['item_name'] ?? '',
        movementType: json['movement_type'] ?? 'inward',
        quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
        balance: (json['balance_qty'] as num?)?.toDouble() ?? 0.0,
        unit: json['unit'] ?? 'KG',
        warehouseName: json['warehouse_name'] ?? 'Main',
        date: json['movement_date'] ?? '',
      );
}

class StockFilter {
  final String query;
  final bool lowStockOnly;
  final String? warehouseId;

  const StockFilter({
    this.query = '',
    this.lowStockOnly = false,
    this.warehouseId,
  });
}

// ── Repository ────────────────────────────────────────────────────────────────

class InventoryRepository {
  final Dio _dio;
  InventoryRepository() : _dio = ApiClient().dio;

  Future<List<StockItem>> getStock(StockFilter filter) async {
    final resp = await _dio.get('/inventory/stock', queryParameters: {
      if (filter.query.isNotEmpty) 'item_code': filter.query,
      if (filter.lowStockOnly) 'low_stock_only': true,
      if (filter.warehouseId != null) 'warehouse_id': filter.warehouseId,
      'limit': 100,
    });
    final items = (resp.data['items'] as List?) ?? [];
    return items.map((j) => StockItem.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<StockMovement>> getRecentMovements({int limit = 30}) async {
    final resp = await _dio.get('/inventory/ledger/all', queryParameters: {
      'limit': limit,
    });
    final items = (resp.data['ledger'] as List?) ?? [];
    return items
        .map((j) => StockMovement.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> recordMovement({
    required String itemCode,
    required String warehouseId,
    required String movementType,
    required double quantity,
    String unit = 'KG',
    String? batchNumber,
    String? narration,
  }) async {
    final resp = await _dio.post('/inventory/movements', data: {
      'item_code': itemCode,
      'warehouse_id': warehouseId,
      'movement_type': movementType,
      'quantity': quantity,
      'unit': unit,
      if (batchNumber != null) 'batch_number': batchNumber,
      if (narration != null) 'narration': narration,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getValuation({String method = 'weighted_average'}) async {
    final resp = await _dio.get('/inventory/valuation', queryParameters: {
      'method': method,
    });
    return resp.data as Map<String, dynamic>;
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final inventoryRepoProvider = Provider((_) => InventoryRepository());

final stockListProvider = FutureProvider.family<List<StockItem>, StockFilter>(
  (ref, filter) => ref.read(inventoryRepoProvider).getStock(filter),
);

final recentMovementsProvider = FutureProvider<List<StockMovement>>(
  (ref) => ref.read(inventoryRepoProvider).getRecentMovements(),
);

final stockValuationProvider = FutureProvider<Map<String, dynamic>>(
  (ref) => ref.read(inventoryRepoProvider).getValuation(),
);

// ── Stock movement notifier ───────────────────────────────────────────────────

class StockMovementNotifier extends StateNotifier<AsyncValue<void>> {
  final InventoryRepository _repo;

  StockMovementNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<Map<String, dynamic>> record({
    required String itemCode,
    required String warehouseId,
    required String movementType,
    required double quantity,
    String unit = 'KG',
    String? batchNumber,
    String? narration,
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repo.recordMovement(
        itemCode: itemCode,
        warehouseId: warehouseId,
        movementType: movementType,
        quantity: quantity,
        unit: unit,
        batchNumber: batchNumber,
        narration: narration,
      );
      state = const AsyncValue.data(null);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final stockMovementNotifierProvider =
    StateNotifierProvider<StockMovementNotifier, AsyncValue<void>>(
  (ref) => StockMovementNotifier(ref.read(inventoryRepoProvider)),
);
