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
    path: "/ai-verification",
    label: "AI Upload & Verification",
    badge: "AI",
    icon: "M12 2a4 4 0 014 4v1h1a3 3 0 013 3v6a3 3 0 01-3 3H7a3 3 0 01-3-3V10a3 3 0 013-3h1V6a4 4 0 014-4z M9 14h.01 M15 14h.01 M9.5 17.5s1 1 2.5 1 2.5-1 2.5-1",
    desc: "Extract & verify invoices, bills, receipts",
  },
  {
    path: "/tally-sync",
    label: "ERP Sync Hub",
    badge: "SYNC",
    icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    desc: "Push entries to TallyPrime & Odoo ERP",
  },
  {
    path: "/bank-recon",
    label: "Bank Automation & BRS",
    badge: "BRS",
    icon: "M3 21h18 M3 10h18 M5 10v11 M9 10v11 M15 10v11 M19 10v11 M12 2L2 7h20L12 2z",
    desc: "Import statements, auto-vouchers & BRS",
  },
  {
    path: "/settings",
    label: "Settings",
    badge: "",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    desc: "App configuration & ERP connections",
  },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [tallyStatus, setTallyStatus] = useState<{ connected: boolean; message?: string } | null>(null);
  const [odooStatus, setOdooStatus] = useState<{ connected: boolean; message?: string } | null>(null);
  const [testingTally, setTestingTally] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [lanUrl, setLanUrl] = useState("http://localhost:8000/api/v1");

  // Check Tally & Odoo connections periodically & on mount
  const checkErpConnections = async () => {
    setTestingTally(true);
    try {
      const res = await api.get("/erp/connection/test/tally");
      setTallyStatus(res.data);
    } catch {
      setTallyStatus({ connected: false, message: "TallyPrime offline" });
    } finally {
      setTestingTally(false);
    }

    try {
      const oRes = await api.get("/erp/connection/test/odoo");
      setOdooStatus(oRes.data);
    } catch {
      setOdooStatus({ connected: false, message: "Odoo offline" });
    }
  };
  const checkTally = checkErpConnections;

  useEffect(() => {
    checkErpConnections();
    const interval = setInterval(checkErpConnections, 30000);
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
                Daynisc ERP
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
          {/* Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span
              onClick={() => navigate("/ai-verification")}
              style={{ color: "#64748b", fontWeight: 500, cursor: "pointer" }}
            >
              Home
            </span>
            <span style={{ color: "#cbd5e1", fontSize: 12 }}>&gt;</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>
              {currentNav?.label || "AI Upload & Verification"}
            </span>
          </div>

          {/* Search, Notifications & User Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Global Search Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "6px 12px",
                width: 250,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search anything..."
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 12,
                  color: "#0f172a",
                  width: "100%",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Ctrl + K
              </span>
            </div>

            {/* ERP Live Indicator Pill */}
            <div
              onClick={() => navigate("/tally-sync")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
              title="Click to open ERP Sync Hub (Tally & Odoo)"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: tallyStatus?.connected ? "#16a34a" : "#cbd5e1"
                }} />
                <span style={{ color: tallyStatus?.connected ? "#15803d" : "#94a3b8" }}>Tally</span>
              </div>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: odooStatus?.connected ? "#7c3aed" : "#cbd5e1"
                }} />
                <span style={{ color: odooStatus?.connected ? "#6d28d9" : "#94a3b8" }}>Odoo</span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              style={{
                background: "none",
                border: "none",
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                padding: 6,
                borderRadius: 6,
              }}
              title="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "1.5px solid #ffffff",
                }}
              />
            </button>

            {/* User Avatar Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
                padding: "4px 6px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#3b82f6",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : "D"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  {user?.name || "Demo User"}
                </span>
                <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>
                  {user?.role || "Owner"}
                </span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
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
