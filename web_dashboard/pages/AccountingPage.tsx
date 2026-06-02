// src/pages/AccountingPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconClipboard, IconUpload, IconDownload, IconMoney, IconUser, IconBuilding } from "../components/Icons";

type Tab = "vouchers" | "outstanding" | "ledger";

const VOUCHER_COLORS: Record<string, { color: string; bg: string }> = {
  purchase: { color: T.amber,   bg: T.amberBg  },
  sales:    { color: T.primary, bg: "#eff6ff"  },
  payment:  { color: T.red,     bg: T.redBg    },
  receipt:  { color: T.green,   bg: T.greenBg  },
  journal:  { color: T.text3,   bg: "#f8fafc"  },
};

// ── Page Header ───────────────────────────────────────────────────────────────
function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>{title}</h1>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ ...cardStyle({ padding: "20px 22px", flex: 1 }) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );
}

// ── Vouchers Tab ──────────────────────────────────────────────────────────────
function VouchersTab() {
  const [voucherType, setVoucherType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vouchers", voucherType, fromDate, toDate],
    queryFn: () => api.get("/accounting/vouchers", {
      params: {
        ...(voucherType ? { voucher_type: voucherType } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
        limit: 100,
      }
    }).then(r => r.data),
  });

  const vouchers = data?.items || [];
  const totalSales    = vouchers.filter((v: any) => v.voucher_type === "sales").reduce((s: number, v: any) => s + Number(v.total || 0), 0);
  const totalPurchase = vouchers.filter((v: any) => v.voucher_type === "purchase").reduce((s: number, v: any) => s + Number(v.total || 0), 0);

  const selectStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "7px 12px", fontSize: 13, color: T.text2,
    background: "#fff", cursor: "pointer", outline: "none",
  };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total Vouchers"  value={vouchers.length.toString()} icon={<IconClipboard size={20} color={T.primary} />} color={T.primary} />
        <KpiCard label="Sales Total"     value={inr(totalSales)}             icon={<IconUpload size={20} color={T.green} />}    color={T.green}  />
        <KpiCard label="Purchase Total"  value={inr(totalPurchase)}          icon={<IconDownload size={20} color={T.amber} />}  color={T.amber}  />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          <option value="sales">Sales</option>
          <option value="purchase">Purchase</option>
          <option value="payment">Payment</option>
          <option value="receipt">Receipt</option>
          <option value="journal">Journal</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          placeholder="From Date" style={selectStyle} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          placeholder="To Date" style={selectStyle} />
      </div>

      {/* Table */}
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>Loading vouchers…</div>
        ) : vouchers.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>No vouchers found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Voucher No.", "Type", "Date", "Party", "Reference", "Amount", "Tally"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v: any) => {
                const vc = VOUCHER_COLORS[v.voucher_type] || VOUCHER_COLORS.journal;
                return (
                  <tr key={v.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: T.primary }}>{v.voucher_number}</td>
                    <td style={tdStyle}>
                      <span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span>
                    </td>
                    <td style={tdStyle}>{v.voucher_date}</td>
                    <td style={tdStyle}>{v.party_name || "—"}</td>
                    <td style={{ ...tdStyle, color: T.text3 }}>{v.reference_number || "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.text1 }}>{inr(v.total)}</td>
                    <td style={tdStyle}>
                      <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                        {v.tally_synced ? "✓ Synced" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Outstanding Tab ───────────────────────────────────────────────────────────
function OutstandingTab() {
  const [partyType, setPartyType] = useState("customer");

  const { data, isLoading } = useQuery({
    queryKey: ["outstanding", partyType],
    queryFn: () => api.get("/accounting/outstanding", { params: { party_type: partyType, limit: 100 } }).then(r => r.data),
  });
  const items = data?.items || [];
  const totalAmt = items.reduce((s: number, p: any) => s + Number(p.receivable || p.payable || 0), 0);

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#f8fafc", borderRadius: 8, padding: 4, width: "fit-content", border: `1px solid ${T.border}` }}>
        {["customer", "supplier"].map(pt => (
          <button key={pt} onClick={() => setPartyType(pt)} style={{
            padding: "7px 20px", borderRadius: 6, border: "none",
            background: partyType === pt ? "#fff" : "transparent",
            color: partyType === pt ? T.primary : T.text3,
            fontWeight: partyType === pt ? 700 : 500,
            boxShadow: partyType === pt ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer", fontSize: 13, transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {pt === "customer" ? <><IconUser size={14} color={partyType === pt ? T.primary : T.text3} /> Receivables</> : <><IconBuilding size={14} color={partyType === pt ? T.primary : T.text3} /> Payables</>}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ ...cardStyle({ padding: "16px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }) }}>
        <span style={{ fontSize: 24 }}>{partyType === "customer" ? "💰" : "💸"}</span>
        <div>
          <div style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>
            Total {partyType === "customer" ? "Receivable" : "Payable"}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: partyType === "customer" ? T.green : T.red }}>
            {inr(totalAmt)}
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: T.text3 }}>
          {items.length} {partyType}s with outstanding
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3 }}>No outstanding records</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Party Name", "Type", "Invoices", partyType === "customer" ? "Receivable" : "Payable", "Aging", "Days Overdue"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p: any, i: number) => (
                <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: T.text1 }}>{p.party_name}</td>
                  <td style={tdStyle}><span style={badge(T.primary, "#eff6ff")}>{p.party_type}</span></td>
                  <td style={tdStyle}>{p.invoice_count}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: partyType === "customer" ? T.green : T.red }}>
                    {inr(p.receivable || p.payable)}
                  </td>
                  <td style={tdStyle}><span style={badge(T.amber, T.amberBg)}>{p.aging_bucket || "Current"}</span></td>
                  <td style={tdStyle}>{p.days_overdue || 0} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Ledger Tab ────────────────────────────────────────────────────────────────
function LedgerTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: () => api.get("/accounting/ledger", { params: { limit: 100 } }).then(r => r.data).catch(() => ({ items: [] })),
  });
  const entries = data?.items || [];

  return (
    <div>
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading ledger…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
            No ledger entries found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Description", "Debit", "Credit", "Balance"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any, i: number) => (
                <tr key={i} onMouseEnter={el => (el.currentTarget.style.background = T.rowHover)}
                  onMouseLeave={el => (el.currentTarget.style.background = "#fff")}>
                  <td style={tdStyle}>{e.date}</td>
                  <td style={{ ...tdStyle, color: T.text1 }}>{e.description}</td>
                  <td style={{ ...tdStyle, color: T.red, fontWeight: 600 }}>{e.debit ? inr(e.debit) : "—"}</td>
                  <td style={{ ...tdStyle, color: T.green, fontWeight: 600 }}>{e.credit ? inr(e.credit) : "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.text1 }}>{inr(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("vouchers");

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: "9px 20px", border: "none", background: "none",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
      color: tab === t ? T.primary : T.text3,
      borderBottom: tab === t ? `2px solid ${T.primary}` : "2px solid transparent",
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <PageHeader title="Accounting" />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        {tabBtn("vouchers",    "Vouchers")}
        {tabBtn("outstanding", "Outstanding")}
        {tabBtn("ledger",      "Ledger")}
      </div>

      {tab === "vouchers"    && <VouchersTab />}
      {tab === "outstanding" && <OutstandingTab />}
      {tab === "ledger"      && <LedgerTab />}
    </div>
  );
}
