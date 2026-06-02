import 'package:flutter/material.dart';

// ── Light-theme colour palette — matches web dashboard tokens ──────────────────

class AppColors {
  // Backgrounds
  static const pageBg   = Color(0xFFF1F4F9); // #f1f4f9
  static const cardBg   = Color(0xFFFFFFFF); // #ffffff
  static const rowHover = Color(0xFFF8FAFC); // #f8fafc

  // Borders & dividers
  static const border   = Color(0xFFE2E8F0); // #e2e8f0
  static const divider  = Color(0xFFF1F5F9); // #f1f5f9

  // Text
  static const text1 = Color(0xFF0F172A); // primary black text
  static const text2 = Color(0xFF334155); // secondary text
  static const text3 = Color(0xFF64748B); // muted text
  static const text4 = Color(0xFF94A3B8); // placeholder / very muted

  // Brand / accent
  static const primary   = Color(0xFF4361EE); // blue primary
  static const primaryBg = Color(0xFFEFF6FF); // blue tint bg

  // Status colours
  static const green   = Color(0xFF16A34A);
  static const greenBg = Color(0xFFF0FDF4);
  static const amber   = Color(0xFFD97706);
  static const amberBg = Color(0xFFFFFBEB);
  static const red     = Color(0xFFDC2626);
  static const redBg   = Color(0xFFFFF1F2);
  static const purple  = Color(0xFF7C3AED);
  static const info    = Color(0xFF0891B2);

  // Convenience aliases kept for legacy refs
  static const background = pageBg;
  static const card       = cardBg;
  static const muted      = text3;
  static const success    = green;
  static const error      = red;
  static const warning    = amber;
  // ── Legacy dark-theme aliases (backward compat) ─────────────────────────
  static const inkDark    = pageBg;   // was dark bg
  static const steelDark  = cardBg;   // was card/appbar bg
  static const cardDark   = cardBg;   // was card bg
  static const borderDark = border;   // was dark border
  static const textMuted  = text3;    // muted text
  static const textPrimary = text2;   // secondary text
  static const textWhite  = Colors.white;
  static const textLight  = text1;
  static const cyan       = info;     // was cyan accent → now info blue
  static const cyanDim    = Color(0xFF0E7490);
  static const amberDim   = Color(0xFFB45309);
  static const steelLightSurface = divider;
  static const cardLight  = cardBg;
  static const inkLight   = pageBg;
}

// ── Typography — Inter via system sans-serif fallback ─────────────────────────

class AppTextStyles {
  static const _inter = 'Inter';

  // Headings
  static const pageTitle = TextStyle(
    fontFamily: _inter, fontSize: 22, fontWeight: FontWeight.w800,
    color: AppColors.text1, letterSpacing: -0.4,
  );
  static const sectionTitle = TextStyle(
    fontFamily: _inter, fontSize: 16, fontWeight: FontWeight.w700,
    color: AppColors.text1,
  );
  static const cardTitle = TextStyle(
    fontFamily: _inter, fontSize: 13, fontWeight: FontWeight.w700,
    color: AppColors.text1,
  );

  // Labels
  static const label = TextStyle(
    fontFamily: _inter, fontSize: 11, fontWeight: FontWeight.w600,
    color: AppColors.text3, letterSpacing: 0.5,
  );
  static const labelCaps = TextStyle(
    fontFamily: _inter, fontSize: 11, fontWeight: FontWeight.w600,
    color: AppColors.text3, letterSpacing: 0.5,
  );

  // Body
  static const body = TextStyle(
    fontFamily: _inter, fontSize: 13, fontWeight: FontWeight.w400,
    color: AppColors.text2, height: 1.6,
  );
  static const bodySmall = TextStyle(
    fontFamily: _inter, fontSize: 12, fontWeight: FontWeight.w400,
    color: AppColors.text3, height: 1.5,
  );
  static const bodyMuted = TextStyle(
    fontFamily: _inter, fontSize: 12, fontWeight: FontWeight.w400,
    color: AppColors.text4,
  );

  // Numeric / amounts
  static const amount = TextStyle(
    fontFamily: _inter, fontSize: 20, fontWeight: FontWeight.w800,
    color: AppColors.text1, letterSpacing: -0.5,
  );
  static const amountSmall = TextStyle(
    fontFamily: _inter, fontSize: 14, fontWeight: FontWeight.w700,
    color: AppColors.text1,
  );

