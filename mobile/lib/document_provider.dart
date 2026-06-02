import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client.dart';

// ── Models ────────────────────────────────────────────────────────────────────

class ExtractionSummary {
  final String id;
  final String status;
  final String documentType;
  final String? language;
  final String filename;
  final String? partyName;
  final String? amount;
  final double? confidence;
  final String date;

  const ExtractionSummary({
    required this.id,
    required this.status,
    required this.documentType,
    this.language,
    required this.filename,
    this.partyName,
    this.amount,
    this.confidence,
    required this.date,
  });

  factory ExtractionSummary.fromJson(Map<String, dynamic> json) {
    final data = json['extracted_data'] as Map<String, dynamic>? ?? {};
    final amount = data['total_amount'];
    return ExtractionSummary(
      id: json['id'] ?? '',
      status: json['status'] ?? 'pending',
      documentType: json['document_type'] ?? 'invoice',
      language: json['language'],
      filename: json['filename'] ?? 'document',
      partyName: data['party_name'] as String?,
      amount: amount != null ? _formatAmount(amount) : null,
      confidence: (json['confidence_score'] as num?)?.toDouble(),
      date: (json['created_at'] as String? ?? '').substring(0, 10),
    );
  }

  static String _formatAmount(dynamic v) {
    final n = (v as num).toDouble();
    if (n >= 10000000) return '₹${(n / 10000000).toStringAsFixed(1)}Cr';
    if (n >= 100000) return '₹${(n / 100000).toStringAsFixed(1)}L';
    if (n >= 1000) return '₹${(n / 1000).toStringAsFixed(1)}K';
    return '₹${n.toStringAsFixed(0)}';
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class DocumentNotifier extends StateNotifier<AsyncValue<void>> {
  DocumentNotifier() : super(const AsyncValue.data(null));

  final _dio = ApiClient().dio;

  /// Upload a document for AI extraction.
  /// Returns the extraction_id string on success.
  Future<ApiResult<String>> upload({
    required String fileBase64,
    required String filename,
    required String documentType,
    required String language,
  }) async {
    state = const AsyncValue.loading();
    try {
      final resp = await _dio.post(
        '/documents/upload',
        data: {
          'file_base64': fileBase64,
          'filename': filename,
          'document_type': documentType,
          'language': language,
        },
        options: Options(contentType: 'application/json'),
      );
      final extractionId = resp.data['extraction_id'] as String;
      state = const AsyncValue.data(null);
      return ApiResult.success(extractionId);
    } on DioException catch (e) {
      final msg = (e.error as ApiException?)?.message ?? 'Upload failed';
      state = AsyncValue.error(e, StackTrace.current);
      return ApiResult.failure(msg);
    }
  }

  Future<ApiResult<Map<String, dynamic>>> getExtraction(String id) async {
    try {
      final resp = await _dio.get('/documents/$id');
      return ApiResult.success(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return ApiResult.failure(
          (e.error as ApiException?)?.message ?? 'Failed to fetch extraction');
    }
  }

  Future<ApiResult<Map<String, dynamic>>> verify({
    required String extractionId,
    required bool approve,
    Map<String, dynamic>? corrections,
  }) async {
    try {
      final resp = await _dio.post(
        '/documents/$extractionId/verify',
        data: {
          'approve': approve,
          if (corrections != null) 'corrections': corrections,
        },
      );
      return ApiResult.success(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return ApiResult.failure(
          (e.error as ApiException?)?.message ?? 'Verification failed');
    }
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final documentNotifierProvider =
    StateNotifierProvider<DocumentNotifier, AsyncValue<void>>(
  (_) => DocumentNotifier(),
);

final recentExtractionsProvider = FutureProvider<List<ExtractionSummary>>((ref) async {
  final dio = ApiClient().dio;
  final resp = await dio.get('/documents', queryParameters: {
    'limit': 20,
    'offset': 0,
  });
  final items = (resp.data as List?) ??
      (resp.data['items'] as List?) ??
      [];
  return items
      .map((j) => ExtractionSummary.fromJson(j as Map<String, dynamic>))
      .toList();
});
