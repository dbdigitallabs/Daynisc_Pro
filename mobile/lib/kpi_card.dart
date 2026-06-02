import 'package:flutter/material.dart';
import 'theme.dart';

class KPICard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final Color? iconBg;
  final double? delta;
  final bool deltaIsGood;
  final VoidCallback? onTap;

  const KPICard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.iconColor = AppColors.primary,
    this.iconBg,
    this.delta,
    this.deltaIsGood = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = iconBg ?? iconColor.withAlpha((0.10 * 255).round());
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: cardDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: bg, borderRadius: AppRadius.sm),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const Spacer(),
                if (delta != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      borderRadius: AppRadius.full,
                      color: (deltaIsGood ? AppColors.green : AppColors.red).withAlpha((0.1 * 255).round()),
                    ),
                    child: Text(
                      '${delta! >= 0 ? '+' : ''}${delta!.toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: deltaIsGood && delta! >= 0 ? AppColors.green : AppColors.red,
                      ),
                    ),
                  ),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: iconColor,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.text3,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
