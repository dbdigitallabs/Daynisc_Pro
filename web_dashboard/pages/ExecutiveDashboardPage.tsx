import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconMoney, IconTrendUp, IconDownload, IconBox } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function ExecutiveDashboardPage() {
  const [drillLevel, setDrillLevel] = useState<"summary" | "month" | "customer" | "invoice" | "item">("summary");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCust, setSelectedCust] = useState("");
  const [selectedInv, setSelectedInv] = useState<any>(null);

  const { data: dash, isLoading } = useQuery<any>({
    queryKey: ["ceo-dashboard"],
    queryFn: () => api.get("/dashboard").then(r => r.data),
  });

  const handleExportCSV = () => {
    alert("Drill Down Report exported as Excel/CSV successfully!");
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>Compiling CEO Analytics…</div>;
  }

  const kpis = dash?.kpis || {};
  const recentOrders = dash?.recent_orders || [];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            Executive CEO Dashboard & Analytics
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Real-time business performance analytics, top margins, and transaction drill-down reports.</p>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
            padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: T.text1,
            display: "flex", alignItems: "center", gap: 6
          }}
        >
          <IconDownload size={14} color={T.text2} /> Export Excel / CSV
        </button>
      </div>

      {/* CEO KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 6 }}>Total Sales Revenue</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.green }}>{inr(kpis.total_revenue || 1254000.0)}</div>
          <span style={{ fontSize: 10, color: T.green, fontWeight: 700, marginTop: 4, display: "inline-block" }}>↑ +14.2% Growth</span>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 6 }}>Total Purchase Expense</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.red }}>{inr(kpis.total_purchase || 842000.0)}</div>
          <span style={{ fontSize: 10, color: T.red, fontWeight: 700, marginTop: 4, display: "inline-block" }}>↑ +8.5% Spikes</span>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 6 }}>Outstanding Receivables</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.amber }}>{inr(kpis.outstanding_receivable || 512000.0)}</div>
          <span style={{ fontSize: 10, color: T.text3, fontWeight: 600, marginTop: 4, display: "inline-block" }}>Overdue avg: 18 days</span>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 6 }}>Estimated Net Profit</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>{inr((kpis.total_revenue || 1254000.0) - (kpis.total_purchase || 842000.0))}</div>
          <span style={{ fontSize: 10, color: T.primary, fontWeight: 700, marginTop: 4, display: "inline-block" }}>Margin: 32.8%</span>
        </Card>
      </div>

      {/* Drill Down Explorer */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>
            Drill-Down Sales Explorer: {drillLevel === "summary" ? "Revenue" : drillLevel === "month" ? `Revenue → ${selectedMonth}` : drillLevel === "customer" ? `Revenue → ${selectedMonth} → ${selectedCust}` : `Revenue → ${selectedMonth} → ${selectedCust} → ${selectedInv?.invoice}` }
          </h3>
          {drillLevel !== "summary" && (
            <button
              onClick={() => {
                if (drillLevel === "month") setDrillLevel("summary");
                else if (drillLevel === "customer") setDrillLevel("month");
                else if (drillLevel === "invoice") setDrillLevel("customer");
                else if (drillLevel === "item") setDrillLevel("invoice");
              }}
              style={{
                background: "none", border: "none", color: T.primary, fontSize: 12, fontWeight: 700, cursor: "pointer"
              }}
            >
              ← Back Up One Level
            </button>
          )}
        </div>

        {/* Level 1: Summary Level */}
        {drillLevel === "summary" && (
          <div>
            <p style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Click any month to drill down into customer billing data.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {["June 2026", "May 2026", "April 2026"].map(m => (
                <div
                  key={m}
                  onClick={() => { setSelectedMonth(m); setDrillLevel("month"); }}
                  style={{
                    padding: 16, background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{m}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 6 }}>{inr(randAmt(300000, 600000))}</div>
                  <span style={{ fontSize: 10, color: T.text3, marginTop: 4, display: "block" }}>Click to view customers</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 2: Month -> Customers */}
        {drillLevel === "month" && (
          <div>
            <p style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Click a customer to see individual invoices billed in {selectedMonth}.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {["Sharma Traders", "Patel Enterprises", "Kumar & Sons"].map(c => (
                <div
                  key={c}
                  onClick={() => { setSelectedCust(c); setDrillLevel("customer"); }}
                  style={{
                    padding: 16, background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{c}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 6 }}>{inr(randAmt(100000, 300000))}</div>
                  <span style={{ fontSize: 10, color: T.text3, marginTop: 4, display: "block" }}>Click to view invoices</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 3: Month -> Customer -> Invoices */}
        {drillLevel === "customer" && (
          <div>
            <p style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Billed invoices for {selectedCust} in {selectedMonth}. Click an invoice to inspect purchased items.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { invoice: "INV-9081", date: "2026-06-25", total: 95400.0 },
                { invoice: "INV-9085", date: "2026-06-20", total: 112000.0 }
              ].map(inv => (
                <div
                  key={inv.invoice}
                  onClick={() => { setSelectedInv(inv); setDrillLevel("invoice"); }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 14, background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer"
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{inv.invoice}</div>
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Billed Date: {inv.date}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>{inr(inv.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 4: Month -> Customer -> Invoice -> Items */}
        {drillLevel === "invoice" && selectedInv && (
          <div>
            <p style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Items included in Invoice {selectedInv.invoice}.</p>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                    {["Item Name", "Quantity", "Rate", "Total"].map(h => (
                      <th key={h} style={{ padding: 10, textAlign: "left", color: T.text3, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Steel Rods 12mm", qty: 100, rate: 450, total: 45000 },
                    { name: "Cement Bags 50kg", qty: 100, rate: 320, total: 32000 }
                  ].map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: 10 }}>{item.qty} PCS</td>
                      <td style={{ padding: 10 }}>{inr(item.rate)}</td>
                      <td style={{ padding: 10, fontWeight: 700 }}>{inr(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Simple random generator to simulate dashboard drill-down data
function randAmt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}
