// src/components/layout/DashboardLayout.tsx
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

// ── Design tokens ────────────────────────────────────────────────────────────
const S = {
  sidebarBg:    "linear-gradient(180deg, #0c1461 0%, #1a237e 100%)",
  sidebarBdr:   "rgba(255,255,255,0.08)",
  activeItem:   "rgba(99,130,255,0.18)",
  activeBdr:    "#6382ff",
  hoverItem:    "rgba(255,255,255,0.05)",
  textPrimary:  "#ffffff",
  textMuted:    "rgba(255,255,255,0.45)",
  textSub:      "rgba(255,255,255,0.6)",
  accent:       "#ffc107",
  sideW:        240,
  sideWCol:     64,
};

// ── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 17 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons: Record<string, string> = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  accounting: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  sales:      "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  purchase:   "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
  inventory:  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  production: "M2 20h20 M4 20V10 M8 20V4 M12 20v-8 M16 20V8 M20 20v-4",
  transport:  "M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  gst:        "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  ai:         "M12 2a4 4 0 014 4v1h1a3 3 0 013 3v6a3 3 0 01-3 3H7a3 3 0 01-3-3V10a3 3 0 013-3h1V6a4 4 0 014-4z M9 14h.01 M15 14h.01 M9.5 17.5s1 1 2.5 1 2.5-1 2.5-1",
  erp:        "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  reports:    "M18 20V10 M12 20V4 M6 20v-6",
  analytics:  "M21.21 15.89A10 10 0 118 2.83 M22 12A10 10 0 0012 2v10z",
  settings:   "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  logout:     "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  chevron:    "M15 18l-6-6 6-6",
  user:       "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
};

const NAV = [
  { path: "/dashboard",        label: "Dashboard",         icon: "dashboard" },
  { path: "/accounting",       label: "Accounting",        icon: "accounting" },
  { path: "/sales",            label: "Sales",             icon: "sales" },
  { path: "/purchase",         label: "Purchase",          icon: "purchase" },
  { path: "/inventory",        label: "Inventory",         icon: "inventory" },
  { path: "/production",       label: "Production",        icon: "production" },
  { path: "/transport",        label: "Transport",         icon: "transport" },
  { path: "/gst",              label: "GST Returns",       icon: "gst" },
  { path: "/ai-verification",  label: "AI Verification",   icon: "ai" },
  { path: "/erp-sync",         label: "Tally Integration", icon: "erp" },
  { path: "/settings",         label: "Settings",          icon: "settings" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, company, logout } = useAuthStore();
  const navigate = useNavigate();

  const w = collapsed ? S.sideWCol : S.sideW;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: w, minWidth: w, background: S.sidebarBg,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0, overflowY: "auto", overflowX: "hidden",
        boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
        position: "relative", zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{
          padding: collapsed ? "20px 0" : "20px 18px",
          borderBottom: `1px solid ${S.sidebarBdr}`,
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <img src="/logo_app.png" style={{ width: 36, height: 36, objectFit: "contain" }} alt="Logo" />
          </div>
          {!collapsed && (
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 800, fontSize: 17, color: "#fff",
                letterSpacing: "-0.3px", lineHeight: 1.2,
              }}>Daynisc</div>
              <div style={{
                fontSize: 9, color: S.accent, letterSpacing: 2,
                textTransform: "uppercase", fontWeight: 600, marginTop: 1,
              }}>ERP PLATFORM</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: collapsed ? 0 : "auto",
              background: "rgba(255,255,255,0.07)", border: "none",
              borderRadius: 6, width: 26, height: 26, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: S.textMuted, flexShrink: 0,
              transition: "background 0.15s",
            }}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 8 }}>
          {!collapsed && (
            <div style={{
              padding: "10px 18px 6px",
              fontSize: 9, color: S.textMuted, letterSpacing: 2.5,
              fontWeight: 600, textTransform: "uppercase",
            }}>Main Menu</div>
          )}

          {NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center",
                gap: 10, textDecoration: "none",
                padding: collapsed ? "10px 0" : "9px 18px",
                justifyContent: collapsed ? "center" : "flex-start",
                margin: "1px 8px",
                borderRadius: 8,
                color: isActive ? "#fff" : S.textSub,
                background: isActive ? S.activeItem : "transparent",
                borderLeft: isActive && !collapsed ? `3px solid ${S.activeBdr}` : "3px solid transparent",
                transition: "all 0.15s",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
              })}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>
                    <Ic d={Icons[icon]} size={16} />
                  </span>
                  {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Enterprise Plan Badge */}
        {!collapsed && (
          <div style={{
            margin: "0 12px 12px",
            background: "linear-gradient(135deg, rgba(99,130,255,0.25), rgba(124,58,237,0.25))",
            border: "1px solid rgba(99,130,255,0.3)",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 10, color: S.accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
              Enterprise Plan
            </div>
            <div style={{ fontSize: 10, color: S.textMuted, lineHeight: 1.5 }}>
              {company?.name || "Your Plan"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              Valid till 31 Dec 2025
            </div>
          </div>
        )}

        {/* User */}
        <div style={{
          padding: collapsed ? "12px 0" : "12px 14px",
          borderTop: `1px solid ${S.sidebarBdr}`,
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #4361ee, #7c3aed)",
            display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>
            {(user?.name || "A")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{
                  fontSize: 12, color: "#fff", fontWeight: 600,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{user?.name || "Admin"}</div>
                <div style={{ fontSize: 10, color: S.textMuted, marginTop: 1 }}>
                  {user?.role || "Super Admin"}
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: 6, width: 28, height: 28, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: S.textMuted, flexShrink: 0,
                }}
                title="Logout"
              >
                <Ic d={Icons.logout} size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", background: "#f1f4f9", display: "flex", flexDirection: "column" }}>
        {/* Top Header Bar */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #e2e8f0",
          padding: "0 28px", height: 58,
          display: "flex", alignItems: "center", gap: 16,
          flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ flex: 1 }} />
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "6px 12px", width: 220,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Search anything…</span>
          </div>
          {/* Notification bell */}
          <button style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 8, width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span style={{
              position: "absolute", top: 7, right: 7,
              width: 7, height: 7, background: "#ef4444",
              borderRadius: "50%", border: "1.5px solid #fff",
            }} />
          </button>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #4361ee, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}>
            {(user?.name || "A")[0].toUpperCase()}
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
