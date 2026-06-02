import 'package:flutter/material.dart';
import 'theme.dart';

class SectionHeader extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color iconColor;
  final Widget? action;

  const SectionHeader({
    super.key,
    required this.label,
    required this.icon,
    this.iconColor = AppColors.primary,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 22, height: 22,
          decoration: BoxDecoration(
            color: iconColor.withAlpha((0.10 * 255).round()),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Icon(icon, color: iconColor, size: 13),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.text1,
            letterSpacing: -0.1,
          ),
        ),
        if (action != null) ...[
          const Spacer(),
          action!,
        ],
      ],
    );
  }
}
