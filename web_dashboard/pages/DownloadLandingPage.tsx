import { useState } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";

export default function DownloadLandingPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    // Link to GitHub Release / repo download
    const releaseUrl = "https://github.com/bhaveshkhimsuriya023-stack/Daynisc/archive/refs/heads/main.zip";
    const link = document.createElement("a");
    link.href = releaseUrl;
    link.setAttribute("download", "Daynisc-Pro-Desktop-Suite.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const copyLaunchCommand = () => {
    navigator.clipboard.writeText("git clone https://github.com/bhaveshkhimsuriya023-stack/Daynisc.git && cd Daynisc/web_dashboard && npm install && npm run electron:start");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflowX: "hidden",
      paddingBottom: 60,
    }}>
      {/* Background radial glow */}
      <div style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1000,
        height: 600,
        background: "radial-gradient(ellipse at 50% 0%, rgba(67, 97, 238, 0.18) 0%, rgba(124, 58, 237, 0.08) 40%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Top Navbar */}
      <header style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoApp} alt="Daynisc Logo" style={{ width: 38, height: 38, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Daynisc Pro</div>
            <div style={{ fontSize: 9, color: "#f5a623", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Desktop Suite for Windows
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/ai-verification")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#d6dae6",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Web Preview Mode →
          </button>
          <a
            href="https://github.com/bhaveshkhimsuriya023-stack/Daynisc"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            GitHub Repo ↗
          </a>
        </div>
      </header>

      {/* Main Hero Container */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1080, margin: "0 auto", padding: "64px 24px 0" }}>
        {/* Release Tag */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "rgba(67, 97, 238, 0.12)",
            border: "1px solid rgba(67, 97, 238, 0.35)",
            borderRadius: 30,
            fontSize: 12,
            fontWeight: 700,
            color: "#93c5fd",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            Daynisc Pro Desktop Edition · Windows 10 & 11
          </span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          textAlign: "center",
          fontSize: "clamp(32px, 5vw, 54px)",
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: "-1.5px",
          marginBottom: 18,
          background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Run Daynisc Directly on Windows<br />
          Beside TallyPrime.
        </h1>

        <p style={{
          textAlign: "center",
          maxWidth: 680,
          margin: "0 auto 36px",
          fontSize: 16,
          lineHeight: 1.6,
          color: "#94a3b8",
        }}>
          To connect seamlessly with your local TallyPrime (Port 9000) without browser network restrictions, 
          run Daynisc as a native desktop software built on Electron.
        </p>

        {/* Download Buttons Group */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
        }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 36px",
              background: "linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(67, 97, 238, 0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {downloading ? "Downloading Desktop Package…" : "Download for Windows (.zip / .exe)"}
          </button>

          <button
            onClick={copyLaunchCommand}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 28px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#e2e8f0",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? "✓ Copied Launch Command!" : "Copy Terminal Launch Command"}
          </button>
        </div>

        {/* Specifications & Compatibility info */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          fontSize: 12,
          color: "#64748b",
          marginBottom: 64,
          flexWrap: "wrap",
        }}>
          <span>✓ 64-bit Windows 10 & 11</span>
          <span>✓ TallyPrime 1.0 to 5.0+ Compatible</span>
          <span>✓ Direct Port 9000 Local Loopback</span>
          <span>✓ Instant AI OCR Processing</span>
        </div>

        {/* ── Feature Highlights Grid ────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          marginBottom: 64,
        }}>
          <div style={{
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 14,
            padding: 24,
          }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>⚡</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
              Native TallyPrime Sync
            </h3>
            <p style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.5 }}>
              Runs on your local PC to communicate directly with Tally on <code>localhost:9000</code> with zero browser CORS or mixed-content blocks.
            </p>
          </div>

          <div style={{
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 14,
            padding: 24,
          }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>🤖</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
              Gemini Vision OCR
            </h3>
            <p style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.5 }}>
              Extracts supplier bills, purchase invoices, and transport LR slips automatically in English, Hindi, and Gujarati with HSN mapping.
            </p>
          </div>

          <div style={{
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 14,
            padding: 24,
          }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>🏦</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
              Bank & BRS Automation
            </h3>
            <p style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.5 }}>
              Import PDF & Excel bank statements, auto-detect vendor narrations, and create matched ledger entries in Tally with 1 click.
            </p>
          </div>

          <div style={{
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 14,
            padding: 24,
          }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
              Private & Offline First
            </h3>
            <p style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.5 }}>
              Financial vouchers and ledgers stay on your premises and in your encrypted database with schema-level tenant protection.
            </p>
          </div>
        </div>

        {/* ── 3-Step Setup Guide ─────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(180deg, #121829 0%, #0d1220 100%)",
          border: "1px solid #222b40",
          borderRadius: 20,
          padding: 36,
          marginBottom: 48,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, textAlign: "center", color: "#fff" }}>
            How to Launch Daynisc Pro as Desktop Software
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#4361ee",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0
              }}>1</div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#fff" }}>Download Package</h4>
                <p style={{ fontSize: 12, color: "#8892a4", lineHeight: 1.5 }}>
                  Click the download button above or clone the repository to your local computer.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#4361ee",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0
              }}>2</div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#fff" }}>Start Electron Desktop</h4>
                <p style={{ fontSize: 12, color: "#8892a4", lineHeight: 1.5 }}>
                  Run <code>npm run electron:start</code> in <code>web_dashboard</code> to open the native Windows desktop app.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#22c55e",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0
              }}>3</div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#fff" }}>Auto-Sync TallyPrime</h4>
                <p style={{ fontSize: 12, color: "#8892a4", lineHeight: 1.5 }}>
                  Keep TallyPrime open on your PC. Daynisc automatically links to port 9000 for zero-touch accounting entries.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Web Preview CTA Bar */}
        <div style={{
          textAlign: "center",
          padding: "24px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 13, color: "#94a3b8", marginRight: 12 }}>
            Want to test the user interface in your web browser first?
          </span>
          <button
            onClick={() => navigate("/ai-verification")}
            style={{
              background: "none",
              border: "none",
              color: "#00d4c8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Launch Web Demo Preview →
          </button>
        </div>
      </main>
    </div>
  );
}
