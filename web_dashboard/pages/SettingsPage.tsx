// src/pages/SettingsPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { T, cardStyle } from "../store/theme";
import api from "../store/apiClient";
import { toast } from "react-hot-toast";
import { IconSettings, IconLink } from "../components/Icons";

type Tab = "general" | "tally" | "device";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("general");
  const { user, company, token, refreshToken, activeErp, setActiveErp } = useAuthStore();

  const [tallyUrl, setTallyUrl] = useState("");
  const [tallyCompany, setTallyCompany] = useState("");
  const [odooUrl, setOdooUrl] = useState("http://localhost:8069");
  const [odooDb, setOdooDb] = useState("");
  const [odooUsername, setOdooUsername] = useState("");
  const [odooPassword, setOdooPassword] = useState("");
  const [testingOdoo, setTestingOdoo] = useState(false);
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

  const { data: settings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => api.get("/settings/company").then(r => r.data || {}),
  });

  useEffect(() => {
    if (!settings) return;
    if (settings.tally_url !== undefined) setTallyUrl(settings.tally_url || "");
    if (settings.tally_company !== undefined) setTallyCompany(settings.tally_company || "");
    if (settings.active_erp && settings.active_erp !== activeErp) {
      setActiveErp(settings.active_erp);
    }
    if (settings.odoo_url !== undefined) setOdooUrl(settings.odoo_url || "http://localhost:8069");
    if (settings.odoo_db !== undefined) setOdooDb(settings.odoo_db || "");
    if (settings.odoo_username !== undefined) setOdooUsername(settings.odoo_username || "");
    if (settings.odoo_password !== undefined) setOdooPassword(settings.odoo_password || "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => api.patch("/settings/company", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success("Settings saved successfully!");
    },
    onError: (err: any) => {
      toast.error(`Error saving settings: ${err?.response?.data?.detail || err.message}`);
    }
  });

  async function testTallyConnection() {
    setTestingTally(true);
    try {
      const res = await api.get("/erp/connection/test/tally");
      if (res.data?.connected || res.data?.success) {
        toast.success(`Connection successful!\n${res.data?.message || "TallyPrime is reachable and responding."}`);
      } else {
        toast.error(`Connection failed: ${res.data?.error || "Could not connect to Tally"}`);
      }
    } catch (err: any) {
      toast.error(`Connection failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setTestingTally(false);
    }
  }

  async function testOdooConnection() {
    setTestingOdoo(true);
    try {
      const res = await api.post("/erp/connection/test/odoo", {
        odoo_url: odooUrl,
        odoo_db: odooDb,
        odoo_username: odooUsername,
        odoo_password: odooPassword
      });
      if (res.data?.connected && res.data?.authenticated) {
        toast.success(`Odoo Connection Successful!\n${res.data?.message || "Connected to Odoo ERP."}`);
      } else if (res.data?.connected && !res.data?.authenticated) {
        toast.error(`Odoo Server Reached (v${res.data?.server_version}), but credentials failed.`);
      } else {
        toast.error(`Odoo Connection Failed: ${res.data?.error || res.data?.message || "Could not reach Odoo server."}`);
      }
    } catch (err: any) {
      toast.error(`Odoo Connection Failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setTestingOdoo(false);
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
        {tabBtn("tally",   "ERP (Tally & Odoo)",  <IconLink size={14} color={tab === "tally" ? T.primary : T.text3} />)}
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
        <div style={{ maxWidth: 960 }}>
          {/* Active ERP Selector */}
          <div style={{ ...cardStyle({ padding: 20 }), marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Active ERP System</div>
                <div style={{ fontSize: 12, color: T.text3 }}>Choose which ERP Daynisc Pro syncs vouchers into automatically</div>
              </div>
              <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8, gap: 4 }}>
                {[
                  { key: "tally", label: "TallyPrime" },
                  { key: "odoo", label: "Odoo ERP" },
                  { key: "both", label: "Both (Dual Sync)" },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setActiveErp(opt.key as any);
                      saveMutation.mutate({ active_erp: opt.key });
                    }}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: activeErp === opt.key ? T.primary : "transparent",
                      color: activeErp === opt.key ? "#fff" : T.text2,
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: activeErp === "both" ? "repeat(auto-fit, minmax(420px, 1fr))" : "1fr", gap: 20 }}>
            {/* TallyPrime Integration Card (shown only when Tally or Both selected) */}
            {(activeErp === "tally" || activeErp === "both") && (
            <div style={cardStyle({ padding: 24 })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, margin: 0 }}>TallyPrime Integration</h2>
              </div>
              <p style={{ fontSize: 12.5, color: T.text3, marginBottom: 18 }}>Connect to local TallyPrime via XML HTTP (default port 9000)</p>
              
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 6 }}>Tally URL</label>
                <input 
                  value={tallyUrl} 
                  onChange={e => setTallyUrl(e.target.value)}
                  placeholder="http://localhost:9000" 
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 13, color: T.text1, outline: "none",
                    fontFamily: "'Inter',sans-serif",
                  }} 
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 6 }}>Company Name</label>
                <input 
                  value={tallyCompany} 
                  onChange={e => setTallyCompany(e.target.value)}
                  placeholder="As in TallyPrime" 
                  style={{
                    width: "100%", padding: "9px 12px",
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
                    padding: "9px 18px", background: "#f8fafc",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    color: T.text2, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  {testingTally ? "Testing..." : "Test Connection"}
                </button>
                <button 
                  onClick={() => saveMutation.mutate({ tally_url: tallyUrl, tally_company: tallyCompany, active_erp: activeErp })}
                  disabled={saveMutation.isPending}
                  style={{
                    padding: "9px 18px", background: T.primary,
                    border: "none", borderRadius: 8,
                    color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    opacity: saveMutation.isPending ? 0.7 : 1
                  }}
                >
                  {saveMutation.isPending ? "Saving..." : "Save Tally"}
                </button>
              </div>

              <div style={{ marginTop: 20, padding: "12px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>TallyPrime Setup</div>
                <ol style={{ fontSize: 11.5, color: "#15803d", lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                  <li>Open TallyPrime → Press F12 (Configure)</li>
                  <li>Go to Advanced Configuration → Enable HTTP Server (Port 9000)</li>
                  <li>Open your company in TallyPrime and test connection</li>
                </ol>
              </div>
            </div>
            )}

            {/* Odoo ERP Integration Card (shown only when Odoo or Both selected) */}
            {(activeErp === "odoo" || activeErp === "both") && (
            <div style={cardStyle({ padding: 24 })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>🟣</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, margin: 0 }}>Odoo ERP Integration</h2>
              </div>
              <p style={{ fontSize: 12.5, color: T.text3, marginBottom: 18 }}>Connect to Odoo (v14–v18+, Cloud / SaaS / On-Premise) via XML-RPC</p>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 5 }}>Odoo Server URL</label>
                <input 
                  value={odooUrl} 
                  onChange={e => setOdooUrl(e.target.value)}
                  placeholder="http://localhost:8069 or https://mycompany.odoo.com" 
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 13, color: T.text1, outline: "none",
                    fontFamily: "'Inter',sans-serif",
                  }} 
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 5 }}>Database Name</label>
                <input 
                  value={odooDb} 
                  onChange={e => setOdooDb(e.target.value)}
                  placeholder="e.g. odoo, daynisc_db" 
                  style={{
                    width: "100%", padding: "9px 12px",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 13, color: T.text1, outline: "none",
                    fontFamily: "'Inter',sans-serif",
                  }} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 5 }}>Username / Email</label>
                  <input 
                    value={odooUsername} 
                    onChange={e => setOdooUsername(e.target.value)}
                    placeholder="admin / user@odoo.com" 
                    style={{
                      width: "100%", padding: "9px 12px",
                      border: `1px solid ${T.border}`, borderRadius: 8,
                      fontSize: 13, color: T.text1, outline: "none",
                      fontFamily: "'Inter',sans-serif",
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: "block", marginBottom: 5 }}>API Key / Password</label>
                  <input 
                    type="password"
                    value={odooPassword} 
                    onChange={e => setOdooPassword(e.target.value)}
                    placeholder="••••••••" 
                    style={{
                      width: "100%", padding: "9px 12px",
                      border: `1px solid ${T.border}`, borderRadius: 8,
                      fontSize: 13, color: T.text1, outline: "none",
                      fontFamily: "'Inter',sans-serif",
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button 
                  onClick={testOdooConnection}
                  disabled={testingOdoo}
                  style={{
                    padding: "9px 18px", background: "#f8fafc",
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    color: T.text2, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  {testingOdoo ? "Testing..." : "Test Odoo Connection"}
                </button>
                <button 
                  onClick={() => saveMutation.mutate({
                    odoo_url: odooUrl,
                    odoo_db: odooDb,
                    odoo_username: odooUsername,
                    odoo_password: odooPassword,
                    active_erp: activeErp,
                  })}
                  disabled={saveMutation.isPending}
                  style={{
                    padding: "9px 18px", background: "#7c3aed",
                    border: "none", borderRadius: 8,
                    color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    opacity: saveMutation.isPending ? 0.7 : 1
                  }}
                >
                  {saveMutation.isPending ? "Saving..." : "Save Odoo"}
                </button>
              </div>

              <div style={{ marginTop: 20, padding: "12px 14px", background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b21a8", marginBottom: 4 }}>Odoo API Key Setup</div>
                <ol style={{ fontSize: 11.5, color: "#7e22ce", lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                  <li>Log in to Odoo → Click user avatar top right → <b>Preferences / My Profile</b></li>
                  <li>Go to <b>Account Security</b> tab → Click <b>New API Key</b></li>
                  <li>Copy the generated API Key and paste it into the Password field above</li>
                </ol>
              </div>
            </div>
            )}
          </div>
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
