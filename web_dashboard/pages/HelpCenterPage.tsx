import { useState } from "react";
import { T, cardStyle, badge } from "../store/theme";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}


export default function HelpCenterPage() {
  const [activeSupportTab, setActiveSupportTab] = useState("kb");

  const kbArticles = [
    { title: "Connecting Tally Prime via XML Localhost Port", desc: "Configure Tally Prime ODBC settings to Port 9000 and input HTTP schema URL in Daynisc." },
    { title: "Configuring E-way Bills Auto-categorization", desc: "Select files matching 'EWAY' inside Drive Hub to trigger automated OCR matching rules." }
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Help Center & Customer Support
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Find troubleshooting guidelines, submit technical support tickets, or read latest platform release logs.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {[
          { id: "kb", label: "Knowledge Base" },
          { id: "notes", label: "Release Notes History" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSupportTab(t.id)}
            style={{
              padding: "10px 18px", border: "none", background: "none",
              color: activeSupportTab === t.id ? T.primary : T.text3,
              fontWeight: activeSupportTab === t.id ? 700 : 500, fontSize: 12,
              borderBottom: activeSupportTab === t.id ? `2px solid ${T.primary}` : "none",
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSupportTab === "kb" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {kbArticles.map((art, idx) => (
            <Card key={idx}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1, marginBottom: 6 }}>{art.title}</h3>
              <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.4 }}>{art.desc}</p>
            </Card>
          ))}
        </div>
      )}

      {activeSupportTab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { ver: "v1.2.0", date: "2026-06-28", desc: "Refactored visual n8n Node Automation Builder, Google Drive DMS folder structure, and added unified Calendar." },
            { ver: "v1.1.0", date: "2026-06-15", desc: "Added Gemini-driven bank statements reconciliation matching and safety-guarded SQL assistance." }
          ].map((rel, idx) => (
            <Card key={idx}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: T.primary }}>{rel.ver} Release</strong>
                <span style={{ fontSize: 10, color: T.text3 }}>{rel.date}</span>
              </div>
              <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.4 }}>{rel.desc}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
