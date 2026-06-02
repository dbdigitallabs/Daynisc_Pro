import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'theme.dart';
import 'api_client.dart';
import 'app_router.dart';

// ── Document types ────────────────────────────────────────────────────────────

class _DocType {
  final String key;
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final Color bg;
  const _DocType({
    required this.key, required this.label, required this.description,
    required this.icon, required this.color, required this.bg,
  });
}

const _docTypes = [
  _DocType(
    key: 'purchase', label: 'Purchase Bill',
    description: 'Vendor invoice, GST bill',
    icon: Icons.shopping_cart_outlined,
    color: AppColors.amber, bg: AppColors.amberBg,
  ),
  _DocType(
    key: 'sales', label: 'Sales Invoice',
    description: 'Customer invoice, receipt',
    icon: Icons.receipt_long_outlined,
    color: AppColors.primary, bg: AppColors.primaryBg,
  ),
  _DocType(
    key: 'lr', label: 'Lorry Receipt',
    description: 'Transport LR document',
    icon: Icons.local_shipping_outlined,
    color: AppColors.info, bg: Color(0xFFECFEFF),
  ),
  _DocType(
    key: 'payment', label: 'Payment Proof',
    description: 'UPI screenshot, bank receipt',
    icon: Icons.payment_outlined,
    color: AppColors.green, bg: AppColors.greenBg,
  ),
  _DocType(
    key: 'other', label: 'Other Document',
    description: 'Challan, e-way bill, etc.',
    icon: Icons.description_outlined,
    color: AppColors.purple, bg: Color(0xFFF5F3FF),
  ),
];

// ── Upload result model ───────────────────────────────────────────────────────

class _UploadResult {
  final String id;
  final String status;
  final String? partyName;
  final String? invoiceNumber;
  final double? totalAmount;
  final double? confidence;
  final String? message;
  final String? error;

  const _UploadResult({
    required this.id, required this.status,
    this.partyName, this.invoiceNumber, this.totalAmount,
    this.confidence, this.message, this.error,
  });

  factory _UploadResult.fromJson(Map<String, dynamic> j) => _UploadResult(
    id:            j['id'] ?? '',
    status:        j['status'] ?? 'failed',
    partyName:     j['party_name'],
    invoiceNumber: j['invoice_number'],
    totalAmount:   (j['total_amount'] as num?)?.toDouble(),
    confidence:    (j['confidence'] as num?)?.toDouble(),
    message:       j['message'],
    error:         j['error'],
  );

  bool get isSuccess => status == 'extracted';
}

