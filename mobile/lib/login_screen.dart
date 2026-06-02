import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

import 'theme.dart';
import 'app_router.dart';

import 'api_client.dart';

final _dio = ApiClient().dio;

// ── Login Screen ──────────────────────────────────────────────────────────────

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  bool _loading = false;
  String _error = '';

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.length != 10) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    try {
      await _dio.post('/auth/send-otp', data: {'phone': phone});
      if (mounted) context.push(Routes.otp, extra: phone);
    } on DioException catch (e) {
      setState(() => _error = e.response?.data?['detail'] ?? 'Failed to send OTP');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showDeviceSyncDialog() {
    final codeCtrl = TextEditingController();
    bool testing = false;
    String statusMsg = '';
    bool isSuccess = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> verifyCode() async {
              final code = codeCtrl.text.trim();
              if (code.length < 3) {
                setModalState(() => statusMsg = 'Please enter a valid code or IP');
                return;
              }
              setModalState(() {
                testing = true;
                statusMsg = 'Connecting to server...';
                isSuccess = false;
              });

              // Decode pairing code: e.g. 395239 -> http://10.39.55.239:8000/api/v1
              String targetUrl;
              if (code.contains('.')) {
                targetUrl = code.startsWith('http') ? code : 'http://$code:8000/api/v1';
              } else if (code.length == 6) {
                final octet2 = code.substring(0, 2);
                final octet3_digit = code.substring(2, 3);
                final octet4 = code.substring(3);
                final octet3 = octet3_digit == '5' ? '55' : octet3_digit;
                targetUrl = 'http://10.$octet2.$octet3.$octet4:8000/api/v1';
              } else {
                setModalState(() {
                  testing = false;
                  statusMsg = 'Invalid pairing code format (use 6 digits or IP)';
                });
                return;
              }

              try {
                // Ping /health or /api/v1/health on the targetUrl
                final checkDio = Dio(BaseOptions(
                  baseUrl: targetUrl,
                  connectTimeout: const Duration(seconds: 4),
                ));
                final res = await checkDio.get('/health');
                if (res.statusCode == 200) {
                  ApiClient().updateBaseUrl(targetUrl);
                  setModalState(() {
                    testing = false;
                    isSuccess = true;
                    statusMsg = 'Connected successfully to\n$targetUrl';
                  });
                  Future.delayed(const Duration(seconds: 2), () {
                    if (mounted) Navigator.pop(context);
                  });
                } else {
                  setModalState(() {
                    testing = false;
                    statusMsg = 'Server online but returned ${res.statusCode}';
                  });
                }
              } catch (e) {
                // Try fallback to /auth/me or health unauth endpoint
                try {
                  final checkDio = Dio(BaseOptions(
                    baseUrl: targetUrl,
                    connectTimeout: const Duration(seconds: 4),
                  ));
                  final res = await checkDio.get('/api/v1/health');
                  ApiClient().updateBaseUrl(targetUrl);
                  setModalState(() {
                    testing = false;
                    isSuccess = true;
                    statusMsg = 'Connected successfully to\n$targetUrl';
                  });
                  Future.delayed(const Duration(seconds: 2), () {
                    if (mounted) Navigator.pop(context);
                  });
                } catch (e2) {
                  setModalState(() {
                    testing = false;
                    statusMsg = 'Connection failed. Verify server is running at:\n$targetUrl';
                  });
                }
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.pageBg,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Connect to Desktop Software',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text1,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.text3),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Enter the 6-digit pairing code or local IP displayed on your desktop dashboard Settings page.',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 13,
                        color: AppColors.text3,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: codeCtrl,
                            keyboardType: TextInputType.text,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppColors.text1,
                            ),
                            decoration: InputDecoration(
                              hintText: 'e.g. 395239 or 10.39.55.239',
                              filled: true,
                              fillColor: AppColors.cardBg,
                              border: OutlineInputBorder(
                                borderRadius: AppRadius.sm,
                                borderSide: const BorderSide(color: AppColors.border),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: testing ? null : verifyCode,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 24),
                            ),
                            child: testing
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Link'),
                          ),
                        ),
                      ],
                    ),
                    if (statusMsg.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: isSuccess ? AppColors.greenBg : AppColors.primaryBg,
                          borderRadius: AppRadius.sm,
                          border: Border.all(
                            color: isSuccess ? AppColors.green.withAlpha(50) : AppColors.primary.withAlpha(50),
                          ),
                        ),
                        child: Text(
                          statusMsg,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            color: isSuccess ? AppColors.green : AppColors.primary,
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // ── Logo mark ──────────────────────────────────────────
                  Image.asset(
                    'assets/images/logo_app.png',
                    width: 72,
                    height: 72,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 20),

                  const Text(
                    'Daynisc ERP',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text1,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Business Automation for Indian SMEs',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: AppColors.text3,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: _showDeviceSyncDialog,
                    icon: const Icon(Icons.sync_rounded, size: 16, color: AppColors.primary),
                    label: const Text(
                      'Link Desktop Software',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.primary,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      backgroundColor: AppColors.primaryBg,
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.sm,
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // ── Login card ────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Sign in with OTP',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Enter your registered mobile number',
                          style: TextStyle(
                            fontFamily: 'Inter', fontSize: 13,
                            color: AppColors.text3,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Phone input
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 13),
                            decoration: BoxDecoration(
                              color: AppColors.primaryBg,
                              borderRadius: AppRadius.sm,
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Text(
                              '+91',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _phoneCtrl,
                              keyboardType: TextInputType.phone,
                              maxLength: 10,
                              style: AppTextStyles.body.copyWith(
                                  color: AppColors.text1,
                                  fontWeight: FontWeight.w600),
                              decoration: const InputDecoration(
                                counterText: '',
                                hintText: '9876543210',
                              ),
                              onSubmitted: (_) => _sendOtp(),
                            ),
                          ),
                        ]),

                        if (_error.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.redBg,
                              borderRadius: AppRadius.sm,
                              border: Border.all(
                                  color: AppColors.red.withAlpha((0.3 * 255).round())),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: AppColors.red, size: 15),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      color: AppColors.red,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 20),

                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _sendOtp,
                            child: _loading
                                ? const SizedBox(
                                    height: 18, width: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text('Send OTP'),
                                      SizedBox(width: 6),
                                      Icon(Icons.arrow_forward, size: 16),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text(
                    'By signing in you agree to our Terms of Service',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      color: AppColors.text4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── OTP Screen ────────────────────────────────────────────────────────────────

class OTPScreen extends ConsumerStatefulWidget {
  final String phoneNumber;
  const OTPScreen({super.key, required this.phoneNumber});

  @override
  ConsumerState<OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends ConsumerState<OTPScreen> {
  final List<TextEditingController> _ctrls =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;
  String _error = '';
  String _devOtp = '';

  @override
  void initState() {
    super.initState();
    _resendOtp();
  }

  Future<void> _resendOtp() async {
    try {
      final res = await _dio.post('/auth/send-otp',
          data: {'phone': widget.phoneNumber});
      if (mounted) setState(() => _devOtp = res.data['dev_otp'] ?? '');
    } catch (_) {}
  }

  String get _code => _ctrls.map((c) => c.text).join();

  Future<void> _verify() async {
    if (_code.length < 6) return;
    setState(() { _loading = true; _error = ''; });
    try {
      final res = await _dio.post('/auth/verify-otp',
          data: {'phone': widget.phoneNumber, 'otp': _code});
      final box = Hive.box('auth');
      await box.put('access_token', res.data['access_token']);
      await box.put('refresh_token', res.data['refresh_token']);
      await box.put('user', res.data['user']);
      if (mounted) context.go(Routes.dashboard);
    } on DioException catch (e) {
      setState(() {
        _error = e.response?.data?['detail'] ?? 'Invalid OTP. Try again.';
        for (final c in _ctrls) { c.clear(); }
      });
      _nodes[0].requestFocus();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Verify OTP'),
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'OTP sent to +91-${widget.phoneNumber}',
                  style: AppTextStyles.body,
                ),

                if (_devOtp.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBg,
                      borderRadius: AppRadius.sm,
                      border: Border.all(
                          color: AppColors.primary.withAlpha((0.3 * 255).round())),
                    ),
                    child: Row(children: [
                      const Icon(Icons.info_outline,
                          color: AppColors.primary, size: 16),
                      const SizedBox(width: 8),
                      Text('Dev OTP: ', style: AppTextStyles.bodySmall),
                      Text(
                        _devOtp,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          color: AppColors.primary,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 6,
                        ),
                      ),
                    ]),
                  ),
                ],

                const SizedBox(height: 28),

                // OTP boxes
                Row(
                  children: List.generate(6, (i) => Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(right: i < 5 ? 8 : 0),
                      child: TextField(
                        controller: _ctrls[i],
                        focusNode: _nodes[i],
                        keyboardType: TextInputType.number,
                        maxLength: 1,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          color: AppColors.primary,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          filled: true,
                          fillColor: AppColors.cardBg,
                          border: OutlineInputBorder(
                            borderRadius: AppRadius.sm,
                            borderSide: const BorderSide(
                                color: AppColors.border, width: 1.5),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: AppRadius.sm,
                            borderSide: const BorderSide(
                                color: AppColors.primary, width: 2),
                          ),
                        ),
                        onChanged: (v) {
                          if (v.isNotEmpty && i < 5) _nodes[i + 1].requestFocus();
                          if (v.isEmpty && i > 0) _nodes[i - 1].requestFocus();
                          if (_code.length == 6) _verify();
                        },
                      ),
                    ),
                  )),
                ),

                if (_error.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.redBg,
                      borderRadius: AppRadius.sm,
                      border: Border.all(
                          color: AppColors.red.withAlpha((0.3 * 255).round())),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline,
                            color: AppColors.red, size: 15),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              color: AppColors.red,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (_loading || _code.length < 6) ? null : _verify,
                    child: _loading
                        ? const SizedBox(
                            height: 18, width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Verify & Login'),
                              SizedBox(width: 6),
                              Icon(Icons.arrow_forward, size: 16),
                            ],
                          ),
                  ),
                ),

                const SizedBox(height: 16),
                Center(
                  child: TextButton.icon(
                    onPressed: _resendOtp,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Resend OTP'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
