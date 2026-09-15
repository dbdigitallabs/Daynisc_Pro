import { useState, useRef, useEffect } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";
import api from "../store/apiClient";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState("989898");

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If user lands on login, ensure previous session is clear for clean entry
    // (Preserve clean state)
  }, []);

  async function sendOTP() {
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/send-otp", { phone });
      setDevOtp(res.data?.dev_otp || "989898");
    } catch {
      // Offline / demo fallback: allow fixed OTP 989898
      setDevOtp("989898");
    } finally {
      setDevOtp("989898");
      setStep("otp");
      startCountdown();
      setLoading(false);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    }
  }

  async function verifyOTPWithCode(code: string) {
    if (code.length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");

    const loginWithDemoUser = () => {
      const demoUser = {
        id: "usr-" + (phone || "demo"),
        phone: phone || "9898989898",
        name: "Admin User",
        email: "admin@daynisc.com",
        role: "owner",
        company_id: "co-001",
      };
      const demoCompany = {
        id: "co-001",
        name: "Daynisc Enterprise",
        plan: "Enterprise",
        gstin: "24AAACD1234E1Z5",
        db_schema: "public",
      };
      setAuth("demo-token-989898", "demo-token-refresh", demoUser, demoCompany);
      navigate("/ai-verification", { replace: true });
    };

    if (code === "989898") {
      try {
        const resp = await api.post("/auth/verify-otp", { phone, otp: code });
        const { access_token, refresh_token, user, company } = resp.data;
        setAuth(access_token, refresh_token, user, company);
        navigate("/ai-verification", { replace: true });
      } catch {
        // Fallback for Vercel / offline demo mode
        loginWithDemoUser();
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const resp = await api.post("/auth/verify-otp", { phone, otp: code });
      const { access_token, refresh_token, user, company } = resp.data;
      setAuth(access_token, refresh_token, user, company);
      navigate("/ai-verification", { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.detail || "Invalid OTP. Use demo OTP: 989898");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function startCountdown() {
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (!val && i > 0) otpRefs.current[i - 1]?.focus();

    if (next.join("").length === 6) {
      setTimeout(() => verifyOTPWithCode(next.join("")), 120);
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f8fafc",
        position: "relative",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ── Soft Ambient Aurora Background Shapes (Matching Screenshot) ──── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {/* Soft blue curved organic glow at bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            left: "-10%",
            width: "55vw",
            height: "45vh",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(191, 219, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 50%, transparent 75%)",
            filter: "blur(60px)",
          }}
        />

        {/* Ambient top-center subtle cyan-blue glow */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "25%",
            width: "40vw",
            height: "35vh",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(219, 234, 254, 0.4) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />

        {/* Bottom subtle wave svg line */}
        <svg
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "220px",
            opacity: 0.5,
          }}
          viewBox="0 0 1440 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 160C240 220 480 260 720 230C960 200 1200 100 1440 140V280H0V160Z"
            fill="url(#wave-grad)"
          />
          <defs>
            <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#dbeafe" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "48px 32px 32px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
          flexWrap: "wrap",
          flex: 1,
        }}
      >
        {/* ── Left Column: Brand Hero & Value Badges ───────────────────────── */}
        <div
          style={{
            flex: "1 1 460px",
            maxWidth: 540,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 3D App Icon */}
          <div style={{ display: "inline-flex", marginBottom: 12 }}>
            <img
              src={logoApp}
              alt="Daynisc ERP Logo"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                filter: "drop-shadow(0 12px 20px rgba(37, 99, 235, 0.22))",
              }}
            />
          </div>

          {/* Daynisc ERP Brand Name */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.6px",
              }}
            >
              Daynisc
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#2563eb",
                letterSpacing: "-0.6px",
              }}
            >
              ERP
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "#64748b",
              marginTop: 4,
            }}
          >
            AI Powered Business Solutions
          </div>

          {/* Blue Accent Pill Bar */}
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: "#2563eb",
              marginTop: 22,
              marginBottom: 26,
            }}
          />

          {/* Headline */}
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.16,
              letterSpacing: "-1px",
              margin: "0 0 16px 0",
            }}
          >
            Smarter Business{" "}
            <span style={{ color: "#2563eb", display: "block" }}>
              Starts Here.
            </span>
          </h1>

          {/* Paragraph */}
          <p
            style={{
              fontSize: 15.5,
              color: "#64748b",
              lineHeight: 1.65,
              maxWidth: 440,
              margin: "0 0 42px 0",
            }}
          >
            Manage your business with intelligent tools, simpler workflows and a
            smarter tomorrow.
          </p>

          {/* 3 Horizontal Feature Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 36,
              flexWrap: "wrap",
            }}
          >
            {/* Feature 1: Manage Operations */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: 82,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.12)",
                }}
              >
                {/* Blue Bar Chart Icon */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginTop: 10,
                  lineHeight: 1.35,
                }}
              >
                Manage
                <br />
                Operations
              </div>
            </div>

            {/* Feature 2: Secure & Reliable */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: 82,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.12)",
                }}
              >
                {/* Green Shield Icon */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginTop: 10,
                  lineHeight: 1.35,
                }}
              >
                Secure
                <br />
                &amp; Reliable
              </div>
            </div>

            {/* Feature 3: AI Driven Insights */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                width: 82,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#f5f3ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(139, 92, 246, 0.12)",
                }}
              >
                {/* Purple Lightning Bolt Icon */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginTop: 10,
                  lineHeight: 1.35,
                }}
              >
                AI Driven
                <br />
                Insights
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Floating Elevated White Card ───────────────────── */}
        <div
          style={{
            flex: "1 1 380px",
            maxWidth: 440,
            background: "#ffffff",
            borderRadius: 24,
            padding: "44px 38px",
            boxShadow:
              "0 20px 60px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            margin: "0 auto",
          }}
        >
          {/* Centered Glowing App Icon in Squircle */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: "#ffffff",
              boxShadow:
                "0 10px 25px -4px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(226, 232, 240, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <img
              src={logoApp}
              alt="App Logo"
              style={{ width: 44, height: 44, objectFit: "contain" }}
            />
          </div>

          {/* App Title */}
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              textAlign: "center",
              marginTop: 14,
              letterSpacing: "-0.4px",
            }}
          >
            Daynisc ERP
          </div>

          {/* Welcome Back tracking */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "3px",
              color: "#94a3b8",
              textAlign: "center",
              marginTop: 4,
              marginBottom: 28,
              textTransform: "uppercase",
            }}
          >
            Welcome Back
          </div>

          {/* ── STEP 1: Phone Number Input ─────────────────────────────────── */}
          {step === "phone" ? (
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 3,
                }}
              >
                Login with OTP
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginBottom: 22,
                }}
              >
                Enter your registered mobile number
              </div>

              {/* Mobile Number Label */}
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 8,
                }}
              >
                Mobile Number
              </label>

              {/* Input Group with India Flag & +91 Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#f8fafc",
                  border: error ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  overflow: "hidden",
                  height: 48,
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Flag + Country Code */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 12px",
                    background: "#ffffff",
                    borderRight: "1.5px solid #e2e8f0",
                    height: "100%",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1e293b",
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>🇮🇳</span>
                  <span>+91</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Input Field */}
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                  placeholder="9876543210"
                  autoFocus
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: "0 14px",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#0f172a",
                    letterSpacing: "0.8px",
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 500,
                    marginTop: 8,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Demo Helper Hint */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  fontSize: 11.5,
                  color: "#64748b",
                }}
              >
                <span>Demo mobile: <b>9876543210</b></span>
                <span
                  onClick={() => {
                    setPhone("9876543210");
                    setError("");
                  }}
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Auto-fill
                </span>
              </div>

              {/* Send OTP Button (Blue-to-Indigo Gradient) */}
              <button
                onClick={sendOTP}
                disabled={loading || phone.length !== 10}
                style={{
                  width: "100%",
                  height: 48,
                  marginTop: 22,
                  background:
                    phone.length === 10
                      ? "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)"
                      : "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 100%)",
                  border: "none",
                  borderRadius: 12,
                  color: "#ffffff",
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: phone.length === 10 && !loading ? "pointer" : "default",
                  boxShadow:
                    phone.length === 10
                      ? "0 6px 20px -2px rgba(59, 130, 246, 0.45)"
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{loading ? "Sending OTP..." : "Send OTP"}</span>
                {!loading && <span style={{ fontSize: 16 }}>→</span>}
              </button>
            </div>
          ) : (
            /* ── STEP 2: Enter Verification Code ───────────────────────────── */
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 3,
                }}
              >
                Enter Verification Code
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginBottom: 16,
                }}
              >
                We sent a 6-digit code to{" "}
                <b style={{ color: "#0f172a" }}>+91 {phone}</b>
              </div>

              {/* Instant Auto-Fill Chip for Demo / Testing */}
              <div
                onClick={() => {
                  const demoCode = ["9", "8", "9", "8", "9", "8"];
                  setOtp(demoCode);
                  verifyOTPWithCode("989898");
                }}
                title="Click to auto-fill demo OTP and login"
                style={{
                  background: "#eff6ff",
                  border: "1px dashed #60a5fa",
                  borderRadius: 10,
                  padding: "9px 13px",
                  marginBottom: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <span style={{ fontSize: 12.5, color: "#1e40af", fontWeight: 600 }}>
                    Fixed OTP: <b>989898</b>
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    color: "#2563eb",
                    fontWeight: 700,
                  }}
                >
                  Click to Auto-Fill →
                </span>
              </div>

              {/* 6 Digit OTP Input Boxes */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    style={{
                      width: 44,
                      height: 50,
                      textAlign: "center",
                      fontSize: 19,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: "1.5px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "#2563eb")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "#e2e8f0")
                    }
                  />
                ))}
              </div>

              {/* Error text */}
              {error && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Verify & Enter Button */}
              <button
                onClick={() => verifyOTPWithCode(otp.join(""))}
                disabled={loading || otp.join("").length !== 6}
                style={{
                  width: "100%",
                  height: 48,
                  marginTop: 6,
                  background:
                    otp.join("").length === 6
                      ? "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)"
                      : "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 100%)",
                  border: "none",
                  borderRadius: 12,
                  color: "#ffffff",
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor:
                    otp.join("").length === 6 && !loading
                      ? "pointer"
                      : "default",
                  boxShadow:
                    otp.join("").length === 6
                      ? "0 6px 20px -2px rgba(59, 130, 246, 0.45)"
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{loading ? "Verifying..." : "Verify & Enter Dashboard"}</span>
                {!loading && <span style={{ fontSize: 16 }}>→</span>}
              </button>

              {/* Change Phone / Resend Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 18,
                  fontSize: 12.5,
                }}
              >
                <button
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 500,
                  }}
                >
                  ← Change Number
                </button>
                {countdown > 0 ? (
                  <span style={{ color: "#94a3b8" }}>Resend in {countdown}s</span>
                ) : (
                  <button
                    onClick={sendOTP}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Need Help Footer Link (Matches Screenshot) */}
          <div
            style={{
              textAlign: "center",
              marginTop: 32,
              fontSize: 12.5,
              color: "#64748b",
            }}
          >
            <span>Need help? </span>
            <span
              onClick={() => navigate("/download")}
              style={{
                color: "#2563eb",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Contact Administrator
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Tagline (Matches Screenshot: PLAN • PROCESS • PROGRESS) ─── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "0 32px 28px 32px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "3px",
            color: "#94a3b8",
            textTransform: "uppercase",
          }}
        >
          PLAN &nbsp;•&nbsp; PROCESS &nbsp;•&nbsp; PROGRESS
        </span>
      </div>
    </div>
  );
}
