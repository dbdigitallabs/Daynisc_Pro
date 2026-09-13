import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';

class AccountingScreen extends ConsumerStatefulWidget {
  const AccountingScreen({super.key});

  @override
  ConsumerState<AccountingScreen> createState() => _AccountingScreenState();
}

class _AccountingScreenState extends ConsumerState<AccountingScreen> {
  bool _syncing = false;
  String _activeFilter = 'All';

  final List<Map<String, dynamic>> _vouchers = [
    {
      'vchNo': 'PUR/2026/089',
      'type': 'Purchase',
      'party': 'Reliance Polymers Limited',
      'date': '12 Sep 2026',
      'amount': 147500.0,
      'synced': true,
    },
    {
      'vchNo': 'PUR/2026/090',
      'type': 'Purchase',
      'party': 'Supreme Petrochem Ltd',
      'date': '11 Sep 2026',
      'amount': 88500.0,
      'synced': false,
    },
    {
      'vchNo': 'SAL/2026/041',
      'type': 'Sales',
      'party': 'Gujarat Masterbatches Pvt Ltd',
      'date': '11 Sep 2026',
      'amount': 210000.0,
      'synced': true,
    },
    {
      'vchNo': 'PAY/2026/012',
      'type': 'Payment',
      'party': 'VRL Logistics Ltd',
      'date': '10 Sep 2026',
      'amount': 18500.0,
      'synced': false,
    },
  ];

  Future<void> _syncPendingToTally() async {
    setState(() => _syncing = true);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (mounted) {
      setState(() {
        _syncing = false;
        for (var v in _vouchers) {
          v['synced'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ All pending vouchers synced directly to Tally Prime!'),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingCount = _vouchers.where((v) => v['synced'] == false).length;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Accounting & Tally', style: AppTextStyles.pageTitle),
        elevation: 0,
        scrolledUnderElevation: 1,
        actions: [
          IconButton(
            tooltip: 'Sync with Tally',
            icon: _syncing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  )
                : const Icon(Icons.sync_rounded, color: AppColors.primary),
            onPressed: _syncing ? null : _syncPendingToTally,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => await Future.delayed(const Duration(milliseconds: 500)),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Tally Status Hero Card ─────────────────────────────────
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: AppRadius.lg,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1E3A8A).withAlpha(50),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Color(0xFF22C55E),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Color(0xFF22C55E), blurRadius: 6),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'TALLY PRIME CONNECTED',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                            color: Colors.white70,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white12,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Port 9000',
                            style: TextStyle(fontSize: 10, color: Colors.white, fontFamily: 'monospace'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Active Company',
                              style: TextStyle(fontSize: 11, color: Colors.white60),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'DB Digital Labs',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ],
                        ),
                        if (pendingCount > 0)
                          ElevatedButton.icon(
                            onPressed: _syncing ? null : _syncPendingToTally,
                            icon: const Icon(Icons.upload_rounded, size: 14),
                            label: Text('Sync ($pendingCount)'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // ── Financial Quick KPIs ───────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: cardDecoration(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Purchases (Mtd)', style: TextStyle(fontSize: 11, color: AppColors.text3)),
                          SizedBox(height: 4),
                          Text('₹ 2,36,000', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.text1)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: cardDecoration(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Sales (Mtd)', style: TextStyle(fontSize: 11, color: AppColors.text3)),
                          SizedBox(height: 4),
                          Text('₹ 4,80,000', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.green)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),

              // ── Filter Chips ───────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Voucher Entries', style: AppTextStyles.sectionTitle),
                  Row(
                    children: ['All', 'Purchase', 'Sales'].map((f) {
                      final isSelected = _activeFilter == f;
                      return Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: ChoiceChip(
                          label: Text(f),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _activeFilter = f),
                          selectedColor: AppColors.primaryBg,
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? AppColors.primary : AppColors.text3,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // ── Vouchers List ──────────────────────────────────────────
              ..._vouchers
                  .where((v) => _activeFilter == 'All' || v['type'] == _activeFilter)
                  .map((v) {
                final isSynced = v['synced'] as bool;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: cardDecoration(),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: v['type'] == 'Purchase'
                              ? AppColors.amberBg
                              : v['type'] == 'Sales'
                                  ? AppColors.primaryBg
                                  : AppColors.greenBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          v['type'] == 'Purchase'
                              ? Icons.shopping_cart_outlined
                              : v['type'] == 'Sales'
                                  ? Icons.receipt_long_outlined
                                  : Icons.payment_outlined,
                          color: v['type'] == 'Purchase'
                              ? AppColors.amber
                              : v['type'] == 'Sales'
                                  ? AppColors.primary
                                  : AppColors.green,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              v['party'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${v['vchNo']} · ${v['date']}',
                              style: const TextStyle(fontSize: 11, color: AppColors.text3),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₹ ${(v['amount'] as double).toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.text1,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isSynced ? AppColors.greenBg : AppColors.amberBg,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isSynced ? Icons.check_circle_outline : Icons.pending_outlined,
                                  size: 10,
                                  color: isSynced ? AppColors.green : AppColors.amber,
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  isSynced ? 'In Tally' : 'Pending Sync',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: isSynced ? AppColors.green : AppColors.amber,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
