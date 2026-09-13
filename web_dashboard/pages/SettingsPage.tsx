// src/pages/SettingsPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { T, cardStyle } from "../store/theme";
import api from "../store/apiClient";
import { IconSettings, IconLink, IconUsers, IconHardDrive, IconUser, IconAI, IconRefresh } from "../components/Icons";

type Tab = "general" | "tally" | "ai" | "users" | "backup" | "device";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("general");
  const { user, company, token, refreshToken } = useAuthStore();

  const [tallyUrl, setTallyUrl] = useState("");
  const [tallyCompany, setTallyCompany] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [aiThreshold, setAiThreshold] = useState(0.85);
  const [testingTally, setTestingTally] = useState(false);
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


  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => api.get("/settings/company").then(r => r.data || {}),
  });

  useEffect(() => {
    if (settings) {
      setTallyUrl(settings.tally_url || "");
      setTallyCompany(settings.tally_company || "");
      setWhatsappToken(settings.whatsapp_token || "");
      setGeminiKey(settings.gemini_key || "");
      setAiThreshold(settings.ai_threshold !== undefined ? settings.ai_threshold : 0.85);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => api.patch("/settings/company", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companySettings"] });
      alert("Settings saved successfully!");
    },
    onError: (err: any) => {
      alert(`Error saving settings: ${err?.response?.data?.detail || err.message}`);
    }
  });

  async function testTallyConnection() {
    setTestingTally(true);
    try {
      const res = await api.get("/erp/connection/test/tally");
      if (res.data?.connected || res.data?.success) {
        alert(`Connection successful!\n${res.data?.message || "TallyPrime is reachable and responding."}`);
      } else {
        alert(`Connection failed: ${res.data?.error || "Could not connect to Tally"}`);
      }
    } catch (err: any) {
      alert(`Connection failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setTestingTally(false);
    }
  }

  const tabBtn = (t: Tab, label: string, icon: React.ReactNode) => (
    <button onClick={() => setTab(t)} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "9px 16px", border: "none", background: "none",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
      color: tab === t ? T.primary : T.text3,
      borderBottom: tab === t ? `2px solid ${T.primary}` : "2px solid transparent",
      transition: "all 0.15s",
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, marginBottom: 24, letterSpacing: "-0.4px" }}>Settings</h1>

      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 28 }}>
        {tabBtn("general", "General",     <IconSettings size={14} color={tab === "general" ? T.primary : T.text3} />)}
        {tabBtn("tally",   "ERP / Tally",  <IconLink size={14} color={tab === "tally" ? T.primary : T.text3} />)}
        {tabBtn("ai",      "AI Settings",  <IconAI size={14} color={tab === "ai" ? T.primary : T.text3} />)}
        {tabBtn("users",   "Users",        <IconUsers size={14} color={tab === "users" ? T.primary : T.text3} />)}
        {tabBtn("backup",  "Backup",       <IconHardDrive size={14} color={tab === "backup" ? T.primary : T.text3} />)}
        {tabBtn("device",  "Device Sync",  <IconLink size={14} color={tab === "device" ? T.primary : T.text3} />)}
      </div>

      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={cardStyle({ padding: 24 })}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 20 }}>Company Information</h2>
            {[
              { label: "Company Name", value: company?.name || "Demo Company" },
              { label: "GSTIN",        value: company?.gstin || "—" },
              { label: "Plan",         value: company?.plan || "Enterprise" },
              { label: "Email",        value: user?.email || "—" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                  {f.label}
                </label>
                <div style={{
                  padding: "10px 14px", background: "#f8fafc",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1, fontWeight: 500,
                }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={cardStyle({ padding: 24 })}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 20 }}>My Profile</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff",
              }}>{(user?.name || "A")[0].toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text1 }}>{user?.name || "Admin"}</div>
                <div style={{ fontSize: 12, color: T.text3 }}>{user?.role || "owner"}</div>
              </div>
            </div>
            {[
              { label: "Name",  value: user?.name  || "—" },
              { label: "Phone", value: user?.phone || "—" },
              { label: "Role",  value: user?.role  || "—" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
                  {f.label}
                </label>
                <div style={{
                  padding: "10px 14px", background: "#f8fafc",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1,
                }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "tally" && (
        <div style={{ maxWidth: 560 }}>
          <div style={cardStyle({ padding: 28 })}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 6 }}>TallyPrime Integration</h2>
            <p style={{ fontSize: 13, color: T.text3, marginBottom: 24 }}>Configure connection to your local TallyPrime server</p>
            
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 7 }}>Tally URL</label>
              <input 
                value={tallyUrl} 
                onChange={e => setTallyUrl(e.target.value)}
                placeholder="http://localhost:9000" 
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }} 
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 7 }}>Company Name</label>
              <input 
                value={tallyCompany} 
                onChange={e => setTallyCompany(e.target.value)}
                placeholder="As in TallyPrime" 
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }} 
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button 
                onClick={testTallyConnection}
                disabled={testingTally}
                style={{
                  padding: "10px 24px", background: "#f8fafc",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  color: T.text2, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6
                }}
              >
                {testingTally ? "Testing..." : "Test Connection"}
              </button>
              <button 
                onClick={() => saveMutation.mutate({ tally_url: tallyUrl, tally_company: tallyCompany })}
                disabled={saveMutation.isPending}
                style={{
                  padding: "10px 24px", background: T.primary,
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: saveMutation.isPending ? 0.7 : 1
                }}
              >
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
            </div>
            <div style={{ marginTop: 24, padding: "16px 18px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 }}> Setup Instructions</div>
              <ol style={{ fontSize: 12, color: "#15803d", lineHeight: 2, paddingLeft: 18 }}>
                <li>Open TallyPrime → Press F12 (Configure)</li>
                <li>Go to Advanced Configuration</li>
                <li>Enable HTTP Server → Set Port to 9000</li>
                <li>Open your company in TallyPrime</li>
                <li>Click "Test Connection" above</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div style={{ maxWidth: 560 }}>
          <div style={cardStyle({ padding: 28 })}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 6 }}>AI & OCR Settings</h2>
            <p style={{ fontSize: 13, color: T.text3, marginBottom: 24 }}>Configure your Gemini API key and confidence threshold</p>
            
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 7 }}>Gemini API Key</label>
              <input 
                type="password"
                value={geminiKey} 
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..." 
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }} 
              />
              <span style={{ fontSize: 11, color: T.text3, marginTop: 4, display: "block" }}>
                Enter your Google AI Studio Gemini API Key.
              </span>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 7 }}>
                Auto-Approve Threshold: <span style={{ color: T.primary, fontWeight: 700 }}>{Math.round(aiThreshold * 100)}%</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.0" 
                  step="0.05"
                  value={aiThreshold} 
                  onChange={e => setAiThreshold(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: T.primary }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text2, width: 36 }}>{aiThreshold.toFixed(2)}</span>
              </div>
              <span style={{ fontSize: 11, color: T.text3, marginTop: 4, display: "block" }}>
                AI extractions with a confidence score above this threshold will automatically bypass human review.
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button 
                onClick={() => saveMutation.mutate({ gemini_key: geminiKey, ai_threshold: aiThreshold })}
                disabled={saveMutation.isPending}
                style={{
                  padding: "10px 24px", background: T.primary,
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: saveMutation.isPending ? 0.7 : 1
                }}
              >
                {saveMutation.isPending ? "Saving..." : "Save AI Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div style={cardStyle({ padding: 40, textAlign: "center" })}>
          <div style={{ marginBottom: 16, opacity: 0.3 }}><IconUsers size={40} color={T.text2} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 8 }}>User Management</div>
          <div style={{ fontSize: 13, color: T.text3 }}>Manage team members and roles</div>
        </div>
      )}

      {tab === "backup" && (
        <div style={cardStyle({ padding: 40, textAlign: "center" })}>
          <div style={{ marginBottom: 16, opacity: 0.3 }}><IconHardDrive size={40} color={T.text2} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 8 }}>Backup & Restore</div>
          <div style={{ fontSize: 13, color: T.text3 }}>Manage your data backups</div>
        </div>
      )}

      {tab === "device" && (
        <div style={{ maxWidth: 640 }}>
          <div style={cardStyle({ padding: 32 })}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 6 }}>Mobile Device Sync</h2>
            <p style={{ fontSize: 13, color: T.text3, marginBottom: 28 }}>
              Connect your Daynisc mobile application to your local software dashboard to share real-time sales, inventory, and accounting updates.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
              {/* QR Code Frame */}
              <div style={{
                background: "#f8fafc",
                border: `1.5px solid ${T.border}`,
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              }}>
                <div style={{
                  padding: 12,
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  boxShadow: "0 8px 24px rgba(67, 97, 238, 0.08)",
                  display: "inline-block",
                  marginBottom: 14,
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      JSON.stringify({
                        url: lanUrl,
                        token: token || "demo-jwt-token-daynisc-2025",
                        refresh_token: refreshToken || "demo-jwt-token-daynisc-2025-refresh"
                      })
                    )}`}
                    alt="Daynisc Sync QR Code"
                    style={{ width: 180, height: 180, display: "block" }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>Scan QR Code</span>
              </div>

              {/* Numeric Code Block */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{
                    fontSize: 11, fontWeight: 700, color: T.text3,
                    textTransform: "uppercase", letterSpacing: "0.8px",
                    display: "block", marginBottom: 8
                  }}>
                    Dynamic Session Sync
                  </label>
                  <p style={{ fontSize: 12, color: T.text3, margin: 0, lineHeight: 1.4 }}>
                    This QR code encodes your active session token. Scanning it on the mobile app will copy the session and connect automatically.
                  </p>
                </div>

                <div style={{
                  background: "#eff6ff",
                  borderRadius: 12,
                  padding: "16px 18px",
                  border: `1px solid ${T.primary}20`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
                    Active PC Endpoint:
                  </div>
                  <code style={{ fontSize: 11, color: T.text1, fontWeight: 600, fontFamily: "monospace", wordBreak: "break-all" }}>
                    {lanUrl}
                  </code>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 10px #22c55e",
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>
                    Server running at dynamic LAN IP
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 28,
              padding: "18px 22px",
              background: "linear-gradient(135deg, #fafafa, #f5f5f5)",
              borderRadius: 14,
              border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1, marginBottom: 8 }}>
                How to Pair Device:
              </div>
              <ul style={{ fontSize: 12, color: T.text2, lineHeight: "22px", paddingLeft: 18, margin: 0 }}>
                <li>Download the Daynisc App on your mobile device.</li>
                <li>Ensure your phone is connected to the same Wi-Fi/local network as this PC.</li>
                <li>Scan this QR code using the in-app scanner.</li>
                <li>Your device will automatically configure the endpoint and log in as <strong>{user?.name || "Admin"}</strong>.</li>
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
