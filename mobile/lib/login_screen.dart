import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';

import 'theme.dart';
import 'app_router.dart';
import 'api_client.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  
  final TextEditingController _ipCtrl = TextEditingController();
  
  bool _isLoading = false;
  String? _errorMessage;
  bool _showManualInput = false;

  Future<void> _handleScannedData(String scannedString) async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    String? targetUrl;
    String? token;
    String? refreshToken;

    // 1. Try parsing scanned string as JSON
    try {
      final Map<String, dynamic> data = jsonDecode(scannedString);
      targetUrl = data['url'];
      token = data['token'];
      refreshToken = data['refresh_token'];
    } catch (_) {
      // 2. Fallback: Try parsing as URL with query params
      if (scannedString.startsWith('http://') || scannedString.startsWith('https://')) {
        try {
          final uri = Uri.parse(scannedString);
          token = uri.queryParameters['token'];
          // Remove query params to get API base path
          targetUrl = uri.replace(queryParameters: {}).toString();
          if (targetUrl.endsWith('?')) {
            targetUrl = targetUrl.substring(0, targetUrl.length - 1);
          }
        } catch (_) {}
      }
    }

    // 3. Fallback: Try decoding as pure pairing code or IP address
    if (targetUrl == null || targetUrl.isEmpty) {
      final cleaned = scannedString.trim();
      if (cleaned.contains('.')) {
        targetUrl = cleaned.startsWith('http') ? cleaned : 'http://$cleaned:8000/api/v1';
      } else if (cleaned.length == 6 && int.tryParse(cleaned) != null) {
        final octet2 = cleaned.substring(0, 2);
        final octet3Digit = cleaned.substring(2, 3);
        final octet4 = cleaned.substring(3);
        final octet3 = octet3Digit == '5' ? '55' : octet3Digit;
        targetUrl = 'http://10.$octet2.$octet3.$octet4:8000/api/v1';
      }
    }

    if (targetUrl == null || targetUrl.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Invalid QR code or address format.';
      });
      return;
    }

    // Default token fallbacks for development/local server mode
    token ??= 'demo-jwt-token-daynisc-2025';
    refreshToken ??= 'demo-jwt-token-daynisc-2025-refresh';

    try {
      // Create a temporary Dio client to verify connection and auth state
      final verifyDio = Dio(BaseOptions(
        baseUrl: targetUrl,
        connectTimeout: const Duration(seconds: 8),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ));

      final res = await verifyDio.get('/auth/me');
      
      if (res.statusCode == 200) {
        // Successful link and login! Save details in Hive
        final box = Hive.box('auth');
        await box.put('access_token', token);
        await box.put('refresh_token', refreshToken);
        await box.put('api_base_url', targetUrl);
        
        final userData = res.data['user'];
        if (userData != null) {
          await box.put('user', userData);
        }
        
        final companyData = res.data['company'];
        if (companyData != null) {
          await box.put('company_id', companyData['id']);
          await box.put('company', companyData);
        }

        // Apply new endpoint URL to ApiClient singleton
        ApiClient().updateBaseUrl(targetUrl);

        if (mounted) {
          context.go(Routes.dashboard);
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Connected but server returned code ${res.statusCode}';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Connection failed. Verify server is running at:\n$targetUrl';
      });
    }
  }

  Future<void> _pickGalleryQr() async {
    final picker = ImagePicker();
    final XFile? file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final capture = await _scannerController.analyzeImage(file.path);
      if (capture == null || capture.barcodes.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'No valid QR code detected in the selected image.';
        });
      } else {
        final code = capture.barcodes.first.rawValue;
        if (code != null) {
          _handleScannedData(code);
        } else {
          setState(() {
            _isLoading = false;
            _errorMessage = 'QR code found but it contains no readable data.';
          });
        }
      }
    }
 catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to scan image: $e';
      });
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _ipCtrl.dispose();
    super.dispose();
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
                  // ── Logo Section ──────────────────────────────────────────
                  Image.asset(
                    'assets/images/logo_app.png',
                    width: 72,
                    height: 72,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 16),
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
                    'Scan Web Dashboard QR Code to Login',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: AppColors.text3,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),

                  // ── Scanner Card or Loading state ──────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: cardDecoration(),
                    child: Column(
                      children: [
                        if (_isLoading) ...[
                          const SizedBox(height: 48),
                          const CircularProgressIndicator(
                            strokeWidth: 3,
                            color: AppColors.primary,
                          ),
                          const SizedBox(height: 24),
                          const Text(
                            'Connecting to PC & Authenticating...',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text2,
                            ),
                          ),
                          const SizedBox(height: 48),
                        ] else ...[
                          // Scanner Frame
                          ClipRRect(
                            borderRadius: AppRadius.md,
                            child: SizedBox(
                              height: 260,
                              width: double.infinity,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  MobileScanner(
                                    controller: _scannerController,
                                    onDetect: (capture) {
                                      final List<Barcode> barcodes = capture.barcodes;
                                      if (barcodes.isNotEmpty) {
                                        final String? code = barcodes.first.rawValue;
                                        if (code != null) {
                                          _handleScannedData(code);
                                        }
                                      }
                                    },
                                  ),
                                  // Viewing Window Overlay
                                  Container(
                                    width: 180,
                                    height: 180,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: AppColors.primary,
                                        width: 3,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              TextButton.icon(
                                onPressed: _pickGalleryQr,
                                icon: const Icon(Icons.photo_library_outlined, size: 16),
                                label: const Text('Scan Image'),
                              ),
                              TextButton.icon(
                                onPressed: () {
                                  setState(() => _showManualInput = !_showManualInput);
                                },
                                icon: Icon(
                                  _showManualInput ? Icons.videocam_outlined : Icons.edit_outlined,
                                  size: 16,
                                ),
                                label: Text(_showManualInput ? 'Use Camera' : 'Link Manually'),
                              ),
                            ],
                          ),
                        ],

                        // ── Manual IP Input Section ────────────────────────
                        if (!_isLoading && _showManualInput) ...[
                          const SizedBox(height: 12),
                          const Divider(),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _ipCtrl,
                                  keyboardType: TextInputType.text,
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.text1,
                                  ),
                                  decoration: const InputDecoration(
                                    hintText: 'Enter PC local IP or URL',
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                  onSubmitted: (v) => _handleScannedData(v.trim()),
                                ),
                              ),
                              const SizedBox(width: 8),
                              SizedBox(
                                height: 40,
                                child: ElevatedButton(
                                  onPressed: () {
                                    final val = _ipCtrl.text.trim();
                                    if (val.isNotEmpty) _handleScannedData(val);
                                  },
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                  ),
                                  child: const Text('Link', style: TextStyle(fontSize: 12)),
                                ),
                              ),
                            ],
                          ),
                        ],

                        // ── Error Banner ─────────────────────────────────────
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.redBg,
                              borderRadius: AppRadius.sm,
                              border: Border.all(
                                color: AppColors.red.withAlpha(50),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.error_outline, color: AppColors.red, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
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
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text(
                    'Ensure your mobile device and PC are on the same Wi-Fi network.',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      color: AppColors.text3,
                      height: 1.4,
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
