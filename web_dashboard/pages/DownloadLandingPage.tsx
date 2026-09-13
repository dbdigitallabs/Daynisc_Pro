import { useState, useRef } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";

export default function DownloadLandingPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    setDownloading(true);
    const releaseUrl = "https://github.com/bhaveshkhimsuriya023-stack/Daynisc/archive/refs/heads/main.zip";
    const link = document.createElement("a");
    link.href = releaseUrl;
    link.setAttribute("download", "Daynisc-Pro-Windows.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2500);
  };

  const scrollToExplore = () => {
    exploreRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#0f172a",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: "relative",
      overflowX: "hidden",
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* Custom Styles for Text Clipping, Glow & Transitions */}
      <style>{`
        .aurora-gradient-text {
          background: linear-gradient(110deg, #38bdf8 0%, #2563eb 32%, #7c3aed 72%, #9333ea 100%);
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          color: transparent !important;
          display: inline-block;
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .feature-divider { display: none !important; }
        }
      `}</style>

      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <header style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 30,
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", userSelect: "none" }}
        >
          <img
            src={logoApp}
            alt="Daynisc Logo"
            style={{ width: 33, height: 33, objectFit: "contain" }}
          />
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 21, fontWeight: 800, color: "#0a0f1d", letterSpacing: "-0.4px" }}>
              Daynisc
            </span>
            <span style={{ fontSize: 21, fontWeight: 800, color: "#2563eb", letterSpacing: "-0.4px" }}>
              Pro
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: 44,
        }}
        className="desktop-nav"
        >
          {["Product", "Integrations", "Pricing", "Resources"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToExplore();
              }}
              style={{
                color: "#475569",
                textDecoration: "none",
                fontSize: 14.5,
                fontWeight: 500,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Top Right: Windows Download Pill Button */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "#090d16",
              color: "#ffffff",
              border: "none",
              borderRadius: 9999,
              padding: "10px 22px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(9, 13, 22, 0.15)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(9, 13, 22, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(9, 13, 22, 0.15)";
            }}
          >
            {/* Windows 11/10 4-box Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
            </svg>
            <span>{downloading ? "Downloading..." : "Download for Windows"}</span>
          </button>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section style={{
        position: "relative",
        zIndex: 20,
        textAlign: "center",
        padding: "24px 20px 16px",
        maxWidth: 920,
        margin: "0 auto",
      }}>
        {/* Overline Label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: "#71717a",
          marginBottom: 14,
        }}>
          A C C O U N T I N G &nbsp; A U T O M A T I O N
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: "clamp(48px, 6.5vw, 80px)",
          fontWeight: 800,
          color: "#0f172a",
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
          margin: "0 0 2px 0",
        }}>
          Accounting
        </h1>
        <div>
          <span className="aurora-gradient-text" style={{
            fontSize: "clamp(48px, 6.5vw, 80px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
            marginBottom: 16,
          }}>
            Made Simple.
          </span>
        </div>

        {/* Subtitle */}
        <p style={{
          fontSize: "clamp(14.5px, 1.6vw, 16.5px)",
          color: "#475569",
          lineHeight: 1.6,
          maxWidth: 580,
          margin: "16px auto 26px",
          fontWeight: 400,
        }}>
          Run Daynisc Pro on your Windows PC and connect directly with TallyPrime.
          <br style={{ display: "block" }} />
          Automate entries, extract data, and focus on what really matters.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}>
          {/* Main Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#090d16",
              color: "#ffffff",
              border: "none",
              borderRadius: 9999,
              padding: "13px 28px",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(9, 13, 22, 0.16)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1.5px)";
              e.currentTarget.style.boxShadow = "0 12px 28px rgba(9, 13, 22, 0.24)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(9, 13, 22, 0.16)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
            </svg>
            <span>{downloading ? "Preparing..." : "Download for Windows"}</span>
            <span style={{ fontSize: 16, marginLeft: 2 }}>→</span>
          </button>

          {/* Watch Demo Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "#ffffff",
              color: "#0f172a",
              border: "1.5px solid #e2e8f0",
              borderRadius: 9999,
              padding: "12px 24px",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.background = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0f172a" strokeWidth="2" />
              <polygon points="10 8 16 12 10 16 10 8" fill="#0f172a" />
            </svg>
            <span>Watch Demo</span>
          </button>
        </div>
      </section>

      {/* ── Glowing Horizon Dome & Feature Bar ────────────────────────────── */}
      <div style={{
        position: "relative",
        width: "100%",
        marginTop: 8,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        {/* Soft Radial Aurora Multi-Spectrum Glow */}
        <div style={{
          position: "absolute",
          top: -170,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(1380px, 96vw)",
          height: 380,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(56, 189, 248, 0.48) 0%, rgba(56, 189, 248, 0) 65%),
            radial-gradient(ellipse at 50% 44%, rgba(168, 85, 247, 0.44) 0%, rgba(168, 85, 247, 0) 65%),
            radial-gradient(ellipse at 80% 50%, rgba(244, 114, 182, 0.48) 0%, rgba(244, 114, 182, 0) 65%)
          `,
          filter: "blur(70px)",
          opacity: 0.95,
          zIndex: 1,
        }} />

        {/* Sweeping Horizon Curve Arc Overlay */}
        <div style={{
          position: "relative",
          width: "100%",
          height: 110,
          pointerEvents: "none",
          zIndex: 2,
          overflow: "hidden",
        }}>
          <svg
            viewBox="0 0 1600 110"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
            }}
          >
            <defs>
              <linearGradient id="horizonStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.0" />
                <stop offset="16%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.95" />
                <stop offset="84%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Seamless solid white dome surface */}
            <path
              d="M -50 110 Q 800 2 1650 110 L 1650 140 L -50 140 Z"
              fill="#ffffff"
            />

            {/* Radiant curved horizon line */}
            <path
              d="M -50 110 Q 800 2 1650 110"
              stroke="url(#horizonStrokeGrad)"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Feature Highlights Bar Sitting Comfortably Inside the White Dome */}
        <div style={{
          position: "relative",
          zIndex: 10,
          background: "#ffffff",
          width: "100%",
          paddingTop: 12,
          paddingBottom: 22,
          display: "flex",
          justifyContent: "center",
          paddingLeft: 24,
          paddingRight: 24,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            flexWrap: "wrap",
            maxWidth: 1180,
          }}>
            {/* Feature 1: Direct TallyPrime Integration */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>
                Direct TallyPrime Integration
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: "#cbd5e1" }} className="feature-divider" />

            {/* Feature 2: AI Powered OCR */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>
                AI Powered OCR
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: "#cbd5e1" }} className="feature-divider" />

            {/* Feature 3: Automate Repetitive Tasks */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>
                Automate Repetitive Tasks
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: "#cbd5e1" }} className="feature-divider" />

            {/* Feature 4: Secure & Offline */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1e293b" }}>
                Secure &amp; Offline
              </span>
            </div>
          </div>
        </div>

        {/* Scroll to Explore Indicator */}
        <div
          onClick={scrollToExplore}
          style={{
            background: "#ffffff",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            paddingBottom: 46,
            cursor: "pointer",
            userSelect: "none",
            position: "relative",
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, letterSpacing: "0.2px" }}>
            Scroll to explore
          </span>
          <div style={{ width: 1, height: 26, background: "#94a3b8" }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Below the fold: Interactive Feature Showcase ─────────────────── */}
      <section
        ref={exploreRef}
        id="product"
        style={{
          maxWidth: 1180,
          margin: "40px auto 100px",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#2563eb",
            background: "#eff6ff",
            padding: "5px 14px",
            borderRadius: 20,
            letterSpacing: "1px",
          }}>
            Platform Capabilities
          </span>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", marginTop: 14, letterSpacing: "-0.5px" }}>
            Everything You Need to Automate Accounting
          </h2>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.6 }}>
            Connect Daynisc Pro with TallyPrime (Port 9000) or Odoo ERP (XML-RPC) to eliminate manual invoice punching forever.
          </p>
        </div>

        {/* 3 Interactive Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}>
          {/* Card 1 */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease",
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              Vision AI OCR Document Scanning
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              Drop scanned PDFs, smartphone photos, or vendor bill images. Daynisc extracts GSTIN, line items, CGST/SGST/IGST, and totals with 99.4% accuracy.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease",
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#f5f3ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              1-Click Tally &amp; Odoo ERP Sync
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              Push Purchase bills, Sales invoices, and payment receipts directly to TallyPrime XML or Odoo ERP XML-RPC. Handles ledger auto-creation and Educational Mode date validation.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease",
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              100% Offline &amp; Privacy First
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              Runs locally on your Windows PC. Your financial data stays entirely on your local machine and never leaves your corporate perimeter.
            </p>
          </div>
        </div>

        {/* Bottom Banner with Download and Web App Launch */}
        <div style={{
          marginTop: 60,
          background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
          borderRadius: 20,
          padding: "48px 40px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
        }}>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px 0" }}>
              Ready to automate your accounting?
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, maxWidth: 480 }}>
              Download Daynisc Pro for Windows 10 &amp; 11 or test the live dashboard directly in your web browser.
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={handleDownload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                color: "#090d16",
                border: "none",
                borderRadius: 9999,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
              </svg>
              Download Windows App
            </button>
            <button
              onClick={() => navigate("/ai-verification")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 9999,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open Web App →
            </button>
          </div>
        </div>
      </section>

      {/* ── Demo Video Modal ─────────────────────────────────────────────── */}
      {showDemoModal && (
        <div
          onClick={() => setShowDemoModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 720,
              width: "100%",
              padding: 28,
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={logoApp} alt="Daynisc" style={{ width: 28, height: 28 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Daynisc Pro — Interactive Workflow Tour
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
                Standard 3-Step Automation Flow:
              </div>
              <ol style={{ fontSize: 13, color: "#475569", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
                <li><b>Upload:</b> Drag &amp; drop any vendor bill, tax invoice, or receipt (PDF / JPG / PNG).</li>
                <li><b>AI Verification:</b> Our neural model extracts party names, GSTIN, invoice dates, line items, and taxes.</li>
                <li><b>Push to ERP:</b> Click <b>Sync to Tally</b> or <b>Sync to Odoo</b> to instantly post vouchers with zero manual punching.</li>
              </ol>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowDemoModal(false)}
                style={{
                  padding: "9px 18px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  navigate("/ai-verification");
                }}
                style={{
                  padding: "9px 20px",
                  background: "#2563eb",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Try Live in Browser →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
