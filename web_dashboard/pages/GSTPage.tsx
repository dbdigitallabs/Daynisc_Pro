// src/pages/GSTPage.tsx
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconUpload, IconDownload, IconScale, IconClipboard } from "../components/Icons";

export default function GSTPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["gst-summary"],
    queryFn: () => api.get("/accounting/gst-summary").then(r => r.data),
  });

  const outputGst  = data?.output_gst    || 0;
  const inputGst   = data?.input_gst     || 0;
  const netLiab    = data?.net_liability || 0;
  const monthly    = data?.monthly       || [];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, marginBottom: 24, letterSpacing: "-0.4px" }}>GST Returns</h1>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Output GST (Sales)",   value: inr(outputGst), icon: <IconUpload size={22} color={T.primary} />,                                    color: T.primary },
          { label: "Input GST (Purchase)", value: inr(inputGst),  icon: <IconDownload size={22} color={T.green} />,                                   color: T.green  },
          { label: "Net Liability",        value: inr(netLiab),   icon: <IconScale size={22} color={netLiab > 0 ? T.red : T.green} />,                color: netLiab > 0 ? T.red : T.green },
          { label: "Total Invoices",       value: String(data?.total_invoices || 0), icon: <IconClipboard size={22} color={T.amber} />, color: T.amber },
        ].map(k => (
          <div key={k.label} style={cardStyle({ padding: "18px 20px", flex: 1 })}>
            <div style={{ marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      {monthly.length > 0 && (
        <div style={cardStyle({ overflow: "hidden", marginBottom: 22 })}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Monthly GST Summary</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Month", "Output GST", "Input GST", "Net", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {monthly.map((m: any, i: number) => (
                <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: T.text1 }}>{m.month}</td>
                  <td style={{ ...tdStyle, color: T.primary, fontWeight: 600 }}>{inr(m.output)}</td>
                  <td style={{ ...tdStyle, color: T.green, fontWeight: 600 }}>{inr(m.input)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: Number(m.net) > 0 ? T.red : T.green }}>{inr(m.net)}</td>
                  <td style={tdStyle}>
                    <span style={badge(m.filed ? T.green : T.amber, m.filed ? T.greenBg : T.amberBg)}>
                      {m.filed ? "✓ Filed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GSTR tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { title: "GSTR-1",  desc: "Outward Supplies",  due: "11th of next month",  color: T.primary },
          { title: "GSTR-3B", desc: "Monthly Summary",   due: "20th of next month",  color: T.amber   },
          { title: "GSTR-2A", desc: "Inward Supplies",   due: "Auto-populated",      color: T.green   },
        ].map(g => (
          <div key={g.title} style={cardStyle({ padding: "20px 22px" })}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: g.color,
                background: g.color + "15", padding: "4px 10px",
                borderRadius: 6,
              }}>{g.title}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text1, marginBottom: 4 }}>{g.desc}</div>
            <div style={{ fontSize: 12, color: T.text3 }}>Due: {g.due}</div>
            <div style={{ marginTop: 14 }}>
              <span style={badge(T.amber, T.amberBg)}>Pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
