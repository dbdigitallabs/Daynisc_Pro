import { useState, useRef } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

const GITHUB_REPO_URL = "https://github.com/dbdigitallabs/Daynisc_Pro";
const GITHUB_CLONE_URL = "https://github.com/dbdigitallabs/Daynisc_Pro.git";
const GITHUB_ZIP_URL = "https://github.com/dbdigitallabs/Daynisc_Pro/archive/refs/heads/main.zip";

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, display: "inline-block" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const TERMINAL_COMMANDS = {
  powershell: `powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '${GITHUB_ZIP_URL}' -OutFile 'Daynisc_Pro.zip'; Expand-Archive -Path 'Daynisc_Pro.zip' -DestinationPath 'Daynisc_Pro_App' -Force; Remove-Item 'Daynisc_Pro.zip'; Set-Location 'Daynisc_Pro_App\\Daynisc_Pro-main'; .\\start_all.bat"`,
  git: `git clone ${GITHUB_CLONE_URL} ; cd Daynisc_Pro ; .\\start_all.bat`,
  cmd: `git clone ${GITHUB_CLONE_URL} && cd Daynisc_Pro && start_all.bat`,
};

export default function DownloadLandingPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [terminalTab, setTerminalTab] = useState<"powershell" | "git" | "cmd">("powershell");
  const [copied, setCopied] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const copyTerminalCommand = (type?: "powershell" | "git" | "cmd") => {
    const targetType = type || terminalTab;
    const cmd = TERMINAL_COMMANDS[targetType];
    const notify = () => {
      setCopied(true);
      toast.success("Terminal command copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd).then(notify).catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = cmd;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        notify();
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = cmd;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      notify();
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement("a");
    link.href = GITHUB_ZIP_URL;
    link.setAttribute("download", "Daynisc_Pro.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setShowDownloadModal(true);
    }, 800);
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

        {/* Top Right: GitHub Link & Copy Terminal Command Pill Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="View Daynisc on GitHub"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#ffffff",
              color: "#0f172a",
              border: "1.5px solid #e2e8f0",
              borderRadius: 9999,
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#94a3b8";
              e.currentTarget.style.background = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            <GithubIcon size={16} />
            <span>GitHub</span>
          </a>

          <button
            onClick={() => copyTerminalCommand()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: copied ? "#15803d" : "#090d16",
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
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Command Copied!</span>
              </>
            ) : (
              <>
                <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 700, fontSize: 14 }}>&gt;_</span>
                <span>Copy Terminal Command</span>
              </>
            )}
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

        {/* Terminal Command Box to Run Locally */}
        <div style={{
          maxWidth: 720,
          margin: "0 auto 24px",
          textAlign: "left",
        }}>
          {/* Header Bar with Tabs */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 6px 8px",
            flexWrap: "wrap",
            gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Run Locally via Terminal
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 3, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => setTerminalTab("powershell")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: terminalTab === "powershell" ? "#0f172a" : "transparent",
                  color: terminalTab === "powershell" ? "#ffffff" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                PowerShell (No Git Needed)
              </button>
              <button
                type="button"
                onClick={() => setTerminalTab("git")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: terminalTab === "git" ? "#0f172a" : "transparent",
                  color: terminalTab === "git" ? "#ffffff" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                Git Clone
              </button>
              <button
                type="button"
                onClick={() => setTerminalTab("cmd")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: terminalTab === "cmd" ? "#0f172a" : "transparent",
                  color: terminalTab === "cmd" ? "#ffffff" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                Command Prompt
              </button>
            </div>
          </div>

          {/* Terminal Container */}
          <div style={{
            background: "#0a0f1d",
            borderRadius: 14,
            border: "1px solid #1e293b",
            boxShadow: "0 16px 40px -10px rgba(15, 23, 42, 0.22)",
            overflow: "hidden",
          }}>
            {/* Window title bar */}
            <div style={{
              background: "#0f172a",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #1e293b",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                <span style={{ fontSize: 11.5, color: "#94a3b8", fontFamily: "monospace", marginLeft: 8 }}>
                  {terminalTab === "powershell" ? "Windows PowerShell (Standard Windows Setup)" : terminalTab === "git" ? "Git Bash / Terminal" : "Command Prompt"}
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>One-Click Local Launch</span>
            </div>

            {/* Terminal Command Row */}
            <div style={{
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <div style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12.5,
                color: "#f8fafc",
                lineHeight: 1.5,
                overflowX: "auto",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: 1,
              }}>
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>&gt;</span>
                <span style={{ color: "#e2e8f0" }}>
                  {TERMINAL_COMMANDS[terminalTab]}
                </span>
              </div>

              {/* Action Buttons: GitHub Link & Copy Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open GitHub Repository in a new tab"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#f8fafc",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: 8,
                    padding: "9px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.32)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                  }}
                >
                  <GithubIcon size={14} />
                  <span>Open GitHub</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyTerminalCommand()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: copied ? "#15803d" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                    boxShadow: copied ? "0 0 16px rgba(34, 197, 94, 0.4)" : "0 4px 12px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy Command</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Subtext and Direct Download link */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 9,
            fontSize: 12,
            color: "#64748b",
            flexWrap: "wrap",
            gap: 8,
          }}>
            <span>⚡ Paste and run in terminal to start Daynisc locally with live TallyPort 9000 sync</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2563eb",
                  fontWeight: 600,
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                }}
              >
                <GithubIcon size={13} />
                <span>View on GitHub</span>
              </a>
              <span style={{ color: "#cbd5e1" }}>•</span>
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Download ZIP package
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Actions */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              navigate("/login");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#090d16",
              color: "#ffffff",
              border: "none",
              borderRadius: 9999,
              padding: "11px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(9, 13, 22, 0.15)",
              transition: "all 0.15s ease",
            }}
          >
            <span>Try Live in Browser</span>
            <span style={{ fontSize: 15 }}>→</span>
          </button>

          <button
            onClick={() => setShowDemoModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#ffffff",
              color: "#0f172a",
              border: "1.5px solid #e2e8f0",
              borderRadius: 9999,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0f172a" strokeWidth="2" />
              <polygon points="10 8 16 12 10 16 10 8" fill="#0f172a" />
            </svg>
            <span>Watch Workflow Tour</span>
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
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                borderRadius: 9999,
                padding: "12px 22px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              <GithubIcon size={16} />
              <span>GitHub Repo</span>
            </a>
            <button
              onClick={() => copyTerminalCommand()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: copied ? "#22c55e" : "#ffffff",
                color: copied ? "#ffffff" : "#090d16",
                border: "none",
                borderRadius: 9999,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>&gt;_</span>
              <span>{copied ? "Command Copied!" : "Copy Terminal Command"}</span>
            </button>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                navigate("/login");
              }}
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
                  useAuthStore.getState().logout();
                  navigate("/login");
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

      {/* ── Download Started Modal ───────────────────────────────────────── */}
      {showDownloadModal && (
        <div
          onClick={() => setShowDownloadModal(false)}
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
              maxWidth: 620,
              width: "100%",
              padding: 28,
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={logoApp} alt="Daynisc" style={{ width: 30, height: 30 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Downloading Daynisc Pro for Windows
                </h3>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#22c55e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                ✓
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>
                  Your download has started!
                </div>
                <div style={{ fontSize: 12.5, color: "#15803d", marginTop: 2 }}>
                  File: <b>Daynisc-Pro-Windows.zip</b> (Saved to your Downloads folder)
                </div>
              </div>
            </div>

            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                Quick 2-Step Setup on Windows:
              </div>
              <ol style={{ fontSize: 13, color: "#475569", lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
                <li><b>Extract:</b> Right-click <code>Daynisc-Pro-Windows.zip</code> and select <b>Extract All</b>.</li>
                <li><b>Launch:</b> Double-click <code>Daynisc-Pro.bat</code> to launch Daynisc Pro in a dedicated desktop window.</li>
                <li><b>Connect:</b> TallyPrime (Port 9000) or Odoo ERP (Port 8069) will be detected automatically on your PC.</li>
              </ol>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/downloads/Daynisc-Pro-Windows.zip";
                  link.setAttribute("download", "Daynisc-Pro-Windows.zip");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "6px 0",
                  textDecoration: "underline",
                }}
              >
                Download again if not started
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowDownloadModal(false)}
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
                  Done
                </button>
                <button
                  onClick={() => {
                    setShowDownloadModal(false);
                    useAuthStore.getState().logout();
                    navigate("/login");
                  }}
                  style={{
                    padding: "9px 20px",
                    background: "#090d16",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Open in Browser Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
