/**
 * shared/theme.ts
 * Single source of truth for light-theme design tokens.
 * Import this in every page.
 */
export const T = {
  // Backgrounds
  pageBg:   "#f1f4f9",
  cardBg:   "#ffffff",
  inputBg:  "#f8fafc",
  rowHover: "#f8fafc",

  // Borders
  border:   "#e2e8f0",
  divider:  "#f1f5f9",

  // Text
  text1:    "#0f172a",   // headings  – near-black
  text2:    "#334155",   // body
  text3:    "#64748b",   // muted
  text4:    "#94a3b8",   // placeholder

  // Accents
  primary:   "#4361ee",
  primaryBg: "#e0e7ff",
  accent:    "#4361ee",
  green:    "#16a34a",
  greenBg:  "#dcfce7",
  red:      "#dc2626",
  redBg:    "#fee2e2",
  amber:    "#d97706",
  amberBg:  "#fef3c7",
  purple:   "#7c3aed",
  purpleBg: "#f5f3ff",
  cyan:     "#0891b2",
  cyanBg:   "#e0f2fe",

  // Shadows
  shadow:   "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 24px rgba(0,0,0,0.10)",

  // Radius
  radius:   10,
  radiusSm: 6,
} as const;

/** Format Indian Rupee */
export const inr = (v: number | string | undefined | null) => {
  const n = Number(v || 0);
  return "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

/** White card wrapper style */
export const cardStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
  boxShadow: T.shadow,
  ...extra,
});

/** Badge helper */
export const badge = (color: string, bg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center",
  padding: "2px 9px", borderRadius: 20,
  fontSize: 11, fontWeight: 600,
  color, background: bg,
});

/** Table header cell */
export const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 11, fontWeight: 600,
  color: T.text3, textAlign: "left",
  background: "#f8fafc",
  borderBottom: `1px solid ${T.border}`,
  textTransform: "uppercase", letterSpacing: "0.5px",
};

/** Table data cell */
export const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13, color: T.text2,
  borderBottom: `1px solid ${T.divider}`,
  verticalAlign: "middle",
};
