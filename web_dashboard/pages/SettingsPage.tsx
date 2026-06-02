// src/pages/SettingsPage.tsx
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { T, cardStyle } from "../store/theme";
import { IconSettings, IconLink, IconUsers, IconHardDrive, IconUser } from "../components/Icons";

type Tab = "general" | "tally" | "users" | "backup" | "device";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const { user, company } = useAuthStore();

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
        {tabBtn("general", "General",    <IconSettings size={14} color={tab === "general" ? T.primary : T.text3} />)}
        {tabBtn("tally",   "ERP / Tally", <IconLink size={14} color={tab === "tally" ? T.primary : T.text3} />)}
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
            {[
              { label: "Tally URL",     value: "http://localhost:9000", ph: "http://localhost:9000" },
              { label: "Company Name",  value: "",                       ph: "As in TallyPrime" },
              { label: "Port",          value: "9000",                   ph: "9000" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 7 }}>{f.label}</label>
                <input defaultValue={f.value} placeholder={f.ph} style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text1, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={{
                padding: "10px 24px", background: "#f8fafc",
                border: `1px solid ${T.border}`, borderRadius: 8,
                color: T.text2, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Test Connection</button>
              <button style={{
                padding: "10px 24px", background: T.primary,
                border: "none", borderRadius: 8,
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Save Settings</button>
            </div>
            <div style={{ marginTop: 24, padding: "16px 18px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 }}>📋 Setup Instructions</div>
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
            <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 6 }}>📱 Mobile Device Sync</h2>
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
                    src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://10.39.55.239:8000/api/v1"
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
                    Backup Pairing Code
                  </label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    {"395239".split("").map((digit, idx) => (
                      <div key={idx} style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #eff6ff, #f3e8ff)",
                        border: `1.5px solid ${T.primary}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 800,
                        color: T.primary,
                        boxShadow: "0 4px 10px rgba(67, 97, 238, 0.05)",
                      }}>
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: "#eff6ff",
                  borderRadius: 12,
                  padding: "16px 18px",
                  border: `1px solid ${T.primary}20`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
                    Active Endpoint:
                  </div>
                  <code style={{ fontSize: 12, color: T.text1, fontWeight: 600, fontFamily: "monospace" }}>
                    http://10.39.55.239:8000/api/v1
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
                <li>Tap <strong>"Link Desktop Software"</strong> on the Login/Welcome Screen.</li>
                <li>Scan the QR code on the left OR enter the 6-digit numeric pairing code.</li>
                <li>Once connected, sign in with your phone and OTP to share data securely!</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
