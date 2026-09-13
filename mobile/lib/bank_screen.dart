import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'theme.dart';

class BankScreen extends ConsumerStatefulWidget {
  const BankScreen({super.key});

  @override
  ConsumerState<BankScreen> createState() => _BankScreenState();
}

class _BankScreenState extends ConsumerState<BankScreen> {
  final String _selectedAccount = 'HDFC Current A/c - 50200012345';
  bool _uploading = false;

  final List<Map<String, dynamic>> _demoTxns = [
    {
      'id': 'tx-1',
      'date': '12 Sep 2026',
      'party': 'Reliance Polymers Limited',
      'narration': 'NEFT/RELIANCE/009124',
      'amount': 147500.0,
      'isDebit': true,
      'status': 'Exact Match',
      'statusColor': AppColors.green,
      'statusBg': AppColors.greenBg,
    },
    {
      'id': 'tx-2',
      'date': '11 Sep 2026',
      'party': 'Supreme Petrochem Ltd',
      'narration': 'RTGS/SUPREME/44812',
      'amount': 88500.0,
      'isDebit': true,
      'status': 'Suggested',
      'statusColor': AppColors.amber,
      'statusBg': AppColors.amberBg,
    },
    {
      'id': 'tx-3',
      'date': '10 Sep 2026',
      'party': 'Customer Advance',
      'narration': 'UPI/9859855998/ADV',
      'amount': 45000.0,
      'isDebit': false,
      'status': 'Missing Entry',
      'statusColor': AppColors.purple,
      'statusBg': Color(0xFFF5F3FF),
    },
    {
      'id': 'tx-4',
      'date': '09 Sep 2026',
      'party': 'Bank Charges',
      'narration': 'CHG/MONTHLY/SMS',
      'amount': 1180.0,
      'isDebit': true,
      'status': 'Missing Entry',
      'statusColor': AppColors.purple,
      'statusBg': Color(0xFFF5F3FF),
    },
  ];

  Future<void> _pickAndUploadStatement() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'xlsx', 'xls', 'csv'],
    );
    if (result == null || result.files.isEmpty) return;

    setState(() => _uploading = true);
    await Future.delayed(const Duration(milliseconds: 1400));
    if (mounted) {
      setState(() => _uploading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Statement ${result.files.first.name} imported & analyzed!'),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('Bank & BRS', style: AppTextStyles.pageTitle),
        elevation: 0,
        scrolledUnderElevation: 1,
        actions: [
          IconButton(
            tooltip: 'Import Statement',
            icon: const Icon(Icons.upload_file_rounded, color: AppColors.primary),
            onPressed: _pickAndUploadStatement,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => await Future.delayed(const Duration(milliseconds: 600)),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Bank Account Selector Card ─────────────────────────────
              Container(
                padding: const EdgeInsets.all(14),
                decoration: cardDecoration(),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.account_balance_rounded, color: AppColors.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Active Bank Account',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _selectedAccount,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text1,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── BRS Summary Hero Card ──────────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: AppRadius.lg,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(40),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'RECONCILIATION SUMMARY',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            color: Colors.white60,
                          ),
                        ),
                        Text(
                          'Sep 2026',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.amber,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _summaryItem('Bank Balance', '₹ 11,25,000', Colors.white),
                        _summaryItem('Books Balance', '₹ 10,81,180', Colors.white70),
                        _summaryItem('Difference', '₹ 43,820', AppColors.amber),
                      ],
                    ),
                    const SizedBox(height: 16),
                    LinearProgressIndicator(
                      value: 0.75,
                      backgroundColor: Colors.white12,
                      color: AppColors.green,
                      borderRadius: BorderRadius.circular(4),
                      minHeight: 6,
                    ),
                    const SizedBox(height: 8),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '75% Transactions Reconciled with Tally Books',
                        style: TextStyle(fontSize: 11, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Action Buttons ─────────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _uploading ? null : _pickAndUploadStatement,
                      icon: _uploading
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.upload_file_rounded, size: 16),
                      label: Text(_uploading ? 'Analyzing…' : 'Import Statement'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Auto-creating missing vouchers...')),
                      );
                    },
                    icon: const Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.primary),
                    label: const Text('Auto-Match'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: AppRadius.md),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Recent Bank Entries ────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'Statement Transactions',
                    style: AppTextStyles.sectionTitle,
                  ),
                  Text(
                    '4 items',
                    style: TextStyle(fontSize: 12, color: AppColors.text3),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              ..._demoTxns.map((tx) {
                final isDebit = tx['isDebit'] as bool;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: cardDecoration(),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isDebit ? AppColors.redBg : AppColors.greenBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          isDebit ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                          color: isDebit ? AppColors.red : AppColors.green,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tx['party'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${tx['date']} · ${tx['narration']}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.text3,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${isDebit ? '-' : '+'} ₹ ${(tx['amount'] as double).toStringAsFixed(0)}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDebit ? AppColors.text1 : AppColors.green,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: tx['statusBg'] as Color,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              tx['status'] as String,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: tx['statusColor'] as Color,
                              ),
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

  static Widget _summaryItem(String label, String value, Color valColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.white60),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: valColor,
          ),
        ),
      ],
    );
  }
}
