// src/pages/GSTPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconUpload, IconDownload, IconScale, IconClipboard, IconBarChart } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, ...style }}>{children}</div>;
}

export default function GSTPage() {
  const navigate = useNavigate();
  const [reconData, setReconData] = useState<any>(null);

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
                      {m.filed ? "Filed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GSTR tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { title: "GSTR-1",  desc: "Outward Supplies",  due: "11th of next month",  color: T.primary },
          { title: "GSTR-3B", desc: "Monthly Summary",   due: "20th of next month",  color: T.amber   },
          { title: "GSTR-2B", desc: "ITC Auto Drafted",  due: "14th of next month",  color: T.green   },
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
              <span style={badge(T.green, T.greenBg)}>Synced</span>
            </div>
          </div>
        ))}
      </div>

      {/* GSTR-2B Mismatch Reconciler */}
      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>GSTR-2B ITC Mismatch Reconciler</h3>
            <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Compare purchase register with GSTR-2B portal data to claim Input Tax Credit.</p>
          </div>
          <button
            onClick={async () => {
              try {
                const sampleGstr = {
                  items: [
                    { gstin: "24AAACR1234Z1Z9", invoice_number: "PUR-9081", invoice_date: "2026-06-28", taxable_amount: 100000, cgst: 9000, sgst: 9000, total: 120000 },
                    { gstin: "24AAACS4321Z2Z8", invoice_number: "PUR-9082", invoice_date: "2026-06-28", taxable_amount: 80000, cgst: 7200, sgst: 7200, total: 90000 },
                    { gstin: "24AAACO9999A1Z1", invoice_number: "PUR-MISSING-IN-BOOKS", invoice_date: "2026-06-25", taxable_amount: 15000, cgst: 1350, sgst: 1350, total: 17700 }
                  ]
                };
                const res = await api.post("/gst/reconcile", sampleGstr);
                setReconData(res.data);
              } catch (e: any) {
                alert("Failed to reconcile: " + e.message);
              }
            }}
            style={{
              background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
              padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <IconScale size={14} color="#fff" /> Reconcile GSTR-2B Portal
          </button>
        </div>

        {reconData ? (
          <div>
            {/* Stats Summary */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Matched", val: reconData.summary.matched_count, color: T.green, bg: T.greenBg },
                { label: "Mismatched", val: reconData.summary.mismatched_count, color: T.amber, bg: T.amberBg },
                { label: "Missing in books", val: reconData.summary.missing_in_books_count, color: T.purple, bg: T.purpleBg },
                { label: "Missing in portal", val: reconData.summary.missing_in_portal_count, color: T.red, bg: T.redBg }
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: 12, background: s.bg, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Reconciliation table details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Matched Panel */}
              {reconData.matched.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 8 }}> Matches confirmed (Claimable ITC)</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        {["Vendor GSTIN", "Invoice", "Books Amount", "Portal Amount", "ITC Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {reconData.matched.map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td style={tdStyle}>{m.portal_item.gstin}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{m.portal_item.invoice_number}</td>
                          <td style={tdStyle}>{inr(m.books_item.total)}</td>
                          <td style={tdStyle}>{inr(m.portal_item.total)}</td>
                          <td style={tdStyle}><span style={badge(T.green, T.greenBg)}>Eligible</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Missing in Books Panel */}
              {reconData.missing_in_books.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: T.purple, marginBottom: 8 }}>️ Invoices in Portal but Missing in Books</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        {["Vendor GSTIN", "Invoice", "Portal Date", "Portal Amount", "Action"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {reconData.missing_in_books.map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td style={tdStyle}>{m.portal_item.gstin}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{m.portal_item.invoice_number}</td>
                          <td style={tdStyle}>{m.portal_item.invoice_date}</td>
                          <td style={tdStyle}>{inr(m.portal_item.total)}</td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => navigate("/ai-verification")}
                              style={{ padding: "4px 8px", background: T.purple, color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                            >
                              Create Voucher
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 10 }}>
            <span style={{ display: "flex", justifyContent: "center" }}><IconBarChart size={32} color={T.primary} /></span>
            <span style={{ fontSize: 12, color: T.text3 }}>No reconciliation report generated yet. Click the button above to run checks.</span>
          </div>
        )}
      </Card>
    </div>
  );
}
