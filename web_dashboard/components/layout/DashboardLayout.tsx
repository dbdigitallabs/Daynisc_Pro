// src/components/layout/DashboardLayout.tsx
import { useState, useEffect, useRef } from "react";
import logoApp from "/logo_app.png";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../store/apiClient";
import { toast } from "react-hot-toast";


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
  tree:       "M6 3v12 M18 9a3 3 0 100-6 3 3 0 000 6z M6 18a3 3 0 100-6 3 3 0 000 6z M6 6a3 3 0 100-6 3 3 0 000 6z M9 15h3a5 5 0 005-5V9",
  beaker:     "M6 2h12 M6 2v4a5 5 0 002 4v8a4 4 0 008 0v-8a5 5 0 002-4V2 M6 18h12",
};

const NAV = [
  { path: "/dashboard",           label: "Dashboard",           icon: "dashboard" },
  { path: "/masters",             label: "Masters",             icon: "reports" },
  { path: "/accounting",          label: "Accounting",          icon: "accounting" },
  { path: "/banking",             label: "Banking",             icon: "accounting" },
  { path: "/sales",               label: "Sales",               icon: "sales" },
  { path: "/crm",                 label: "CRM",                 icon: "user" },
  { path: "/purchase",            label: "Purchase",            icon: "purchase" },
  { path: "/inventory",           label: "Inventory",           icon: "inventory" },
  { path: "/assets",              label: "Assets",              icon: "reports" },
  { path: "/production",          label: "Production",          icon: "production" },
  { path: "/transport",           label: "Transport",           icon: "transport" },
  { path: "/gst",                 label: "GST Returns",         icon: "gst" },
  { path: "/reports",             label: "Reports",             icon: "reports" },
  { path: "/ai-center",           label: "AI Center",           icon: "ai" },
  { path: "/ai-verification",     label: "AI Upload & Verification", icon: "ai" },
  { path: "/presentation",        label: "Academic Presentation", icon: "reports" },
  { path: "/document-hub",        label: "Document Hub",        icon: "gst" },
  { path: "/workflow",            label: "Workflow",            icon: "accounting" },
  { path: "/automation-builder",  label: "Automation Builder",  icon: "ai" },
  { path: "/vendor-portal",       label: "Vendor Portal",       icon: "user" },
  { path: "/customer-portal",     label: "Customer Portal",     icon: "user" },
  { path: "/calendar",            label: "Calendar",            icon: "gst" },
  { path: "/marketplace",         label: "Marketplace",         icon: "reports" },
  { path: "/tally-integration",   label: "Tally Integration",   icon: "erp" },
  { path: "/notifications",       label: "Notifications",       icon: "dashboard" },
  { path: "/administration",      label: "Administration",      icon: "settings" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, company, token, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [lanUrl, setLanUrl] = useState("http://localhost:8000/api/v1");

  // Top Bar & Test Section States
  const [testSectionOpen, setTestSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  
  // Ctrl + K Global Search Overlay
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchVal, setGlobalSearchVal] = useState("");
  
  // Floating FAB Quick Create menu
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Collapsible sidebar sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("daynisc_expanded_sections");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "Core ERP": true,
      "AI & Automation": false,
      "Portals": false,
      "Administration": false
    };
  });

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem("daynisc_expanded_sections", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    const handleKd = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKd);
    return () => window.removeEventListener("keydown", handleKd);
  }, []);

  // Mobile upload notification pop-up state
  const [activePopupDoc, setActivePopupDoc] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const lastSeenDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Initialize last seen ID
    api.get("/documents?limit=1")
      .then(res => {
        const firstDoc = res.data?.items?.[0];
        if (firstDoc) {
          lastSeenDocIdRef.current = firstDoc.id;
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      if (!active) return;
      api.get("/documents?limit=1")
        .then(res => {
          const latestDoc = res.data?.items?.[0];
          if (latestDoc && latestDoc.id !== lastSeenDocIdRef.current) {
            // Found a new document!
            lastSeenDocIdRef.current = latestDoc.id;
            
            // Pop up!
            setActivePopupDoc(latestDoc);
            setShowPopup(true);

            // Also show a toast notification
            toast.success(`New document uploaded from mobile: ${latestDoc.filename || latestDoc.original_filename || "Document"}`);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    api.get("/health")
      .then(res => {
        if (res.data?.lan_url) {
          setLanUrl(res.data.lan_url);
        }
      })
      .catch(() => {
        setLanUrl(`${window.location.protocol}//${window.location.hostname}:8000/api/v1`);
      });
  }, []);

  const isSuperAdmin = user?.role === "super_admin";

  const mainNav = isSuperAdmin
    ? [
        { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { path: "/super-admin", label: "Business Tree", icon: "tree" }
      ]
    : NAV;

  const testNav = isSuperAdmin
    ? NAV.filter(item => item.path !== "/dashboard")
    : [];

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
            <img src={logoApp} style={{ width: 36, height: 36, objectFit: "contain" }} alt="Logo" />
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
          {isSuperAdmin ? (
            mainNav.map(({ path, label, icon }) => (
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
                    <span style={{ 
                      opacity: isActive ? 1 : 0.5, 
                      flexShrink: 0,
                      transform: isActive ? "scale(1.1)" : "none",
                      transition: "all 0.2s"
                    }}>
                      <Ic d={Icons[icon]} size={16} />
                    </span>
                    {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                  </>
                )}
              </NavLink>
            ))
          ) : (
            [
              {
                title: "Core ERP",
                items: mainNav.filter(item => [
                  "/dashboard", "/masters", "/accounting", "/banking", "/sales", "/crm",
                  "/purchase", "/inventory", "/assets", "/production", "/transport", "/gst", "/reports"
                ].includes(item.path))
              },
              {
                title: "AI & Automation",
                items: mainNav.filter(item => [
                  "/ai-center", "/ai-verification", "/presentation", "/workflow", "/automation-builder", "/document-hub"
                ].includes(item.path))
              },
              {
                title: "Portals",
                items: mainNav.filter(item => [
                  "/vendor-portal", "/customer-portal", "/calendar", "/marketplace"
                ].includes(item.path))
              },
              {
                title: "Administration",
                items: mainNav.filter(item => [
                  "/tally-integration", "/notifications", "/administration"
                ].includes(item.path))
              }
            ].map((sec, secIdx) => {
              const isExpanded = expandedSections[sec.title];
              return (
                <div key={secIdx} style={{ marginBottom: 12 }}>
                  {!collapsed && (
                    <div
                      onClick={() => toggleSection(sec.title)}
                      style={{
                        padding: "6px 18px 4px",
                        fontSize: 9, color: S.textMuted, letterSpacing: 2,
                        fontWeight: 700, textTransform: "uppercase",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", userSelect: "none"
                      }}
                    >
                      <span>{sec.title}</span>
                      <span style={{ fontSize: 8 }}>{isExpanded ? "▼" : "▶"}</span>
                    </div>
                  )}
                  {(collapsed || isExpanded) && sec.items.map(({ path, label, icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={path === "/dashboard"}
                      style={({ isActive }) => ({
                        display: "flex", alignItems: "center",
                        gap: 10, textDecoration: "none",
                        padding: collapsed ? "10px 0" : "8px 18px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        margin: "1px 8px",
                        borderRadius: 8,
                        color: isActive ? "#fff" : S.textSub,
                        background: isActive ? S.activeItem : "transparent",
                        borderLeft: isActive && !collapsed ? `3px solid ${S.activeBdr}` : "3px solid transparent",
                        transition: "all 0.15s",
                        fontSize: 12, fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                      })}
                      title={collapsed ? label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span style={{
                            opacity: isActive ? 1 : 0.5,
                            flexShrink: 0,
                            transform: isActive ? "scale(1.1)" : "none",
                            transition: "all 0.2s"
                          }}>
                            <Ic d={Icons[icon]} size={16} />
                          </span>
                          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              );
            })
          )}

          {isSuperAdmin && testNav.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {/* Accordion Header */}
              <button
                onClick={() => setTestSectionOpen(!testSectionOpen)}
                style={{
                  display: "flex", alignItems: "center",
                  width: "100%", background: "none", border: "none",
                  padding: collapsed ? "10px 0" : "9px 18px",
                  justifyContent: collapsed ? "center" : "space-between",
                  color: testSectionOpen ? "#fff" : S.textSub,
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  transition: "all 0.15s",
                }}
                title={collapsed ? "Test Section" : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ opacity: testSectionOpen ? 1 : 0.6, display: "flex", alignItems: "center" }}>
                    <Ic d={Icons.beaker} size={16} />
                  </span>
                  {!collapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>Test Section</span>}
                </div>
                {!collapsed && (
                  <span style={{
                    transform: testSectionOpen ? "rotate(-90deg)" : "rotate(90deg)",
                    transition: "transform 0.2s", display: "flex", alignItems: "center"
                  }}>
                    <Ic d={Icons.chevron} size={10} />
                  </span>
                )}
              </button>

              {/* Accordion Content */}
              {(testSectionOpen || collapsed) && (
                <div style={{
                  display: "flex", flexDirection: "column",
                  marginLeft: collapsed ? 0 : 12,
                  paddingLeft: collapsed ? 0 : 8,
                  borderLeft: collapsed ? "none" : `1px solid rgba(255,255,255,0.15)`,
                  marginTop: 2,
                  gap: 1,
                }}>
                  {testNav.map(({ path, label, icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      style={({ isActive }) => ({
                        display: "flex", alignItems: "center",
                        gap: 10, textDecoration: "none",
                        padding: collapsed ? "8px 0" : "8px 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        margin: "1px 4px",
                        borderRadius: 6,
                        color: isActive ? "#fff" : S.textSub,
                        background: isActive ? S.activeItem : "transparent",
                        transition: "all 0.15s",
                        fontSize: 12, fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                      })}
                      title={collapsed ? label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span style={{ opacity: isActive ? 1 : 0.5, flexShrink: 0 }}>
                            <Ic d={Icons[icon]} size={14} />
                          </span>
                          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
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
            borderRadius: 8, padding: "6px 12px", width: 240,
            position: "relative",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search anything... (Ctrl + K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  toast.success(`Search submitted for: "${searchQuery}"`);
                }
              }}
              style={{
                border: "none", background: "transparent", outline: "none",
                fontSize: 12, color: "#1e293b", width: "100%",
              }}
            />
          </div>
          
          {/* Notification bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowAccountMenu(false);
              }}
              style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
              }}
              title="Notifications: 2 approvals, 1 GST, 2 payments"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span style={{
                position: "absolute", top: -5, right: -5,
                background: "#ef4444", color: "#fff",
                borderRadius: "50%", width: 16, height: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, border: "1.5px solid #fff"
              }}>5</span>
            </button>

            {showNotifications && (
              <div style={{
                position: "absolute", top: 46, right: 0,
                width: 280, background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                zIndex: 100, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>Notifications</span>
                  <button
                    onClick={() => {
                      toast.success("Notifications marked as read!");
                      setShowNotifications(false);
                    }}
                    style={{ background: "none", border: "none", fontSize: 10, color: "#4361ee", fontWeight: 600, cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {[
                    { section: "Today", items: [{ title: "Approval Pending", desc: "Voucher #PUR-3001 needs manager sign-off", time: "10m ago", color: "#f59e0b" }] },
                    { section: "Yesterday", items: [
                      { title: "GST Reminder", desc: "GSTR-1 filing due on July 10", time: "1d ago", color: "#ef4444" },
                      { title: "Invoice Paid", desc: "Sharma Traders settled ₹5,00,000", time: "1d ago", color: "#22c55e" }
                    ] },
                    { section: "Earlier", items: [{ title: "Backup Completed", desc: "Amazon S3 backup archives generated", time: "3d ago", color: "#3b82f6" }] }
                  ].map((sec, secIdx) => (
                    <div key={secIdx}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "6px 0 4px" }}>{sec.section}</div>
                      {sec.items.map((n, idx) => (
                        <div key={idx} style={{ padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: n.color }} />
                            <span style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>{n.title}</span>
                          </div>
                          <p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0 12px" }}>{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sync Mobile App Button */}
          <button
            onClick={() => setShowSyncModal(true)}
            style={{
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748b",
            }}
            title="Sync Mobile App"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </button>

          {/* Avatar Dropdown */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => {
                setShowAccountMenu(!showAccountMenu);
                setShowNotifications(false);
              }}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(67, 97, 238, 0.3)",
              }}
            >
              {(user?.name || "A")[0].toUpperCase()}
            </div>

            {showAccountMenu && (
              <div style={{
                position: "absolute", top: 46, right: 0,
                width: 220, background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                zIndex: 100, padding: 12,
              }}>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                    {user?.name || "Bhavesh Khimsuriya"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, textTransform: "capitalize" }}>
                    {user?.role?.replace("_", " ") || "Super Admin"}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, fontFamily: "monospace" }}>
                    {user?.email || "bhavesh@daynisc.com"}
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    onClick={() => { setShowAccountMenu(false); navigate("/super-admin"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px",
                      border: "none", background: "none", borderRadius: 6, width: "100%",
                      textAlign: "left", fontSize: 12, color: "#334155", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}><Ic d={Icons.tree} size={14} /></span>
                    Business Tree
                  </button>
                  <button
                    onClick={() => { setShowAccountMenu(false); navigate("/settings"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px",
                      border: "none", background: "none", borderRadius: 6, width: "100%",
                      textAlign: "left", fontSize: 12, color: "#334155", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}><Ic d={Icons.settings} size={14} /></span>
                    Settings
                  </button>
                  <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
                  <button
                    onClick={() => { logout(); navigate("/login"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px",
                      border: "none", background: "none", borderRadius: 6, width: "100%",
                      textAlign: "left", fontSize: 12, color: "#ef4444", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ display: "flex", alignItems: "center", color: "#ef4444" }}><Ic d={Icons.logout} size={14} /></span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>

      {/* ── Sync Mobile App Modal ────────────────────────────────────────── */}
      {showSyncModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 15, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 16,
            padding: 32,
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            position: "relative",
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowSyncModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8892a4",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Sync Mobile App
            </h3>
            <p style={{ color: "#8892a4", fontSize: 12, marginBottom: 24 }}>
              Scan to pair your device and log in instantly
            </p>

            <div style={{
              padding: 12,
              background: "#fff",
              borderRadius: 12,
              display: "inline-block",
              boxShadow: "0 8px 30px rgba(99,130,255,0.1)",
              marginBottom: 24,
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  JSON.stringify({
                    url: lanUrl,
                    token: token || "demo-jwt-token-daynisc-2025",
                    refresh_token: refreshToken || "demo-jwt-token-daynisc-2025-refresh"
                  })
                )}`}
                alt="Sync QR Code"
                style={{ width: 200, height: 200, display: "block" }}
              />
            </div>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #2a3347",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              textAlign: "left",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f5a623", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                PC Endpoint URL
              </div>
              <code style={{ fontSize: 11, color: "#d6dae6", fontFamily: "monospace", wordBreak: "break-all" }}>
                {lanUrl}
              </code>
            </div>

            <button
              onClick={() => setShowSyncModal(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#4361ee",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Slide-in Mobile Upload Popup Notification ────────────────────────── */}
      {showPopup && activePopupDoc && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 320,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid #4361ee",
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(67, 97, 238, 0.2)",
          padding: 16,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontFamily: "'Inter', sans-serif",
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateY(100px) scale(0.95); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes pulse {
              0% { transform: scale(0.9); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.5; }
              100% { transform: scale(0.9); opacity: 1; }
            }
          `}</style>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontWeight: 800,
              color: "#4361ee",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4361ee", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              Mobile Upload Received
            </span>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: "1",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* Doc Metadata */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px 0", wordBreak: "break-all" }}>
              {activePopupDoc.original_filename || activePopupDoc.filename || "Document"}
            </h4>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#7c3aed",
                background: "#f5f3ff",
                padding: "2px 6px",
                borderRadius: 4,
                textTransform: "uppercase"
              }}>
                {activePopupDoc.document_type?.replace("_", " ") || "Other"}
              </span>
              <span style={{ fontSize: 10, color: "#64748b" }}>
                Confidence: {Math.round((activePopupDoc.confidence_score || 0.95) * 100)}%
              </span>
            </div>
          </div>

          {/* Extracted summary details */}
          {activePopupDoc.extracted_data && (
            <div style={{
              background: "rgba(248, 250, 252, 0.8)",
              borderRadius: 8,
              padding: "8px 10px",
              border: "1px solid #e2e8f0",
              fontSize: 11,
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}>
              {(activePopupDoc.extracted_data.party_name || activePopupDoc.extracted_data.transporter_name) && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Party:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activePopupDoc.extracted_data.party_name || activePopupDoc.extracted_data.transporter_name}
                  </span>
                </div>
              )}
              {activePopupDoc.extracted_data.invoice_number && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Ref #:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {activePopupDoc.extracted_data.invoice_number}
                  </span>
                </div>
              )}
              {activePopupDoc.extracted_data.total_amount !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 4, marginTop: 2 }}>
                  <span style={{ color: "#64748b" }}>Amount:</span>
                  <span style={{ fontWeight: 700, color: "#16a34a" }}>
                    ₹{Number(activePopupDoc.extracted_data.total_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={() => {
                setShowPopup(false);
                navigate("/ai-verification");
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "#4361ee",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
                boxShadow: "0 2px 6px rgba(67, 97, 238, 0.2)",
              }}
            >
              Verify Now
            </button>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                padding: "8px 12px",
                background: "#f1f5f9",
                color: "#334155",
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Ctrl + K Global Search Modal ────────────────────────────────────── */}
      {showSearchModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
            width: "100%", maxWidth: 550, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: 20
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Command Palette (Ctrl + K)</span>
              <button
                onClick={() => { setShowSearchModal(false); setGlobalSearchVal(""); }}
                style={{ background: "none", border: "none", fontSize: 18, color: "#64748b", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search customers, vendors, invoices, ledgers, reports, or menus..."
              value={globalSearchVal}
              onChange={(e) => setGlobalSearchVal(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", border: "1.5px solid #4361ee",
                borderRadius: 8, fontSize: 13, outline: "none", marginBottom: 12
              }}
              autoFocus
            />

            {/* Filtered list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {[
                { label: "Go to Dashboard", category: "Menu", path: "/dashboard" },
                { label: "Go to Masters", category: "Menu", path: "/masters" },
                { label: "Go to Sales Registry", category: "Menu", path: "/sales" },
                { label: "Go to Purchase Registry", category: "Menu", path: "/purchase" },
                { label: "Go to Accounting Ledgers", category: "Menu", path: "/accounting" },
                { label: "Go to Banking", category: "Menu", path: "/banking" },
                { label: "Go to CRM Leads Board", category: "Menu", path: "/crm" },
                { label: "Go to Inventory", category: "Menu", path: "/inventory" },
                { label: "Go to Fixed Assets & Depreciation", category: "Menu", path: "/assets" },
                { label: "Go to Automation Builder", category: "Menu", path: "/automation-builder" },
                { label: "Go to Document Hub", category: "Menu", path: "/document-hub" },
                { label: "Go to AI Center", category: "Menu", path: "/ai-center" },
                { label: "Sharma Traders", category: "Customer", path: "/masters" },
                { label: "Patel Enterprises", category: "Customer", path: "/masters" },
                { label: "Reliance Polymers Ltd", category: "Vendor", path: "/masters" },
                { label: "Supreme Plastics Ltd", category: "Vendor", path: "/masters" },
                { label: "Invoice #INV-2026-001", category: "Sales Invoice", path: "/sales" },
                { label: "Purchase Voucher #PUR-3001", category: "Purchase Voucher", path: "/purchase" },
                { label: "Capital Account Ledger", category: "Ledger", path: "/accounting" },
                { label: "Sales Account Ledger", category: "Ledger", path: "/accounting" },
                { label: "Profit & Loss Report", category: "Report", path: "/reports" },
                { label: "Balance Sheet Report", category: "Report", path: "/reports" },
                { label: "GSTR-1 Filing Summary", category: "Report", path: "/gst" },
                { label: "GSTR-2B Reconciliation Report", category: "Report", path: "/gst" }
              ].filter(item => 
                item.label.toLowerCase().includes(globalSearchVal.toLowerCase()) ||
                item.category.toLowerCase().includes(globalSearchVal.toLowerCase())
              ).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    navigate(item.path);
                    setShowSearchModal(false);
                    setGlobalSearchVal("");
                  }}
                  style={{
                    padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1e293b",
                    cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4361ee"; e.currentTarget.style.background = "#f5f7ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", fontWeight: 700, color: "#475569" }}>{item.category}</span>
                    <span>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748b" }}>⏎ Select</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating FAB Quick Create Menu ──────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 24, right: 90, zIndex: 99999 }}>
        <button
          onClick={() => setShowQuickCreate(!showQuickCreate)}
          style={{
            width: 50, height: 50, borderRadius: "50%", background: "#4361ee",
            color: "#fff", border: "none", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(67, 97, 238, 0.4)", transition: "all 0.2s"
          }}
          title="Quick Create"
        >
          {showQuickCreate ? "×" : "+"}
        </button>
        
        {showQuickCreate && (
          <div style={{
            position: "absolute", bottom: 58, right: 0, background: "#fff",
            border: `1px solid #e2e8f0`, borderRadius: 12, width: 170,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)", padding: 8, display: "flex",
            flexDirection: "column", gap: 4
          }}>
            {[
              { label: "New Customer", path: "/masters" },
              { label: "New Invoice", path: "/sales" },
              { label: "New Purchase", path: "/purchase" },
              { label: "New Vendor", path: "/masters" },
              { label: "New Payment", path: "/accounting" }
            ].map(act => (
              <button
                key={act.label}
                onClick={() => {
                  navigate(act.path);
                  setShowQuickCreate(false);
                }}
                style={{
                  width: "100%", padding: "8px 10px", background: "none",
                  border: "none", borderRadius: 6, textAlign: "left",
                  fontSize: 12, color: "#334155", cursor: "pointer",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                ➕ {act.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