// ── Screen ────────────────────────────────────────────────────────────────────

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  _DocType _selectedType = _docTypes.first;
  bool _uploading = false;
  _UploadResult? _result;
  String? _localFilePath;
  String? _localFileName;
  String? _errorMsg;

  final _picker = ImagePicker();

  // ── Pick file / photo ─────────────────────────────────────────────────────

  Future<void> _pickCamera() async {
    final xFile = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 90,
        preferredCameraDevice: CameraDevice.rear);
    if (xFile == null) return;
    setState(() {
      _localFilePath = xFile.path;
      _localFileName = xFile.name;
      _result = null;
      _errorMsg = null;
    });
  }

  Future<void> _pickGallery() async {
    final xFile = await _picker.pickImage(
        source: ImageSource.gallery, imageQuality: 90);
    if (xFile == null) return;
    setState(() {
      _localFilePath = xFile.path;
      _localFileName = xFile.name;
      _result = null;
      _errorMsg = null;
    });
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      withData: kIsWeb,
    );
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    setState(() {
      _localFilePath = f.path;
      _localFileName = f.name;
      _result = null;
      _errorMsg = null;
    });
  }

  // ── Upload to backend ─────────────────────────────────────────────────────

  Future<void> _upload() async {
    if (_localFilePath == null && !kIsWeb) return;
    setState(() { _uploading = true; _errorMsg = null; _result = null; });

    try {
      final formData = FormData.fromMap({
        'document_type': _selectedType.key,
        'file': await MultipartFile.fromFile(
          _localFilePath!,
          filename: _localFileName ?? 'document',
        ),
      });

      final res = await ApiClient().dio.post(
        '/documents/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      setState(() => _result = _UploadResult.fromJson(
          res.data as Map<String, dynamic>));
    } on DioException catch (e) {
      final msg = (e.error is ApiException)
          ? (e.error as ApiException).message
          : 'Upload failed. Check your connection.';
      setState(() => _errorMsg = msg);
    } finally {
      setState(() => _uploading = false);
    }
  }

  void _reset() {
    setState(() {
      _localFilePath = null;
      _localFileName = null;
      _result = null;
      _errorMsg = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Upload Document'),
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Result card (shown after upload) ──────────────────────
            if (_result != null) ...[
              _ResultCard(result: _result!, onReset: _reset),
              const SizedBox(height: 20),
            ],

            // ── Error banner ──────────────────────────────────────────
            if (_errorMsg != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.redBg,
                  borderRadius: AppRadius.md,
                  border: Border.all(
                      color: AppColors.red.withAlpha((0.3 * 255).round())),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.red, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(_errorMsg!,
                          style: const TextStyle(
                            fontFamily: 'Inter', fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.red,
                          )),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 16,
                          color: AppColors.red),
                      onPressed: () => setState(() => _errorMsg = null),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // ── Step 1: Document type ─────────────────────────────────
            _StepLabel(number: '1', label: 'Document Type'),
            const SizedBox(height: 10),
            _DocTypeGrid(
              selected: _selectedType,
              onSelect: (t) => setState(() => _selectedType = t),
            ),
            const SizedBox(height: 20),

            // ── Step 2: Choose file ───────────────────────────────────
            _StepLabel(number: '2', label: 'Select File'),
            const SizedBox(height: 10),

            if (_localFilePath == null) ...[
              // Pick source buttons
              Row(
                children: [
                  Expanded(
                    child: _PickButton(
                      icon: Icons.camera_alt_rounded,
                      label: 'Camera',
                      color: AppColors.primary,
                      bg: AppColors.primaryBg,
                      onTap: _pickCamera,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PickButton(
                      icon: Icons.photo_library_outlined,
                      label: 'Gallery',
                      color: AppColors.green,
                      bg: AppColors.greenBg,
                      onTap: _pickGallery,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PickButton(
                      icon: Icons.picture_as_pdf_outlined,
                      label: 'PDF / File',
                      color: AppColors.amber,
                      bg: AppColors.amberBg,
                      onTap: _pickFile,
                    ),
                  ),
                ],
              ),
            ] else ...[
              // File selected — preview card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: cardDecoration(),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.greenBg,
                        borderRadius: AppRadius.sm,
                      ),
                      child: const Icon(Icons.check_circle_outline,
                          color: AppColors.green, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _localFileName ?? 'Selected file',
                            style: AppTextStyles.cardTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text('Ready to upload',
                              style: AppTextStyles.bodySmall.copyWith(
                                  color: AppColors.green)),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: _reset,
                      child: const Text('Change',
                          style: TextStyle(
                            fontFamily: 'Inter', fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          )),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ── Step 3: Upload button ───────────────────────────────
              _StepLabel(number: '3', label: 'Upload & Extract with AI'),
              const SizedBox(height: 10),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _uploading ? null : _upload,
                  icon: _uploading
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome, size: 18),
                  label: Text(_uploading
                      ? 'Extracting with AI…'
                      : 'Upload & Extract'),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // ── Info box ──────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primaryBg,
                borderRadius: AppRadius.md,
                border: Border.all(
                    color: AppColors.primary.withAlpha((0.2 * 255).round())),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.info_outline,
                          color: AppColors.primary, size: 16),
                      SizedBox(width: 8),
                      Text('How it works',
                          style: TextStyle(
                            fontFamily: 'Inter', fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...[
                    '📸 Take a photo or pick a PDF/image',
                    '🤖 AI reads party name, items, amounts & GST',
                    '✅ Review & approve to create ERP entry',
                  ].map((t) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Text(t,
                            style: AppTextStyles.bodySmall
                                .copyWith(color: AppColors.text2)),
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Doc type grid ─────────────────────────────────────────────────────────────

class _DocTypeGrid extends StatelessWidget {
  final _DocType selected;
  final ValueChanged<_DocType> onSelect;
  const _DocTypeGrid({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: _docTypes.map((t) {
        final isSelected = t.key == selected.key;
        return GestureDetector(
          onTap: () => onSelect(t),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? t.bg : AppColors.cardBg,
              borderRadius: AppRadius.md,
              border: Border.all(
                color: isSelected ? t.color : AppColors.border,
                width: isSelected ? 1.5 : 1,
              ),
              boxShadow: isSelected
                  ? [BoxShadow(
                      color: t.color.withAlpha((0.15 * 255).round()),
                      blurRadius: 8, offset: const Offset(0, 2))]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(t.icon,
                    color: isSelected ? t.color : AppColors.text3,
                    size: 18),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.label,
                        style: TextStyle(
                          fontFamily: 'Inter', fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? t.color : AppColors.text1,
                        )),
                    Text(t.description,
                        style: const TextStyle(
                          fontFamily: 'Inter', fontSize: 10,
                          color: AppColors.text3,
                        )),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ── Pick button ───────────────────────────────────────────────────────────────

class _PickButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bg;
  final VoidCallback onTap;
  const _PickButton({
    required this.icon, required this.label,
    required this.color, required this.bg, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: AppRadius.md,
          border: Border.all(color: color.withAlpha((0.25 * 255).round())),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                  fontFamily: 'Inter', fontSize: 12,
                  fontWeight: FontWeight.w600, color: color,
                )),
          ],
        ),
      ),
    );
  }
}

// ── Step label ────────────────────────────────────────────────────────────────

class _StepLabel extends StatelessWidget {
  final String number;
  final String label;
  const _StepLabel({required this.number, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 24, height: 24,
          decoration: BoxDecoration(
            color: AppColors.primary, borderRadius: AppRadius.full,
          ),
          child: Center(
            child: Text(number,
                style: const TextStyle(
                  fontFamily: 'Inter', fontSize: 12,
                  fontWeight: FontWeight.w800, color: Colors.white,
                )),
          ),
        ),
        const SizedBox(width: 10),
        Text(label, style: AppTextStyles.sectionTitle),
      ],
    );
  }
}

// ── Upload result card ────────────────────────────────────────────────────────

class _ResultCard extends StatelessWidget {
  final _UploadResult result;
  final VoidCallback onReset;
  const _ResultCard({required this.result, required this.onReset});

  @override
  Widget build(BuildContext context) {
    final ok = result.isSuccess;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ok ? AppColors.greenBg : AppColors.amberBg,
        borderRadius: AppRadius.md,
        border: Border.all(
          color: ok
              ? AppColors.green.withAlpha((0.3 * 255).round())
              : AppColors.amber.withAlpha((0.3 * 255).round()),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                ok ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                color: ok ? AppColors.green : AppColors.amber,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  ok ? 'AI Extraction Complete!' : 'Document saved',
                  style: TextStyle(
                    fontFamily: 'Inter', fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: ok ? AppColors.green : AppColors.amber,
                  ),
                ),
              ),
            ],
          ),
          if (ok) ...[
            const SizedBox(height: 12),
            const Divider(color: AppColors.divider),
            const SizedBox(height: 10),
            if (result.partyName != null)
              _ResultRow(label: 'Party', value: result.partyName!),
            if (result.invoiceNumber != null)
              _ResultRow(label: 'Invoice No.', value: result.invoiceNumber!),
            if (result.totalAmount != null)
              _ResultRow(
                label: 'Total Amount',
                value: '₹${result.totalAmount!.toStringAsFixed(2)}',
                highlight: true,
              ),
            if (result.confidence != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('AI Confidence',
                      style: AppTextStyles.bodySmall),
                  const Spacer(),
                  ClipRRect(
                    borderRadius: AppRadius.full,
                    child: SizedBox(
                      width: 100,
                      child: LinearProgressIndicator(
                        value: result.confidence!,
                        color: AppColors.green,
                        backgroundColor: AppColors.border,
                        minHeight: 6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${(result.confidence! * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(
                      fontFamily: 'Inter', fontSize: 12,
                      fontWeight: FontWeight.w700, color: AppColors.green,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReset,
                    icon: const Icon(Icons.upload, size: 16),
                    label: const Text('Upload Another'),
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 8),
            Text(
              result.message ?? result.error ?? 'Unknown error',
              style: AppTextStyles.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;
  const _ResultRow({
    required this.label, required this.value, this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: AppTextStyles.bodySmall),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: highlight ? 15 : 13,
              fontWeight: FontWeight.w700,
              color: highlight ? AppColors.green : AppColors.text1,
            ),
          ),
        ],
      ),
    );
  }
}
