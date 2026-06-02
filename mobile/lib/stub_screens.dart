// ─────────────────────────────────────────────────────────────────────────────
// Stub screens — light theme, no emojis, clean professional cards.
// Each module expands into full screens in subsequent development sprints.
// ─────────────────────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';

// ── Reusable stub scaffold ────────────────────────────────────────────────────

Scaffold _stub(String title, IconData icon, Color iconColor, String name,
    List<String> features) =>
    Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: Text(title),
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: _ModuleStub(icon: icon, iconColor: iconColor,
          name: name, features: features),
    );

// ── Sales Screen ──────────────────────────────────────────────────────────────
class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _stub('Sales', Icons.receipt_long_outlined, AppColors.primary,
          'Sales Module', [
        'Quotations', 'Sales Orders', 'GST Invoices',
        'WhatsApp Share', 'Payment Reminders',
      ]);
}

class InvoiceScreen extends ConsumerWidget {
  final String invoiceId;
  const InvoiceScreen({super.key, required this.invoiceId});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
        backgroundColor: AppColors.pageBg,
        appBar: AppBar(
          backgroundColor: AppColors.cardBg,
          title: Text('Invoice $invoiceId'),
          elevation: 0,
        ),
        body: const Center(
          child: Text('Invoice detail', style: AppTextStyles.body),
        ),
      );
}

// ── Purchase Screen ───────────────────────────────────────────────────────────
class PurchaseScreen extends ConsumerWidget {
  const PurchaseScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _stub('Purchase', Icons.shopping_cart_outlined, AppColors.amber,
          'Purchase Module', [
        'Supplier Bills', 'Purchase Orders', 'GRN Entry',
        'ITC Tracking', 'Supplier Ledger',
      ]);
}

// ── Dispatch Screen ───────────────────────────────────────────────────────────
class DispatchScreen extends ConsumerWidget {
  const DispatchScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _stub('Transport & Dispatch', Icons.local_shipping_outlined, AppColors.info,
          'Transport Module', [
        'LR Upload & OCR', 'Dispatch Tracking', 'Delivery POD',
        'Transporter Ledger', 'Freight Calculation',
      ]);
}

// ── Ledger Screen ─────────────────────────────────────────────────────────────
class LedgerScreen extends ConsumerWidget {
  const LedgerScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _stub('Accounting', Icons.account_balance_outlined, AppColors.green,
          'Accounting Module', [
        'Voucher List', 'Party Ledger', 'Outstanding',
        'GST Summary', 'Tally Sync Status',
      ]);
}

// ── Stock Movement Screen ─────────────────────────────────────────────────────
class StockMovementScreen extends ConsumerWidget {
  const StockMovementScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      _stub('Stock Movement', Icons.sync_alt_rounded, AppColors.purple,
          'Stock Movement', [
        'Inward Entry', 'Outward Entry', 'Warehouse Transfer',
        'Batch Tracking', 'Manual Adjustment',
      ]);
}

// ── Extraction Review Screen ──────────────────────────────────────────────────
class ExtractionReviewScreen extends ConsumerWidget {
  final String extractionId;
  const ExtractionReviewScreen({super.key, required this.extractionId});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
        backgroundColor: AppColors.pageBg,
        appBar: AppBar(
          backgroundColor: AppColors.cardBg,
          title: const Text('Review Extraction'),
          elevation: 0,
        ),
        body: Center(
          child: Text(
            'Extraction ID: $extractionId',
            style: AppTextStyles.body.copyWith(color: AppColors.primary),
          ),
        ),
      );
}

// ── Stub widget ───────────────────────────────────────────────────────────────
class _ModuleStub extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String name;
  final List<String> features;

  const _ModuleStub({
    required this.icon,
    required this.iconColor,
    required this.name,
    required this.features,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: iconColor.withAlpha((0.10 * 255).round()),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: iconColor.withAlpha((0.2 * 255).round())),
              ),
              child: Icon(icon, color: iconColor, size: 36),
            ),
            const SizedBox(height: 20),
            Text(
              name,
              style: AppTextStyles.sectionTitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Mobile interface coming in Sprint 2',
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 28),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: cardDecoration(),
              child: Column(
                children: features.map((f) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      Container(
                        width: 22, height: 22,
                        decoration: BoxDecoration(
                          color: AppColors.greenBg,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: const Icon(Icons.check,
                            color: AppColors.green, size: 14),
                      ),
                      const SizedBox(width: 10),
                      Text(f, style: AppTextStyles.body),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
