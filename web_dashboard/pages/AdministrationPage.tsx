import { useState } from "react";
import { T, cardStyle, badge } from "../store/theme";
import PermissionBuilderPage from "./PermissionBuilderPage";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AdministrationPage() {
  const [activeAdminTab, setActiveAdminTab] = useState("roles");

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Administration & Security Console
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Manage authorization matrices, configure system-wide backups, edit API webhook links, and track subscriptions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {[
          { id: "roles", label: "User Roles & Permissions" },
          { id: "backup", label: "System Backup" },
          { id: "apikeys", label: "Developer Webhooks & API Keys" },
          { id: "subscription", label: "Billing & Subscriptions" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveAdminTab(t.id)}
            style={{
              padding: "10px 18px", border: "none", background: "none",
              color: activeAdminTab === t.id ? T.primary : T.text3,
              fontWeight: activeAdminTab === t.id ? 700 : 500, fontSize: 12,
              borderBottom: activeAdminTab === t.id ? `2px solid ${T.primary}` : "none",
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeAdminTab === "roles" && (
        <div style={{ marginTop: -20 }}>
          {/* Reuse the permission builder directly as a clean modular layout component */}
          <PermissionBuilderPage />
        </div>
      )}

      {activeAdminTab === "backup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Schedule Automated Backups</h3>
            <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, marginBottom: 14 }}>
              Enable daily backups of accounting vouchers and ledger configurations. Archives are stored encrypted in AWS S3 buckets.
            </p>
            <button
              onClick={() => alert("Backup executed! Zip file saved successfully.")}
              style={{
                width: "100%", padding: 10, background: T.primary, color: "#fff", border: "none",
                borderRadius: T.radiusSm, fontSize: 12, fontWeight: 700, cursor: "pointer"
              }}
            >
              Trigger Manual Backup Now
            </button>
          </Card>
        </div>
      )}

      {activeAdminTab === "apikeys" && (
        <Card style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>API Authorization Keys</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginBottom: 4 }}>Daynisc Production API Token</div>
              <input
                type="text"
                readOnly
                value="dnc_live_7841029481602938aed9"
                style={{ width: "100%", padding: 8, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#f1f5f9", fontFamily: "monospace" }}
              />
            </div>
            <button
              onClick={() => alert("Rotated system API Keys!")}
              style={{
                width: "fit-content", padding: "8px 14px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                color: T.text1, borderRadius: T.radiusSm, fontSize: 11, fontWeight: 700, cursor: "pointer"
              }}
            >
              Rotate Live API Keys
            </button>
          </div>
        </Card>
      )}

      {activeAdminTab === "subscription" && (
        <Card style={{ maxWidth: 400 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 8 }}>Daynisc Enterprise Tier</h3>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.primary, marginBottom: 12 }}>₹14,999 / mo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: T.text2, marginBottom: 14 }}>
            <div>Unlimited connected companies</div>
            <div>Full Visual Automation Builder</div>
            <div>High speed OCR extractions</div>
            <div>Tally integration sync</div>
          </div>
          <span style={badge(T.green, T.greenBg)}>Renewal Date: July 28, 2026</span>
        </Card>
      )}
    </div>
  );
}
