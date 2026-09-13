import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';

import 'theme.dart';
import 'api_client.dart';
import 'inventory_screen.dart';

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  late final MobileScannerController _controller;
  late final AnimationController _animController;

  bool _isProcessing = false;
  bool _isTorchOn = false;
  bool _isFrontCam = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  // ── Handle Scanned Barcode ──────────────────────────────────────────────────

  Future<void> _onBarcodeDetected(String rawCode) async {
    final code = rawCode.trim();
    if (code.isEmpty || _isProcessing) return;

    setState(() => _isProcessing = true);
    HapticFeedback.mediumImpact();

    try {
      // Lookup in backend inventory
      final res = await ApiClient().dio.get(
        '/inventory/items/lookup',
        queryParameters: {'code': code},
      );

      final data = res.data as Map<String, dynamic>;
      final bool found = data['found'] == true;

      if (!mounted) return;

      if (found && data['item'] != null) {
        // Item already exists -> Show quick update / add stock sheet
        await _showExistingItemSheet(code, data['item'] as Map<String, dynamic>);
      } else {
        // Item not found -> Show Add Item sheet with scanned barcode pre-filled
        await _showAddNewItemSheet(code);
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final msg = (e.error is ApiException)
          ? (e.error as ApiException).message
          : 'Could not connect to server.';
      // Fallback: Still allow adding the item even if lookup errored
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.amber,
          duration: const Duration(seconds: 2),
        ),
      );
      await _showAddNewItemSheet(code);
    } catch (_) {
      if (mounted) {
        await _showAddNewItemSheet(code);
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  // ── Bottom Sheet: Add New Item ──────────────────────────────────────────────

  Future<void> _showAddNewItemSheet(String barcode) async {
    final nameCtrl = TextEditingController();
    final hsnCtrl = TextEditingController();
    final purchaseCtrl = TextEditingController(text: '0');
    final sellingCtrl = TextEditingController(text: '0');
    final qtyCtrl = TextEditingController(text: '1');

    String selectedCategory = 'Finished Good';
    String selectedUnit = 'PCS';
    double selectedGst = 18.0;

    final categories = [
      'Finished Good',
      'Raw Material',
      'Packaging',
      'Consumable',
      'General'
    ];
    final units = ['PCS', 'KG', 'BOX', 'MTR', 'LTR', 'PKT', 'DOZ'];
    final gstRates = [0.0, 5.0, 12.0, 18.0, 28.0];

    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sheet Handle
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Header & Barcode Tag
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: const BoxDecoration(
                            color: AppColors.primaryBg,
                            borderRadius: AppRadius.md,
                          ),
                          child: const Icon(Icons.qr_code_scanner_rounded,
                              color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Add New Item',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.text1,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Barcode: $barcode',
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.text3),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const Divider(color: AppColors.border, height: 1),
                    const SizedBox(height: 16),

                    // Item Name Field
                    const Text('Item Name *',
                        style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text1)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: nameCtrl,
                      autofocus: true,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        hintText: 'e.g. Parle-G Biscuit 250g',
                        prefixIcon: Icon(Icons.inventory_2_outlined, size: 20),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Category & Unit Row
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Category',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text1)),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                initialValue: selectedCategory,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 12),
                                ),
                                items: categories
                                    .map((c) => DropdownMenuItem(
                                        value: c,
                                        child: Text(c,
                                            style: const TextStyle(
                                                fontSize: 13))))
                                    .toList(),
                                onChanged: (v) {
                                  if (v != null) {
                                    setSheetState(() => selectedCategory = v);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Unit',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text1)),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                initialValue: selectedUnit,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 12),
                                ),
                                items: units
                                    .map((u) => DropdownMenuItem(
                                        value: u,
                                        child: Text(u,
                                            style: const TextStyle(
                                                fontSize: 13))))
                                    .toList(),
                                onChanged: (v) {
                                  if (v != null) {
                                    setSheetState(() => selectedUnit = v);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Quantity Stepper
                    const Text('Initial Stock Quantity',
                        style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text1)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          color: AppColors.primary,
                          onPressed: () {
                            double cur = double.tryParse(qtyCtrl.text) ?? 1;
                            if (cur > 1) {
                              setSheetState(() {
                                qtyCtrl.text = (cur - 1).toStringAsFixed(0);
                              });
                            }
                          },
                        ),
                        Expanded(
                          child: TextField(
                            controller: qtyCtrl,
                            keyboardType: textInputKeyBoardTypeNumbers,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold),
                            decoration: const InputDecoration(
                              contentPadding:
                                  EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          color: AppColors.primary,
                          onPressed: () {
                            double cur = double.tryParse(qtyCtrl.text) ?? 0;
                            setSheetState(() {
                              qtyCtrl.text = (cur + 1).toStringAsFixed(0);
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Pricing: Purchase Rate & Selling Rate
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Cost Rate (₹)',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text1)),
                              const SizedBox(height: 6),
                              TextField(
                                controller: purchaseCtrl,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                decoration: const InputDecoration(
                                  hintText: '0.00',
                                  prefixText: '₹ ',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Selling Rate (₹)',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text1)),
                              const SizedBox(height: 6),
                              TextField(
                                controller: sellingCtrl,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                decoration: const InputDecoration(
                                  hintText: '0.00',
                                  prefixText: '₹ ',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // GST Rate Chips
                    const Text('GST Rate',
                        style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text1)),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      children: gstRates.map((rate) {
                        final isSel = selectedGst == rate;
                        return ChoiceChip(
                          label: Text('${rate.toStringAsFixed(0)}%'),
                          selected: isSel,
                          selectedColor: AppColors.primaryBg,
                          labelStyle: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight:
                                isSel ? FontWeight.w700 : FontWeight.w500,
                            color: isSel ? AppColors.primary : AppColors.text2,
                          ),
                          side: BorderSide(
                            color: isSel ? AppColors.primary : AppColors.border,
                          ),
                          onSelected: (_) {
                            setSheetState(() => selectedGst = rate);
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: const RoundedRectangleBorder(
                            borderRadius: AppRadius.md,
                          ),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                final name = nameCtrl.text.trim();
                                if (name.isEmpty) {
                                  ScaffoldMessenger.of(sheetCtx).showSnackBar(
                                    const SnackBar(
                                        content:
                                            Text('Please enter Item Name')),
                                  );
                                  return;
                                }

                                setSheetState(() => isSubmitting = true);

                                try {
                                  final double qty =
                                      double.tryParse(qtyCtrl.text) ?? 1.0;
                                  final double pRate =
                                      double.tryParse(purchaseCtrl.text) ?? 0.0;
                                  final double sRate =
                                      double.tryParse(sellingCtrl.text) ?? 0.0;

                                  final payload = {
                                    'item_code': barcode,
                                    'item_name': name,
                                    'category': selectedCategory,
                                    'unit': selectedUnit,
                                    'quantity': qty,
                                    'purchase_rate': pRate,
                                    'selling_rate': sRate,
                                    'gst_rate': selectedGst,
                                    'hsn_code': hsnCtrl.text.trim().isEmpty
                                        ? null
                                        : hsnCtrl.text.trim(),
                                  };

                                  await ApiClient().dio.post(
                                    '/inventory/items',
                                    data: payload,
                                  );

                                  if (sheetCtx.mounted) {
                                    Navigator.pop(sheetCtx);
                                  }
                                  if (mounted) {
                                    ref.invalidate(stockProvider);

                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Row(
                                          children: [
                                            const Icon(Icons.check_circle,
                                                color: Colors.white, size: 20),
                                            const SizedBox(width: 8),
                                            Expanded(
                                                child: Text(
                                                    'Added "$name" to Inventory!')),
                                          ],
                                        ),
                                        backgroundColor: AppColors.green,
                                        duration: const Duration(seconds: 3),
                                      ),
                                    );
                                  }
                                } on DioException catch (e) {
                                  setSheetState(() => isSubmitting = false);
                                  final msg = (e.error is ApiException)
                                      ? (e.error as ApiException).message
                                      : 'Failed to add item. Check server.';
                                  if (sheetCtx.mounted) {
                                    ScaffoldMessenger.of(sheetCtx).showSnackBar(
                                      SnackBar(
                                        content: Text(msg),
                                        backgroundColor: AppColors.red,
                                      ),
                                    );
                                  }
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_box_rounded, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'Save & Add to Inventory',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ── Bottom Sheet: Existing Item (Add Stock) ─────────────────────────────────

  Future<void> _showExistingItemSheet(
      String barcode, Map<String, dynamic> item) async {
    final name = item['item_name'] ?? 'Unknown Item';
    final category = item['category'] ?? 'General';
    final unit = item['unit'] ?? 'PCS';
    final currentQty = (item['quantity'] as num?)?.toDouble() ?? 0.0;
    final sellingRate = (item['selling_rate'] as num?)?.toDouble() ?? 0.0;

    final addQtyCtrl = TextEditingController(text: '1');
    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Header Badge
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: AppColors.greenBg,
                          borderRadius: AppRadius.md,
                        ),
                        child: const Icon(Icons.check_circle_outline_rounded,
                            color: AppColors.green, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.greenBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'ITEM FOUND IN INVENTORY',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.green,
                                ),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              name,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text1,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: AppColors.text3),
                        onPressed: () => Navigator.pop(sheetCtx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: 16),

                  // Item Details Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.pageBg,
                      borderRadius: AppRadius.md,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CURRENT STOCK',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text3)),
                            const SizedBox(height: 2),
                            Text(
                              '${currentQty.toStringAsFixed(currentQty % 1 == 0 ? 0 : 2)} $unit',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('SELLING RATE',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text3)),
                            const SizedBox(height: 2),
                            Text('₹${sellingRate.toStringAsFixed(2)}',
                                style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text1)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CATEGORY',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text3)),
                            const SizedBox(height: 2),
                            Text(category,
                                style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.text2)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Quantity Increments
                  const Text('Add Stock (+ Quantity)',
                      style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text1)),
                  const SizedBox(height: 8),
                  Row(
                    children: [1, 5, 10, 25, 50].map((step) {
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              side: const BorderSide(color: AppColors.border),
                              shape: const RoundedRectangleBorder(
                                  borderRadius: AppRadius.sm),
                            ),
                            onPressed: () {
                              setSheetState(() {
                                addQtyCtrl.text = step.toString();
                              });
                            },
                            child: Text('+$step',
                                style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  // Stepper row
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        color: AppColors.primary,
                        onPressed: () {
                          double cur = double.tryParse(addQtyCtrl.text) ?? 1;
                          if (cur > 1) {
                            setSheetState(() {
                              addQtyCtrl.text = (cur - 1).toStringAsFixed(0);
                            });
                          }
                        },
                      ),
                      Expanded(
                        child: TextField(
                          controller: addQtyCtrl,
                          keyboardType: textInputKeyBoardTypeNumbers,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.bold),
                          decoration: const InputDecoration(
                            contentPadding:
                                EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        color: AppColors.primary,
                        onPressed: () {
                          double cur = double.tryParse(addQtyCtrl.text) ?? 0;
                          setSheetState(() {
                            addQtyCtrl.text = (cur + 1).toStringAsFixed(0);
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Update Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: const RoundedRectangleBorder(
                          borderRadius: AppRadius.md,
                        ),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final double added =
                                  double.tryParse(addQtyCtrl.text) ?? 1.0;
                              if (added <= 0) return;

                              setSheetState(() => isSubmitting = true);

                              try {
                                await ApiClient().dio.post(
                                  '/inventory/items',
                                  data: {
                                    'item_code': barcode,
                                    'item_name': name,
                                    'quantity': added,
                                  },
                                );

                                if (sheetCtx.mounted) {
                                  Navigator.pop(sheetCtx);
                                }
                                if (mounted) {
                                  ref.invalidate(stockProvider);

                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Row(
                                        children: [
                                          const Icon(Icons.check_circle,
                                              color: Colors.white, size: 20),
                                          const SizedBox(width: 8),
                                          Expanded(
                                              child: Text(
                                                  'Updated stock for "$name" (+${added.toStringAsFixed(0)} $unit)!')),
                                        ],
                                      ),
                                      backgroundColor: AppColors.green,
                                      duration: const Duration(seconds: 3),
                                    ),
                                  );
                                }
                              } catch (e) {
                                setSheetState(() => isSubmitting = false);
                                if (sheetCtx.mounted) {
                                  ScaffoldMessenger.of(sheetCtx).showSnackBar(
                                    const SnackBar(
                                      content: Text('Failed to update stock.'),
                                      backgroundColor: AppColors.red,
                                    ),
                                  );
                                }
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.add_shopping_cart, size: 19),
                                const SizedBox(width: 8),
                                Text(
                                  'Add +${addQtyCtrl.text} $unit to Stock',
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ── Manual Barcode Entry Dialog ─────────────────────────────────────────────

  Future<void> _promptManualEntry() async {
    final manualCtrl = TextEditingController();
    final entered = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter Barcode Manually',
            style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700)),
        content: TextField(
          controller: manualCtrl,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. 8901030381023 or SKU-101',
            prefixIcon: Icon(Icons.keyboard_alt_outlined),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, manualCtrl.text.trim()),
            child: const Text('Proceed', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (entered != null && entered.isNotEmpty) {
      _onBarcodeDetected(entered);
    }
  }

  // ── Pick Image from Gallery ─────────────────────────────────────────────────

  Future<void> _pickGalleryBarcode() async {
    final picker = ImagePicker();
    final XFile? file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;

    try {
      final capture = await _controller.analyzeImage(file.path);
      if (capture == null || capture.barcodes.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content:
                    Text('No readable barcode or QR code in selected photo.')),
          );
        }
      } else {
        final code = capture.barcodes.first.rawValue;
        if (code != null && code.isNotEmpty) {
          _onBarcodeDetected(code);
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not analyze selected photo.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Barcode Scanner',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Scan product barcode to add item',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: Colors.white70,
              ),
            ),
          ],
        ),
        actions: [
          // Flashlight Toggle
          IconButton(
            tooltip: 'Flashlight',
            icon: Icon(
              _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
              color: _isTorchOn ? Colors.amber : Colors.white,
            ),
            onPressed: () async {
              await _controller.toggleTorch();
              setState(() => _isTorchOn = !_isTorchOn);
            },
          ),
          // Camera Switch
          IconButton(
            tooltip: 'Switch Camera',
            icon: const Icon(Icons.cameraswitch_outlined, color: Colors.white),
            onPressed: () async {
              await _controller.switchCamera();
              setState(() => _isFrontCam = !_isFrontCam);
            },
          ),
          // Gallery Image
          IconButton(
            tooltip: 'Gallery',
            icon: const Icon(Icons.photo_library_outlined, color: Colors.white),
            onPressed: _pickGalleryBarcode,
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Live Camera Stream
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_isProcessing) return;
              final barcodes = capture.barcodes;
              if (barcodes.isNotEmpty) {
                final raw = barcodes.first.rawValue;
                if (raw != null && raw.isNotEmpty) {
                  _onBarcodeDetected(raw);
                }
              }
            },
          ),

          // Custom Darkened Viewfinder Overlay
          const CustomPaint(
            size: Size.infinite,
            painter: _ViewfinderOverlayPainter(
              frameSize: 260,
              cornerColor: AppColors.primary,
            ),
          ),

          // Laser Sweep Animation Line
          AnimatedBuilder(
            animation: _animController,
            builder: (ctx, child) {
              return Positioned(
                top: (MediaQuery.of(context).size.height / 2 - 130) +
                    (_animController.value * 240),
                child: Container(
                  width: 240,
                  height: 2.5,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withAlpha(0),
                        AppColors.primary,
                        AppColors.primary.withAlpha(0),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withAlpha(180),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Top / Bottom Helper Guidance
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(180),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.crop_free_rounded,
                          color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Align barcode inside the frame',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Manual Entry Fallback Button
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white38),
                    backgroundColor: Colors.black.withAlpha(100),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  onPressed: _promptManualEntry,
                  icon: const Icon(Icons.keyboard_alt_outlined, size: 18),
                  label: const Text(
                    'Enter Code Manually',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Processing Indicator
          if (_isProcessing)
            Container(
              color: Colors.black.withAlpha(160),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      strokeWidth: 3,
                      color: AppColors.primary,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Checking barcode...',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Custom Reticle Overlay Painter ────────────────────────────────────────────

class _ViewfinderOverlayPainter extends CustomPainter {
  final double frameSize;
  final Color cornerColor;

  const _ViewfinderOverlayPainter({
    required this.frameSize,
    required this.cornerColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final rect = Rect.fromCenter(
        center: center, width: frameSize, height: frameSize);

    // Darkened outer mask
    final backgroundPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final cutoutPath = Path()
      ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(16)));
    final maskPath =
        Path.combine(PathOperation.difference, backgroundPath, cutoutPath);

    final maskPaint = Paint()..color = Colors.black.withAlpha(140);
    canvas.drawPath(maskPath, maskPaint);

    // Corner guides
    final cornerPaint = Paint()
      ..color = cornerColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    const cornerLength = 28.0;
    final r = rect;

    // Top-Left
    canvas.drawLine(
        Offset(r.left, r.top + cornerLength), Offset(r.left, r.top), cornerPaint);
    canvas.drawLine(
        Offset(r.left, r.top), Offset(r.left + cornerLength, r.top), cornerPaint);

    // Top-Right
    canvas.drawLine(
        Offset(r.right - cornerLength, r.top), Offset(r.right, r.top), cornerPaint);
    canvas.drawLine(
        Offset(r.right, r.top), Offset(r.right, r.top + cornerLength), cornerPaint);

    // Bottom-Left
    canvas.drawLine(Offset(r.left, r.bottom - cornerLength),
        Offset(r.left, r.bottom), cornerPaint);
    canvas.drawLine(Offset(r.left, r.bottom),
        Offset(r.left + cornerLength, r.bottom), cornerPaint);

    // Bottom-Right
    canvas.drawLine(Offset(r.right - cornerLength, r.bottom),
        Offset(r.right, r.bottom), cornerPaint);
    canvas.drawLine(Offset(r.right, r.bottom),
        Offset(r.right, r.bottom - cornerLength), cornerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

const TextInputType textInputKeyBoardTypeNumbers =
    TextInputType.numberWithOptions(decimal: false, signed: false);
