import { useState } from "react";
import { T, cardStyle, badge } from "../store/theme";
import { IconBell, IconClock } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function NotificationCenterPage() {
  const [filterType, setFilterType] = useState("all");

  const alerts = [
    { id: 1, title: "AI Cost Spike Alert", desc: "Transport expenses rose 32% compared to last month average.", type: "AI Alerts", date: "Today 10:15 AM" },
    { id: 2, title: "Workflow Signature Required", desc: "Purchase Invoice PI-255 total ₹1,45,000 is pending manager sign-off.", type: "Workflow", date: "Today 9:30 AM" },
    { id: 3, title: "WhatsApp Alert Dispatched", desc: "Outbound GST Invoice receipt was successfully sent to Sharma Traders.", type: "WhatsApp", date: "Yesterday 4:00 PM" },
    { id: 4, title: "GSTR-1 Filing Deadline", desc: "GST Return filing window for Q1 closes in 13 days.", type: "System Alerts", date: "2026-06-25" }
  ];

  const filtered = filterType === "all" ? alerts : alerts.filter(a => a.type.toLowerCase().includes(filterType.toLowerCase().slice(0, 4)));

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Notification Center & Outbox Logs
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>One unified repository tracking approvals, system errors, AI anomalies, and WhatsApp logs.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["all", "AI Alerts", "Workflow", "WhatsApp", "System Alerts"].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            style={{
              padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${filterType === cat ? T.primary : T.border}`,
              background: filterType === cat ? T.primary + "15" : "#fff", color: filterType === cat ? T.primary : T.text3,
              fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((al) => (
          <Card key={al.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <IconBell size={18} color={T.primary} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{al.title}</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>{al.desc}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={badge(T.primary, "#eff6ff")}>{al.type}</span>
              <div style={{ fontSize: 9, color: T.text3, marginTop: 6 }}>{al.date}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
