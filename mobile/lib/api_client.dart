import 'dart:io';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';

// ── Configuration ────────────────────────────────────────────────────────────

const _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.39.55.239:8000/api/v1',
);

// ── API Client singleton ──────────────────────────────────────────────────────

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio _dio;

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
    // Also save it to Hive so it persists across restarts
    final box = Hive.box('auth');
    box.put('api_base_url', newUrl);
  }

  ApiClient._internal() {
    final box = Hive.box('auth');
    final savedUrl = box.get('api_base_url');
    final activeUrl = savedUrl ?? _baseUrl;

    _dio = Dio(BaseOptions(
      baseUrl: activeUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.addAll([
      _AuthInterceptor(),
      _LogInterceptor(),
      _ErrorInterceptor(),
    ]);
  }

  Dio get dio => _dio;
}

// ── Auth interceptor — auto-inject JWT ───────────────────────────────────────

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final box = Hive.box('auth');
    final token = box.get('access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    final companyId = box.get('company_id');
    if (companyId != null) {
      options.headers['X-Company-ID'] = companyId;
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try token refresh
      final refreshed = await _tryRefreshToken();
      if (refreshed) {
        // Retry original request
        final opts = err.requestOptions;
        final box = Hive.box('auth');
        opts.headers['Authorization'] = 'Bearer ${box.get('access_token')}';
        try {
          final response = await ApiClient()._dio.fetch(opts);
          handler.resolve(response);
          return;
        } catch (_) {}
      }
      // Refresh failed — clear auth and let error propagate
      await _clearAuth();
    }
    handler.next(err);
  }

  Future<bool> _tryRefreshToken() async {
    try {
      final box = Hive.box('auth');
      final refreshToken = box.get('refresh_token');
      if (refreshToken == null) return false;

      final resp = await Dio().post(
        '${ApiClient().dio.options.baseUrl}/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      box.put('access_token', resp.data['access_token']);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _clearAuth() async {
    final box = Hive.box('auth');
    await box.deleteAll(['access_token', 'refresh_token', 'company_id']);
  }
}

// ── Logger ───────────────────────────────────────────────────────────────────

class _LogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // ignore: avoid_print
    print('[API] ${options.method} ${options.path}');
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // ignore: avoid_print
    print('[API ERROR] ${err.response?.statusCode} ${err.requestOptions.path}');
    handler.next(err);
  }
}

// ── Error normaliser ─────────────────────────────────────────────────────────

class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    String message;
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      message = 'Request timed out. Check your connection.';
    } else if (err.response?.statusCode == 400) {
      message = err.response?.data['detail'] ?? 'Invalid input';
    } else if (err.response?.statusCode == 403) {
      message = 'You do not have permission for this action';
    } else if (err.response?.statusCode == 404) {
      message = 'Record not found';
    } else if (err.response?.statusCode == 409) {
      message = 'Duplicate record detected';
    } else if (err.response?.statusCode == 429) {
      message = 'Too many requests — please wait';
    } else if (err.type == DioExceptionType.unknown &&
        err.error is SocketException) {
      message = 'No internet connection';
    } else {
      message = err.response?.data['detail']?.toString() ??
          'Something went wrong. Please retry.';
    }

    handler.next(DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: ApiException(
        message: message,
        statusCode: err.response?.statusCode,
      ),
    ));
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException({required this.message, this.statusCode});
  @override
  String toString() => message;
}

// ── Response model ────────────────────────────────────────────────────────────

class ApiResult<T> {
  final T? data;
  final String? error;

  const ApiResult.success(this.data) : error = null;
  const ApiResult.failure(this.error) : data = null;

  bool get isSuccess => error == null;
}
