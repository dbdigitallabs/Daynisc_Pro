import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'theme.dart';
import 'app_router.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final box = Hive.box('auth');
    final user = box.get('user') as Map?;
    final company = box.get('company') as Map?;
    final apiBaseUrl = box.get('api_base_url') as String? ?? 'Not Connected';

    final userName = user?['name']?.toString() ?? 'Bhavesh Khimsuriya';
    final userEmail = user?['email']?.toString() ?? 'bhavesh@daynisc.com';
    final userPhone = user?['phone']?.toString() ?? '9999999999';
    final userRole = user?['role']?.toString() ?? 'super_admin';

    final companyName = company?['name']?.toString() ?? 'Daynisc Pvt Ltd';
    final companyGstin = company?['gstin']?.toString() ?? '27AABCD1234E1Z5';
    final subscriptionPlan = company?['plan']?.toString() ?? 'Enterprise';
    final dbSchema = company?['db_schema']?.toString() ?? 'co_daynisc';
    final expiryDate = company?['subscription_expiry']?.toString() ?? '2025-12-31';

    // Format role for display
    final roleDisplay = userRole.replaceAll('_', ' ').toUpperCase();

    // Get initials for avatar
    final initials = userName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text('My Profile'),
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── User Identity Card ──────────────────────────────────────────
            Container(
              decoration: cardDecoration(),
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.primaryBg,
                    child: Text(
                      initials.isNotEmpty ? initials : 'BK',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName,
                          style: AppTextStyles.sectionTitle.copyWith(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          userEmail,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.text3,
                          ),
                        ),
                        Text(
                          '+91 $userPhone',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.text3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        statusBadge(roleDisplay, color: AppColors.primary),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── Company Details Card ────────────────────────────────────────
            Container(
              decoration: cardDecoration(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.business_outlined, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'COMPANY DETAILS',
                        style: AppTextStyles.label.copyWith(
                          fontSize: 11,
                          letterSpacing: 0.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(),
                  ),
                  _buildProfileRow('Company Name', companyName),
                  const SizedBox(height: 12),
                  _buildProfileRow('GSTIN', companyGstin),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Plan Tier',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: AppColors.text3,
                        ),
                      ),
                      statusBadge(subscriptionPlan.toUpperCase(), color: AppColors.green),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildProfileRow('Expiry Date', expiryDate),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── Sync & Network Configuration Card ───────────────────────────
            Container(
              decoration: cardDecoration(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.sync_alt_outlined, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'SYNC & NETWORK CONFIGURATION',
                        style: AppTextStyles.label.copyWith(
                          fontSize: 11,
                          letterSpacing: 0.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(),
                  ),
                  _buildProfileRow('Active Server IP', apiBaseUrl),
                  const SizedBox(height: 12),
                  _buildProfileRow('Database Schema', dbSchema),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Sync Status',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: AppColors.text3,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Connected',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.green,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // ── Logout Action Button ────────────────────────────────────────
            ElevatedButton.icon(
              onPressed: () async {
                // Confirm Logout
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Confirm Logout'),
                    content: const Text('Are you sure you want to sign out of Daynisc?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        style: TextButton.styleFrom(foregroundColor: AppColors.red),
                        child: const Text('Logout'),
                      ),
                    ],
                  ),
                );

                if (confirm == true) {
                  final authBox = Hive.box('auth');
                  await authBox.deleteAll([
                    'access_token',
                    'refresh_token',
                    'company_id',
                    'user',
                    'company',
                  ]);
                  if (context.mounted) {
                    context.go(Routes.login);
                  }
                }
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Logout Session'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            color: AppColors.text3,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.text1,
            ),
          ),
        ),
      ],
    );
  }
}
