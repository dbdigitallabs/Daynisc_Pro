import { useState, useRef, useEffect } from "react";
import logoApp from "/logo_app.png";
import { useNavigate } from "react-router-dom";
import api from "../store/apiClient";
import { useAuthStore } from "../store/authStore";

const C = {
  amber: "#f5a623", cyan: "#00d4c8", green: "#2ecc71",
  red: "#e74c3c",
  muted: "#8892a4", border: "#2a3347",
  card: "#141927", steel: "#1e2535", ink: "#0a0a0f",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState("");  // shown in dev for easy testing
  const [lanUrl, setLanUrl] = useState("http://localhost:8000/api/v1");

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

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);


  async function sendOTP() {
    if (phone.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true); setError("");
    try {
      const res = await api.post("/auth/send-otp", { phone });
      setDevOtp(res.data?.dev_otp || "989898");
    } catch {
      // Offline / cloud static fallback: always allow fixed OTP 989898
      setDevOtp("989898");
    } finally {
      setDevOtp("989898");
      setStep("otp");
      startCountdown();
      setLoading(false);
    }
  }

  async function verifyOTPWithCode(code: string) {
    if (code.length < 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");

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
      navigate("/dashboard", { replace: true });
    };

    if (code === "989898") {
      try {
        const resp = await api.post("/auth/verify-otp", { phone, otp: code });
        const { access_token, refresh_token, user, company } = resp.data;
        setAuth(access_token, refresh_token, user, company);
        navigate("/dashboard", { replace: true });
      } catch {
        // Fallback for Vercel demo mode
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
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.detail || "Invalid OTP. Use fixed OTP: 989898");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function verifyOTP() {
    return verifyOTPWithCode(otp.join(""));
  }

  function startCountdown() {
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (!val && i > 0) otpRefs.current[i - 1]?.focus();
    // Pass next directly — avoids reading stale otp closure
    if (next.join("").length === 6) {
      setTimeout(() => verifyOTPWithCode(next.join("")), 120);
    }
  }
  return (
    <div style={{
      minHeight: "100vh", background: C.ink,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* Background gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 20% 20%, rgba(245,166,35,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,212,200,0.04) 0%, transparent 60%)",
      }} />

      <div style={{
        width: "100%", maxWidth: 880, position: "relative", zIndex: 1,
      }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", width: 64, height: 64,
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <img src={logoApp} style={{ width: 64, height: 64, objectFit: "contain" }} alt="Daynisc App Logo" />
          </div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 26,
            fontWeight: 800, color: "#fff", marginBottom: 6,
          }}>AI ERP Platform</h1>
        </div>

        {/* Two columns: Web OTP Login and Mobile QR login */}
        <div style={{
          display: "flex",
          gap: 32,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "stretch",
        }}>
          {/* Web Login Card */}
          <div style={{
            flex: 1, minWidth: 320, maxWidth: 420,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 32,
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            {step === "phone" ? (
              <>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Login with OTP
                </h2>
                <p style={{ color: C.muted, fontSize: 12, fontFamily: "monospace", marginBottom: 24 }}>
                  Enter your registered mobile number
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>
                    MOBILE NUMBER
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{
                      padding: "10px 14px", background: C.steel,
                      border: `1px solid ${C.border}`, borderRadius: 6,
                      color: C.amber, fontFamily: "monospace", fontSize: 14,
                      fontWeight: 600, flexShrink: 0,
                    }}>+91</div>
                    <input
                      type="tel" maxLength={10} value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && sendOTP()}
                      placeholder="9876543210"
                      autoFocus
                      style={{
                        flex: 1, background: C.steel,
                        border: `1px solid ${error ? C.red + "66" : C.border}`,
                        borderRadius: 6, padding: "10px 14px",
                        color: "#d6dae6", fontFamily: "monospace", fontSize: 15,
                        letterSpacing: 2, outline: "none",
                      }}
                    />
                  </div>
                </div>

                {error && <p style={{ color: C.red, fontSize: 12, fontFamily: "monospace", marginBottom: 16 }}>{error}</p>}

                <button onClick={sendOTP} disabled={loading || phone.length !== 10} style={{
                  width: "100%", padding: "13px",
                  background: phone.length === 10 ? C.amber : "rgba(245,166,35,0.3)",
                  border: "none", borderRadius: 8,
                  color: phone.length === 10 ? C.ink : "rgba(0,0,0,0.5)",
                  fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: phone.length === 10 ? "pointer" : "default",
                  transition: "all 0.2s",
                }}>
                  {loading ? "Sending…" : "Send OTP →"}
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Enter OTP
                </h2>
                <p style={{ color: C.muted, fontSize: 12, fontFamily: "monospace", marginBottom: 24 }}>
                  Sent to +91-{phone.slice(0, 3)}XXXXX{phone.slice(-2)}
                </p>

                {/* Fixed OTP hint */}
                <div
                  onClick={() => {
                    const code = ["9", "8", "9", "8", "9", "8"];
                    setOtp(code);
                    verifyOTPWithCode("989898");
                  }}
                  title="Click to auto-fill and login"
                  style={{
                    marginBottom: 16, padding: "10px 14px",
                    background: "rgba(0,212,200,0.1)",
                    border: "1px solid rgba(0,212,200,0.3)",
                    borderRadius: 8, textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 11 }}>Fixed OTP: </span>
                  <span style={{ color: C.cyan, fontFamily: "monospace", fontSize: 18, fontWeight: 800, letterSpacing: 4 }}>989898</span>
                  <div style={{ color: C.cyan, fontSize: 11, marginTop: 4, opacity: 0.8 }}>(Click here to auto-fill & login)</div>
                </div>

                {/* OTP boxes */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="tel" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !digit && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      autoFocus={i === 0}
                      style={{
                        flex: 1, minWidth: 0, maxWidth: 52, height: 52,
                        background: digit ? "rgba(245,166,35,0.08)" : C.steel,
                        border: `2px solid ${digit ? C.amber : C.border}`,
                        borderRadius: 8, textAlign: "center",
                        color: C.amber, fontFamily: "'Syne',sans-serif",
                        fontSize: 20, fontWeight: 800, outline: "none",
                        transition: "all 0.15s",
                      }}
                    />
                  ))}
                </div>

                {error && <p style={{ color: C.red, fontSize: 12, fontFamily: "monospace", marginBottom: 16 }}>{error}</p>}

                <button onClick={verifyOTP} disabled={loading || otp.join("").length < 6} style={{
                  width: "100%", padding: "13px",
                  background: otp.join("").length === 6 ? C.amber : "rgba(245,166,35,0.3)",
                  border: "none", borderRadius: 8,
                  color: otp.join("").length === 6 ? C.ink : "rgba(0,0,0,0.5)",
                  fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: otp.join("").length === 6 ? "pointer" : "default",
                }}>
                  {loading ? "Verifying…" : "Verify & Login →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  {countdown > 0 ? (
                    <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 12 }}>
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button onClick={() => { sendOTP(); startCountdown(); }} style={{
                      background: "none", border: "none", color: C.cyan,
                      fontFamily: "monospace", fontSize: 12, cursor: "pointer",
                    }}>
                      Resend OTP
                    </button>
                  )}
                  <span style={{ color: C.border, margin: "0 10px" }}>·</span>
                  <button onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }} style={{
                    background: "none", border: "none", color: C.muted,
                    fontFamily: "monospace", fontSize: 12, cursor: "pointer",
                  }}>
                    Change number
                  </button>
                </div>
              </>
            )}
          </div>


        </div>

        <p style={{ textAlign: "center", color: C.border, fontFamily: "monospace", fontSize: 11, marginTop: 24 }}>
          AI ERP Platform · Enterprise Edition
        </p>
      </div>
    </div>
  );
}

