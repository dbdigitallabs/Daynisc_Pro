// src/components/layout/DashboardLayout.tsx
import { useState, useEffect } from "react";
import logoApp from "/logo_app.png";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../store/apiClient";
import { toast } from "react-hot-toast";
import { IconZap, IconSmartphone } from "../Icons";

// Design tokens
const S = {
  sidebarBg: "linear-gradient(180deg, #0b134d 0%, #161e68 100%)",
  sidebarBdr: "rgba(255,255,255,0.08)",
  activeItem: "rgba(99,130,255,0.22)",
  activeBdr: "#6382ff",
  hoverItem: "rgba(255,255,255,0.06)",
  textPrimary: "#ffffff",
  textMuted: "rgba(255,255,255,0.45)",
  textSub: "rgba(255,255,255,0.7)",
  accent: "#ffc107",
  sideW: 250,
  sideWCol: 68,
};

// SVG Icons
const Ic = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV_ITEMS = [
  {
    path: "/dashboard",
    label: "Home",
    badge: "MAIN",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    desc: "Executive overview & real-time KPIs",
  },
  {
    path: "/bank",
    label: "Bank",
    badge: "BRS",
    icon: "M3 21h18 M3 10h18 M5 10v11 M9 10v11 M15 10v11 M19 10v11 M12 2L2 7h20L12 2z",
    desc: "Statement import, reconciliation & BRS",
  },
  {
    path: "/accounting",
    label: "Accounting",
    badge: "BOOKS",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    desc: "Vouchers, ledgers & financial reports",
  },
  {
    path: "/inventory",
    label: "Inventory",
    badge: "STOCK",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    desc: "Godowns, barcode scanner & stock valuation",
  },
  {
    path: "/ai-verification",
    label: "AI Verification",
    badge: "AI",
    icon: "M12 2a4 4 0 014 4v1h1a3 3 0 013 3v6a3 3 0 01-3 3H7a3 3 0 01-3-3V10a3 3 0 013-3h1V6a4 4 0 014-4z M9 14h.01 M15 14h.01 M9.5 17.5s1 1 2.5 1 2.5-1 2.5-1",
    desc: "Extract & verify bills, receipts, invoices",
  },
  {
    path: "/tally-sync",
    label: "Tally Sync",
    badge: "SYNC",
    icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    desc: "Push approved entries to TallyPrime XML HTTP",
  },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [tallyStatus, setTallyStatus] = useState<{ connected: boolean; message?: string } | null>(null);
  const [testingTally, setTestingTally] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [lanUrl, setLanUrl] = useState("http://localhost:8000/api/v1");

  // Check Tally connection periodically & on mount
  const checkTally = async () => {
    setTestingTally(true);
    try {
      const res = await api.get("/erp/connection/test/tally");
      setTallyStatus(res.data);
    } catch {
      setTallyStatus({ connected: false, message: "TallyPrime offline" });
    } finally {
      setTestingTally(false);
    }
  };

  useEffect(() => {
    checkTally();
    const interval = setInterval(checkTally, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get("/health")
      .then((res) => {
        if (res.data?.lan_url) setLanUrl(res.data.lan_url);
      })
      .catch(() => {
        setLanUrl(`${window.location.protocol}//${window.location.hostname}:8000/api/v1`);
      });
  }, []);

  const w = collapsed ? S.sideWCol : S.sideW;
  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: w,
          minWidth: w,
          background: S.sidebarBg,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
          boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: collapsed ? "20px 0" : "20px 18px",
            borderBottom: `1px solid ${S.sidebarBdr}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: 4,
            }}
          >
            <img src={logoApp} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Logo" />
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#fff",
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                }}
              >
                Daynisc AI
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: S.accent,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                AI → TALLY SYNC
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: collapsed ? 0 : "auto",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 6,
              width: 26,
              height: 26,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: S.textMuted,
              flexShrink: 0,
            }}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
            </svg>
          </button>
        </div>

        {/* Workflow Guide Note (Expanded) */}
        {!collapsed && (
          <div
            style={{
              margin: "14px 14px 6px",
              padding: "10px 12px",
              background: "rgba(99,130,255,0.1)",
              borderRadius: 8,
              border: "1px solid rgba(99,130,255,0.2)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
              <IconZap size={13} color="#ffc107" /> 2-Step Workflow
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
              1. <b>AI Upload & Verify</b> invoices<br />
              2. <b>Sync directly</b> into Tally Prime
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          {NAV_ITEMS.map(({ path, label, icon, badge, desc }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                padding: collapsed ? "12px 0" : "11px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 10,
                color: isActive ? "#fff" : S.textSub,
                background: isActive ? S.activeItem : "transparent",
                borderLeft: isActive && !collapsed ? `3.5px solid ${S.activeBdr}` : "3.5px solid transparent",
                transition: "all 0.15s",
                cursor: "pointer",
              })}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <span
                    style={{
                      opacity: isActive ? 1 : 0.6,
                      flexShrink: 0,
                      color: isActive ? "#60a5fa" : "#ffffff",
                      transform: isActive ? "scale(1.1)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    <Ic d={icon} size={18} />
                  </span>
                  {!collapsed && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, whiteSpace: "nowrap" }}>
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: isActive ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.1)",
                            color: isActive ? "#bfdbfe" : S.textMuted,
                          }}
                        >
                          {badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: S.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {desc}
                      </div>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Tally Connectivity Box */}
        {!collapsed && (
          <div
            style={{
              margin: "12px 14px",
              padding: "10px 12px",
              background: tallyStatus?.connected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${tallyStatus?.connected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: tallyStatus?.connected ? "#22c55e" : "#ef4444",
                    boxShadow: tallyStatus?.connected ? "0 0 8px #22c55e" : "none",
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  TallyPrime HTTP
                </span>
              </div>
              <button
                onClick={checkTally}
                disabled={testingTally}
                style={{
                  background: "none",
                  border: "none",
                  color: S.textMuted,
                  cursor: "pointer",
                  fontSize: 10,
                  textDecoration: "underline",
                }}
              >
                {testingTally ? "Ping..." : "Check"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: tallyStatus?.connected ? "#86efac" : "#fca5a5", fontFamily: "monospace" }}>
              {tallyStatus?.connected ? "Ready on Port 9000" : "Port 9000 Offline"}
            </div>
          </div>
        )}

        {/* User profile & Logout */}
        <div
          style={{
            padding: collapsed ? "14px 0" : "12px 14px",
            borderTop: `1px solid ${S.sidebarBdr}`,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4361ee, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {user?.name ? user.name[0].toUpperCase() : "A"}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.name || "Admin"}
                </div>
                <div style={{ fontSize: 10, color: S.textMuted }}>
                  {user?.role || "Manager"}
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: S.textMuted,
                  flexShrink: 0,
                }}
                title="Logout"
              >
                <Ic d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9" size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
        {/* Top Header Bar */}
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 28px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* Active section title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {currentNav?.label || "Workspace"}
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              — {currentNav?.desc}
            </span>
          </div>

          {/* Quick Actions & Tally Status Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Tally live indicator */}
            <div
              onClick={checkTally}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                background: tallyStatus?.connected
                  ? "#dcfce7"
                  : (tallyStatus as any)?.tally_online && !(tallyStatus as any)?.company_open
                  ? "#fef3c7"
                  : "#fee2e2",
                color: tallyStatus?.connected
                  ? "#15803d"
                  : (tallyStatus as any)?.tally_online && !(tallyStatus as any)?.company_open
                  ? "#b45309"
                  : "#b91c1c",
                border: `1px solid ${
                  tallyStatus?.connected
                    ? "#86efac"
                    : (tallyStatus as any)?.tally_online && !(tallyStatus as any)?.company_open
                    ? "#f59e0b"
                    : "#fca5a5"
                }`,
              }}
              title="Click to test Tally connection"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: tallyStatus?.connected
                    ? "#16a34a"
                    : (tallyStatus as any)?.tally_online && !(tallyStatus as any)?.company_open
                    ? "#d97706"
                    : "#dc2626",
                }}
              />
              {testingTally
                ? "Testing Tally…"
                : tallyStatus?.connected
                ? `Tally: ${(tallyStatus as any)?.company_name || "Connected"}`
                : (tallyStatus as any)?.tally_online && !(tallyStatus as any)?.company_open
                ? "Open Company in Tally"
                : "TallyPrime Offline"}
            </div>

            {/* Mobile upload QR code */}
            <button
              onClick={() => setShowSyncModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
              title="Upload bills from mobile camera"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              Mobile Upload
            </button>

            {/* Fast navigation switch */}
            {location.pathname.includes("ai-verification") ? (
              <button
                onClick={() => navigate("/tally-sync")}
                style={{
                  padding: "6px 14px",
                  background: "#4361ee",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Go to Tally Sync →
              </button>
            ) : (
              <button
                onClick={() => navigate("/ai-verification")}
                style={{
                  padding: "6px 14px",
                  background: "#4361ee",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                + Upload New Bill
              </button>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>

        {/* ── Mobile Responsive Bottom Navigation Bar ──────────────────────── */}
        <nav
          style={{
            height: 58,
            background: "#0d1338",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            flexShrink: 0,
            zIndex: 90,
            padding: "0 10px",
          }}
        >
          {[
            { path: "/dashboard", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
            { path: "/bank", label: "Bank", icon: "M3 21h18 M3 10h18 M5 10v11 M9 10v11 M15 10v11 M19 10v11 M12 2L2 7h20L12 2z" },
            { path: "/accounting", label: "Accounting", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            { path: "/inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
          ].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 8,
                color: isActive ? "#ffc107" : "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? "rgba(255,193,7,0.12)" : "transparent",
                transition: "all 0.15s",
              })}
            >
              <Ic d={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Mobile QR Modal ──────────────────────────────────────────────── */}
      {showSyncModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <IconSmartphone size={20} color="#2563eb" /> Mobile Bill Scanner
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Scan with your phone to upload bills & receipts directly to the AI Verification queue.
            </p>

            {(() => {
              let hostName = "localhost";
              try {
                hostName = new URL(lanUrl).hostname;
              } catch (_) {}
              const qrPayload = JSON.stringify({
                url: lanUrl,
                token: localStorage.getItem("token") || "demo-jwt-token-daynisc-2025",
                name: "Daynisc ERP",
              });

              return (
                <>
                  <div
                    style={{
                      display: "inline-block",
                      padding: 12,
                      background: "#f8fafc",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      marginBottom: 14,
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(
                        qrPayload
                      )}`}
                      alt="Upload QR Code"
                      style={{ width: 190, height: 190, display: "block", borderRadius: 6 }}
                    />
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Server IP (Manual Link):</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>{hostName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>API Endpoint:</span>
                      <span style={{ fontSize: 11, color: "#0f172a", fontFamily: "monospace" }}>{lanUrl}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            <button
              onClick={() => setShowSyncModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
