import { useState, useRef } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";

export default function DownloadLandingPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"zip" | "exe">("zip");
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"ai" | "erp" | "recon">("ai");
  const exploreRef = useRef<HTMLDivElement>(null);

  const handleDownload = (type: "zip" | "exe" = "zip") => {
    setDownloading(true);
    setDownloadType(type);
    const fileName = type === "zip" ? "Daynisc-Pro-Windows.zip" : "Daynisc-Pro-Setup.exe";
    const downloadUrl = `/downloads/${fileName}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setShowDownloadModal(true);
    }, 700);
  };

  const scrollToExplore = () => {
    exploreRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      color: "#f1f5f9",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: "relative",
      overflowX: "hidden",
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* Dynamic Background Glow Elements */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 600,
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.22), rgba(124, 58, 237, 0.12), transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{
        position: "fixed",
        top: 250,
        left: "15%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{
        position: "fixed",
        top: 350,
        right: "15%",
        width: 450,
        height: 450,
        background: "radial-gradient(circle, rgba(147, 51, 234, 0.14) 0%, transparent 70%)",
        filter: "blur(70px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Embedded CSS */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .aurora-gradient-text {
          background: linear-gradient(120deg, #60a5fa 0%, #38bdf8 30%, #a855f7 70%, #ec4899 100%);
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          color: transparent !important;
          display: inline-block;
        }
        .preview-glass-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(59, 130, 246, 0.12);
        }
        .hover-lift {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        @media (max-width: 840px) {
          .desktop-nav { display: none !important; }
          .mockup-body { flex-direction: column !important; }
          .mockup-sidebar { display: none !important; }
        }
      `}</style>

      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <header style={{
        maxWidth: 1320,
        margin: "0 auto",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 30,
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          }}>
            <img
              src={logoApp}
              alt="Daynisc Logo"
              style={{ width: 26, height: 26, objectFit: "contain" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.4px" }}>
              Daynisc
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.4px" }}>
              Pro
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              marginLeft: 6,
            }}>
              DESKTOP V1.0
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: 36,
          background: "rgba(15, 23, 42, 0.6)",
          padding: "8px 24px",
          borderRadius: 9999,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(12px)",
        }}
        className="desktop-nav"
        >
          {[
            { name: "Overview", id: "hero" },
            { name: "Dashboard App", id: "preview" },
            { name: "ERP Integrations", id: "integrations" },
            { name: "Bank BRS", id: "features" },
          ].map((item) => (
            <a
              key={item.name}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById(item.id);
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: 500,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Top Right: CTA Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/ai-verification")}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 9999,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.color = "#cbd5e1";
            }}
          >
            Launch Web App
          </button>

          <button
            onClick={() => handleDownload("zip")}
            disabled={downloading}
            className="hover-lift"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#ffffff",
              border: "none",
              borderRadius: 9999,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(37, 99, 235, 0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
            </svg>
            <span>{downloading ? "Downloading..." : "Download for Windows"}</span>
          </button>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          position: "relative",
          zIndex: 20,
          textAlign: "center",
          padding: "48px 24px 32px",
          maxWidth: 1040,
          margin: "0 auto",
        }}
      >
        {/* Release Pill */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(30, 41, 59, 0.7)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: 9999,
          padding: "6px 16px",
          marginBottom: 24,
          backdropFilter: "blur(10px)",
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 10px #22c55e",
            animation: "pulseDot 2s infinite ease-in-out",
          }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#e2e8f0" }}>
            Windows Application Ready: Native TallyPrime &amp; Odoo ERP Sync
          </span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: "clamp(42px, 5.8vw, 76px)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          margin: "0 0 16px 0",
          color: "#ffffff",
        }}>
          Accounting Automation
          <br />
          <span className="aurora-gradient-text">
            Built for Windows &amp; Local ERPs.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: "clamp(15px, 1.7vw, 18px)",
          color: "#94a3b8",
          lineHeight: 1.65,
          maxWidth: 680,
          margin: "0 auto 36px",
          fontWeight: 400,
        }}>
          Extract invoices with high-accuracy Vision AI, reconcile bank statements, and sync directly into <b>TallyPrime (Port 9000)</b> or <b>Odoo ERP (Port 8069)</b> without leaving your desktop.
        </p>

        {/* Dual Primary CTA */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}>
          {/* Windows Setup Download Button */}
          <button
            onClick={() => handleDownload("zip")}
            disabled={downloading}
            className="hover-lift"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 11,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 14,
              padding: "16px 34px",
              fontSize: 15.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(37, 99, 235, 0.45)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
            </svg>
            <div style={{ textAlign: "left" }}>
              <div>{downloading ? "Preparing Application..." : "Download for Windows"}</div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>Daynisc-Pro-Windows.zip (Zero Warnings)</div>
            </div>
            <span style={{ fontSize: 18, marginLeft: 4 }}>↓</span>
          </button>

          {/* Web App Direct Launch Button */}
          <button
            onClick={() => navigate("/ai-verification")}
            className="hover-lift"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(15, 23, 42, 0.8)",
              color: "#f8fafc",
              border: "1.5px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 14,
              padding: "16px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
            }}
          >
            <span>Open Web Dashboard</span>
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        {/* System Specs & Privacy Trust Row */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          fontSize: 12.5,
          color: "#64748b",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#38bdf8" }}>✓</span> Windows 11 / 10 (64-bit)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#22c55e" }}>✓</span> 100% Local On-Premise Data
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#a855f7" }}>✓</span> TallyPrime 3.0+ &amp; Odoo 14-18+
          </span>
        </div>
      </section>

      {/* ── Desktop Dashboard Application Interactive Showcase ───────────── */}
      <section
        id="preview"
        style={{
          maxWidth: 1240,
          margin: "32px auto 80px",
          padding: "0 24px",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Interactive View Tabs */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginBottom: 18,
        }}>
          {[
            { id: "ai", label: "AI Verification Dashboard", icon: "✨" },
            { id: "erp", label: "Tally & Odoo Sync Hub", icon: "⚡" },
            { id: "recon", label: "Bank Reconciliation (BRS)", icon: "🏦" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePreviewTab(tab.id as any)}
              style={{
                padding: "8px 18px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: activePreviewTab === tab.id
                  ? "1px solid rgba(56, 189, 248, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                background: activePreviewTab === tab.id
                  ? "rgba(37, 99, 235, 0.25)"
                  : "rgba(15, 23, 42, 0.5)",
                color: activePreviewTab === tab.id ? "#38bdf8" : "#94a3b8",
                transition: "all 0.15s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Windows Application Window Mockup */}
        <div className="preview-glass-card" style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}>
          {/* Windows Title Bar */}
          <div style={{
            height: 42,
            background: "#0c1322",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            userSelect: "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img src={logoApp} alt="Logo" style={{ width: 12, height: 12 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#94a3b8" }}>
                Daynisc Pro Desktop — {activePreviewTab === "ai" ? "AI Voucher Extraction" : activePreviewTab === "erp" ? "ERP Sync Controller" : "Bank Reconciliation BRS"}
              </span>
            </div>

            {/* Live Connection Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#22c55e",
                background: "rgba(34, 197, 94, 0.1)",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid rgba(34, 197, 94, 0.25)",
              }}>
                ● TallyPrime (Port 9000): Online
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#a855f7",
                background: "rgba(168, 85, 247, 0.1)",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid rgba(168, 85, 247, 0.25)",
              }}>
                ● Odoo XML-RPC: Ready
              </span>
            </div>

            {/* Window Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13, color: "#64748b", cursor: "pointer" }}>—</span>
              <span style={{ fontSize: 11, color: "#64748b", cursor: "pointer" }}>▢</span>
              <span style={{ fontSize: 14, color: "#64748b", cursor: "pointer" }}>✕</span>
            </div>
          </div>

          {/* Window Interior Content */}
          <div className="mockup-body" style={{ display: "flex", minHeight: 460, background: "#0b101b" }}>
            {/* Sidebar Mockup */}
            <div className="mockup-sidebar" style={{
              width: 220,
              background: "#080c14",
              borderRight: "1px solid rgba(255, 255, 255, 0.06)",
              padding: "18px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 8px", marginBottom: 6 }}>
                Core Modules
              </div>
              {[
                { id: "ai", label: "AI Verification", count: "12", active: activePreviewTab === "ai" },
                { id: "erp", label: "ERP Sync Hub", count: "5", active: activePreviewTab === "erp" },
                { id: "recon", label: "Bank Reconciliation", count: "8", active: activePreviewTab === "recon" },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActivePreviewTab(item.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? "#ffffff" : "#94a3b8",
                    background: item.active ? "rgba(37, 99, 235, 0.2)" : "transparent",
                    border: item.active ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{
                    fontSize: 11,
                    background: item.active ? "#2563eb" : "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}>
                    {item.count}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: "auto", padding: "12px", background: "rgba(15, 23, 42, 0.6)", borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>Sync Engine Active</div>
                <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.4 }}>
                  Auto-syncing vouchers to local accounting database.
                </div>
              </div>
            </div>

            {/* Main Stage Panel */}
            <div style={{ flex: 1, padding: "24px", overflowX: "auto" }}>
              {activePreviewTab === "ai" && (
                <div>
                  {/* Top Stats Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Ready for ERP</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", marginTop: 4 }}>12 Vouchers</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>OCR Accuracy</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>99.8%</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Extracted Amount</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginTop: 4 }}>₹4,82,450.00</div>
                    </div>
                  </div>

                  {/* Active Document Card Preview */}
                  <div style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    borderRadius: 14,
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    padding: "20px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>📄</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                            Invoice #INV-2026-894 — Apex Infotech Pvt Ltd
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            GSTIN: 27AABCA1234F1Z5 • Maharashtra (Local IGST/CGST Auto-detected)
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          High Confidence 99.8%
                        </span>
                        <button
                          onClick={() => navigate("/ai-verification")}
                          style={{
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Sync to Tally →
                        </button>
                      </div>
                    </div>

                    {/* Extracted Line Items Table */}
                    <div style={{
                      background: "rgba(8, 12, 20, 0.6)",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr 1fr", padding: "8px 14px", background: "rgba(255, 255, 255, 0.03)", fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
                        <div>Item Description</div>
                        <div>HSN/SAC</div>
                        <div>Qty</div>
                        <div>Rate</div>
                        <div style={{ textAlign: "right" }}>Taxable Total</div>
                      </div>
                      {[
                        { name: "Dell OptiPlex 7090 Desktop Unit", hsn: "8471", qty: "5 Nos", rate: "₹62,000", total: "₹3,10,000" },
                        { name: "LG UltraFine 27-inch 4K Monitor", hsn: "8528", qty: "5 Nos", rate: "₹24,500", total: "₹1,22,500" },
                        { name: "Logitech MX Master 3S Wireless", hsn: "8471", qty: "5 Nos", rate: "₹8,500", total: "₹42,500" },
                      ].map((row, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid rgba(255, 255, 255, 0.04)", fontSize: 12, color: "#e2e8f0" }}>
                          <div>{row.name}</div>
                          <div style={{ color: "#94a3b8" }}>{row.hsn}</div>
                          <div>{row.qty}</div>
                          <div>{row.rate}</div>
                          <div style={{ textAlign: "right", fontWeight: 700, color: "#38bdf8" }}>{row.total}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "erp" && (
                <div>
                  <div style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: 14,
                    padding: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
                      Live ERP Voucher Queue &amp; Push Controller
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { id: "VCH-091", party: "Tata Consultancy Services Ltd", type: "Sales Invoice", erp: "TallyPrime", status: "Synced", port: "Port 9000", color: "#22c55e" },
                        { id: "VCH-092", party: "Reliance Retail Enterprise", type: "Purchase Bill", erp: "Odoo ERP", status: "Ready", port: "Port 8069", color: "#a855f7" },
                        { id: "VCH-093", party: "Infosys Technologies Ltd", type: "Payment Receipt", erp: "TallyPrime", status: "Synced", port: "Port 9000", color: "#22c55e" },
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: "rgba(8, 12, 20, 0.6)",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginRight: 8 }}>{item.id}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>{item.party}</span>
                            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>({item.type})</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>● {item.erp} ({item.port})</span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: item.status === "Synced" ? "#4ade80" : "#fbbf24",
                              background: item.status === "Synced" ? "rgba(34, 197, 94, 0.15)" : "rgba(251, 191, 36, 0.15)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "recon" && (
                <div>
                  <div style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: 14,
                    padding: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
                      HDFC / ICICI Bank Statement Reconciliation
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ background: "rgba(8, 12, 20, 0.6)", padding: "14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Statement Closing Balance</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>₹18,42,910.45</div>
                      </div>
                      <div style={{ background: "rgba(8, 12, 20, 0.6)", padding: "14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Matched Book Balance</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", marginTop: 4 }}>₹18,42,910.45 (100% Matched)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────────────────────── */}
      <section
        id="features"
        ref={exploreRef}
        style={{
          maxWidth: 1240,
          margin: "80px auto",
          padding: "0 24px",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.12)",
            padding: "5px 14px",
            borderRadius: 20,
            border: "1px solid rgba(56, 189, 248, 0.25)",
            letterSpacing: "1px",
          }}>
            Engineered for Modern Accountants
          </span>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", marginTop: 14, letterSpacing: "-0.5px" }}>
            Why Leading CA Firms Choose Daynisc Pro
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {[
            {
              icon: "⚡",
              title: "TallyPrime Port 9000 Sync",
              desc: "Direct XML-HTTP sync directly into TallyPrime without intermediate XML file exports. Supports Educational Mode date overrides.",
              color: "#38bdf8",
            },
            {
              icon: "🟣",
              title: "Odoo ERP XML-RPC Integration",
              desc: "Native XML-RPC connectivity for Odoo v14 through v18+. Supports cloud SaaS and on-premise deployments with API token authentication.",
              color: "#a855f7",
            },
            {
              icon: "📄",
              title: "Vision AI OCR Extraction",
              desc: "Extracts vendor name, GSTIN, invoice date, line-items, CGST/SGST/IGST breakdown, and totals from scanned PDFs and photos.",
              color: "#ec4899",
            },
            {
              icon: "🛡️",
              title: "Air-Gapped & Local First",
              desc: "Runs locally on your Windows PC. Your financial vouchers, bank statements, and party ledgers never leave your company network.",
              color: "#22c55e",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="hover-lift"
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "28px",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `rgba(255, 255, 255, 0.05)`,
                border: `1px solid ${card.color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                marginBottom: 16,
              }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom Call To Action Banner ─────────────────────────────────── */}
      <section style={{
        maxWidth: 1140,
        margin: "0 auto 90px",
        padding: "0 24px",
        position: "relative",
        zIndex: 20,
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(124, 58, 237, 0.25))",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: 24,
          padding: "48px 36px",
          textAlign: "center",
          backdropFilter: "blur(20px)",
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", marginBottom: 12 }}>
            Ready to Automate Your Accounting Workflow?
          </h2>
          <p style={{ fontSize: 15, color: "#cbd5e1", maxWidth: 600, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Download the Daynisc Pro Windows application today and experience instant invoice punching into TallyPrime and Odoo ERP.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => handleDownload("zip")}
              className="hover-lift"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "#ffffff",
                color: "#0f172a",
                border: "none",
                borderRadius: 9999,
                padding: "14px 28px",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f172a">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
              </svg>
              <span>Download for Windows (.zip / .exe)</span>
            </button>

            <button
              onClick={() => navigate("/ai-verification")}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 9999,
                padding: "14px 24px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open Web Dashboard →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "32px 24px",
        textAlign: "center",
        color: "#64748b",
        fontSize: 13,
      }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoApp} alt="Daynisc" style={{ width: 18, height: 18 }} />
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>Daynisc Pro</span>
            <span>— AI Accounting Automation for Windows</span>
          </div>
          <div>© {new Date().getFullYear()} Daynisc Technologies. All rights reserved.</div>
        </div>
      </footer>

      {/* ── Download Options Modal ────────────────────────────────────────── */}
      {showDownloadModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: 20,
            maxWidth: 560,
            width: "100%",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            color: "#f8fafc",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px 0", color: "#ffffff" }}>
                  Daynisc Pro for Windows
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Download started. Choose your preferred package below:
                </p>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Download Options Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
              {/* Option 1: Portable ZIP Package (Recommended) */}
              <div
                onClick={() => handleDownload("zip")}
                style={{
                  background: downloadType === "zip" ? "rgba(37, 99, 235, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  border: downloadType === "zip" ? "1.5px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>📦</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                        Portable Standalone Package (.zip)
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: "#22c55e20",
                        color: "#4ade80",
                        border: "1px solid #22c55e40",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      Instant download • Zero browser warnings • Extract &amp; run
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Download ↓</span>
              </div>

              {/* Option 2: Direct .EXE Installer */}
              <div
                onClick={() => handleDownload("exe")}
                style={{
                  background: downloadType === "exe" ? "rgba(37, 99, 235, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  border: downloadType === "exe" ? "1.5px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>🚀</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                      Direct Windows Application Setup (.exe)
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      Standalone executable launcher with embedded desktop icon
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Download ↓</span>
              </div>
            </div>

            {/* Chrome Safe Browsing Explanation Box */}
            <div style={{
              background: "rgba(234, 179, 8, 0.08)",
              border: "1px solid rgba(234, 179, 8, 0.28)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#facc15", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span>🛡️</span> Google Chrome Warning Fix:
              </div>
              <p style={{ fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
                If Chrome shows <i>"File isn't commonly downloaded"</i> on the <code>.exe</code>: click the <b>three dots (⋮)</b> on the download notification → select <b>Keep</b> → <b>Keep anyway</b>. Or simply use the <b>Portable .zip</b> above which downloads without any prompts.
              </p>
            </div>

            {/* Quick 2-Step Setup Instructions */}
            <div style={{
              background: "rgba(8, 12, 20, 0.7)",
              borderRadius: 12,
              padding: "16px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                Quick 2-Step Windows Setup:
              </div>
              <ol style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li>Double-click <code>Daynisc-Pro-Setup.exe</code> to start the desktop app.</li>
                <li>Make sure TallyPrime (Port 9000) or Odoo (Port 8069) is running to auto-connect.</li>
              </ol>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => setShowDownloadModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDownloadModal(false);
                  navigate("/ai-verification");
                }}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Open in Browser Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
