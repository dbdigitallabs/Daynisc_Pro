import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
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

  bool _syncingToTally = false;
  String? _tallySyncSuccessMsg;
  String? _tallySyncErrorMsg;

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
      _syncingToTally = false;
      _tallySyncSuccessMsg = null;
      _tallySyncErrorMsg = null;
    });
  }

  Future<void> _approveAndSyncToTally(String docId) async {
    setState(() {
      _syncingToTally = true;
      _tallySyncSuccessMsg = null;
      _tallySyncErrorMsg = null;
    });

    try {
      final res = await ApiClient().dio.post(
        '/documents/$docId/verify',
        data: {'approve': true},
      );
      final data = res.data as Map<String, dynamic>;
      final bool tallySynced = data['tally_synced'] == true;
      final String msg = data['tally_message'] as String? ??
          (tallySynced
              ? 'Successfully synced to TallyPrime!'
              : 'Document approved and queued for Tally sync.');
      setState(() {
        _tallySyncSuccessMsg = msg;
      });
    } on DioException catch (e) {
      final msg = (e.error is ApiException)
          ? (e.error as ApiException).message
          : 'Sync to Tally failed. Check Tally server connection.';
      setState(() => _tallySyncErrorMsg = msg);
    } catch (e) {
      setState(() => _tallySyncErrorMsg = e.toString());
    } finally {
      setState(() => _syncingToTally = false);
    }
  }

  String _getServerHost() {
    try {
      final box = Hive.box('auth');
      final url = box.get('api_base_url') as String?;
      if (url != null && url.isNotEmpty) {
        final uri = Uri.parse(url);
        return uri.host.isNotEmpty ? uri.host : url;
      }
    } catch (_) {}
    return 'Online';
  }

  Future<void> _confirmDisconnect() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Server?'),
        content: const Text(
          'Are you sure you want to disconnect? You will need to scan or enter the server IP again to reconnect.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final box = Hive.box('auth');
      await box.clear();
      if (mounted) {
        context.go(Routes.login);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final host = _getServerHost();

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Upload Document',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.text1,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppColors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  'Connected: $host',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: AppColors.text3,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Disconnect / Switch Server',
            icon: const Icon(Icons.link_off_rounded, color: AppColors.text2),
            onPressed: _confirmDisconnect,
          ),
        ],
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
              _ResultCard(
                result: _result!,
                onReset: _reset,
                isSyncing: _syncingToTally,
                syncSuccessMsg: _tallySyncSuccessMsg,
                syncErrorMsg: _tallySyncErrorMsg,
                onSyncToTally: _result!.id.isNotEmpty
                    ? () => _approveAndSyncToTally(_result!.id)
                    : null,
              ),
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
            const _StepLabel(number: '1', label: 'Document Type'),
            const SizedBox(height: 10),
            _DocTypeGrid(
              selected: _selectedType,
              onSelect: (t) => setState(() => _selectedType = t),
            ),
            const SizedBox(height: 20),

            // ── Step 2: Choose file ───────────────────────────────────
            const _StepLabel(number: '2', label: 'Select File'),
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
                    if (_localFilePath != null &&
                        (_localFileName?.toLowerCase().endsWith('.jpg') == true ||
                         _localFileName?.toLowerCase().endsWith('.jpeg') == true ||
                         _localFileName?.toLowerCase().endsWith('.png') == true ||
                         _localFileName?.toLowerCase().endsWith('.webp') == true)) ...[
                      ClipRRect(
                        borderRadius: AppRadius.sm,
                        child: Image.file(
                          File(_localFilePath!),
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 48,
                            height: 48,
                            decoration: const BoxDecoration(
                              color: AppColors.greenBg,
                              borderRadius: AppRadius.sm,
                            ),
                            child: const Icon(Icons.image_outlined, color: AppColors.green, size: 24),
                          ),
                        ),
                      ),
                    ] else ...[
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: AppColors.amberBg,
                          borderRadius: AppRadius.sm,
                        ),
                        child: const Icon(Icons.picture_as_pdf_outlined,
                            color: AppColors.amber, size: 26),
                      ),
                    ],
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
                          Text(
                            'Ready to upload',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.green,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
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
              const _StepLabel(number: '3', label: 'Upload & Extract with AI'),
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
                    '1. Take a photo or pick a PDF/image',
                    '2. AI reads party name, items, amounts & GST',
                    '3. Review & approve to create ERP entry',
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
    return SizedBox(
      height: 88,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        physics: const BouncingScrollPhysics(),
        itemCount: _docTypes.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final t = _docTypes[index];
          final isSelected = t.key == selected.key;
          return GestureDetector(
            onTap: () => onSelect(t),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 180,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isSelected ? t.bg : AppColors.cardBg,
                borderRadius: AppRadius.md,
                border: Border.all(
                  color: isSelected ? t.color : AppColors.border,
                  width: isSelected ? 2 : 1,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: t.color.withAlpha(45),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : [
                        BoxShadow(
                          color: Colors.black.withAlpha(8),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSelected ? t.color.withAlpha(40) : AppColors.pageBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      t.icon,
                      color: isSelected ? t.color : AppColors.text2,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          t.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? t.color : AppColors.text1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          t.description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 10,
                            color: AppColors.text3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: t.color,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 12),
                    ),
                ],
              ),
            ),
          );
        },
      ),
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
          decoration: const BoxDecoration(
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
  final bool isSyncing;
  final String? syncSuccessMsg;
  final String? syncErrorMsg;
  final VoidCallback? onSyncToTally;

  const _ResultCard({
    required this.result,
    required this.onReset,
    this.isSyncing = false,
    this.syncSuccessMsg,
    this.syncErrorMsg,
    this.onSyncToTally,
  });

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

            // ── Tally Sync Status Banner ───────────────────────────────
            if (syncSuccessMsg != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppRadius.sm,
                  border: Border.all(color: AppColors.green, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.green.withAlpha(20),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cloud_done_rounded, color: AppColors.green, size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Synced to TallyPrime!',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.green,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            syncSuccessMsg!,
                            style: AppTextStyles.bodySmall.copyWith(
                              fontSize: 11,
                              color: AppColors.text2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (syncErrorMsg != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.redBg,
                  borderRadius: AppRadius.sm,
                  border: Border.all(color: AppColors.red.withAlpha(100)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppColors.red, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        syncErrorMsg!,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: AppColors.red,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 14),

            // ── Tally Sync Action ─────────────────────────────────────
            if (syncSuccessMsg == null && onSyncToTally != null) ...[
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: isSyncing ? null : onSyncToTally,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E), // Teal / Tally brand vibe
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
                    elevation: 1,
                  ),
                  icon: isSyncing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.cloud_sync_rounded, size: 20),
                  label: Text(
                    isSyncing ? 'Pushing to TallyPrime…' : 'Approve & Sync to TallyPrime',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],

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