  // Aliases for legacy code
  static const heading    = pageTitle;
  static const mono       = body;
  static const monoSmall  = bodySmall;
  static const heroTitle  = pageTitle;
}

// ── Spacing ──────────────────────────────────────────────────────────────────

class AppSpacing {
  static const xs  = 4.0;
  static const sm  = 8.0;
  static const md  = 16.0;
  static const lg  = 24.0;
  static const xl  = 32.0;
  static const xxl = 48.0;
}

class AppRadius {
  static const sm   = BorderRadius.all(Radius.circular(8));
  static const md   = BorderRadius.all(Radius.circular(12));
  static const lg   = BorderRadius.all(Radius.circular(16));
  static const xl   = BorderRadius.all(Radius.circular(24));
  static const full = BorderRadius.all(Radius.circular(999));
}

// ── Card decoration shortcut ─────────────────────────────────────────────────

BoxDecoration cardDecoration({
  Color bg = AppColors.cardBg,
  BorderRadius borderRadius = AppRadius.md,
}) => BoxDecoration(
  color: bg,
  borderRadius: borderRadius,
  border: Border.all(color: AppColors.border),
  boxShadow: const [
    BoxShadow(
      color: Color(0x08000000),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ],
);

// ── Badge widget ─────────────────────────────────────────────────────────────

Widget statusBadge(String label, {Color color = AppColors.primary, Color? bg}) {
  final bgColor = bg ?? color.withAlpha((0.12 * 255).round());
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: bgColor,
      borderRadius: AppRadius.full,
    ),
    child: Text(
      label,
      style: TextStyle(
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: color,
      ),
    ),
  );
}

// ── Theme data ───────────────────────────────────────────────────────────────

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.pageBg,
    fontFamily: 'Inter',

    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      secondary: AppColors.amber,
      surface: AppColors.cardBg,
      error: AppColors.red,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: AppColors.text1,
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.cardBg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shadowColor: Color(0x14000000),
      scrolledUnderElevation: 1,
      iconTheme: IconThemeData(color: AppColors.text2),
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: AppColors.text1,
      ),
    ),

    cardTheme: CardThemeData(
      color: AppColors.cardBg,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.md,
        side: const BorderSide(color: AppColors.border),
      ),
      margin: EdgeInsets.zero,
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.cardBg,
      border: OutlineInputBorder(
        borderRadius: AppRadius.sm,
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadius.sm,
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadius.sm,
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: AppRadius.sm,
        borderSide: const BorderSide(color: AppColors.red),
      ),
      hintStyle: AppTextStyles.bodyMuted,
      labelStyle: AppTextStyles.label,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.transparent,
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.sm),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.border),
        textStyle: const TextStyle(
          fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w600,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.sm),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        textStyle: const TextStyle(
          fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w600,
        ),
      ),
    ),

    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.cardBg,
      indicatorColor: AppColors.primaryBg,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontFamily: 'Inter', fontSize: 11,
            fontWeight: FontWeight.w700, color: AppColors.primary,
          );
        }
        return const TextStyle(
          fontFamily: 'Inter', fontSize: 11,
          fontWeight: FontWeight.w500, color: AppColors.text3,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: AppColors.primary, size: 22);
        }
        return const IconThemeData(color: AppColors.text3, size: 22);
      }),
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shadowColor: const Color(0x14000000),
    ),

    dividerColor: AppColors.divider,
    dividerTheme: const DividerThemeData(
      color: AppColors.divider,
      thickness: 1,
      space: 1,
    ),

    listTileTheme: const ListTileThemeData(
      tileColor: AppColors.cardBg,
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    ),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.primary,
    ),

    textTheme: const TextTheme(
      displayLarge: AppTextStyles.pageTitle,
      titleLarge:   AppTextStyles.sectionTitle,
      titleMedium:  AppTextStyles.cardTitle,
      bodyLarge:    AppTextStyles.body,
      bodyMedium:   AppTextStyles.bodySmall,
      labelSmall:   AppTextStyles.label,
    ),
  );

  // Keep a dark fallback (optional, won't be used by default anymore)
  static ThemeData get dark => light;
}
