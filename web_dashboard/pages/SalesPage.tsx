// src/pages/SalesPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconBox, IconMoney, IconBank, IconFile, IconUpload, IconUser } from "../components/Icons";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft:     { color: T.text3,  bg: "#f8fafc"  },
  confirmed: { color: T.primary, bg: "#eff6ff" },
  dispatched:{ color: T.amber,  bg: T.amberBg  },
  delivered: { color: T.green,  bg: T.greenBg  },
  cancelled: { color: T.red,    bg: T.redBg    },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { color: T.text3, bg: "#f8fafc" };
  return <span style={badge(s.color, s.bg)}>{status?.toUpperCase()}</span>;
}

// ── KPI row ───────────────────────────────────────────────────────────────────
function SalesKpis() {
  const { data } = useQuery({
    queryKey: ["sales-kpis"],
    queryFn: () => api.get("/sales/orders", { params: { limit: 500 } }).then(r => r.data).catch(() => ({ items: [] })),
  });
  const orders = data?.items || [];
  const totalValue    = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const totalReceivable = orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.outstanding || 0), 0);
  const monthCount    = orders.filter((o: any) => {
    const d = new Date(o.order_date || "");
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
      {[
        { label: "Total Orders",      value: String(orders.length), icon: <IconBox size={22} color={T.primary} />,   color: T.primary },
        { label: "Order Value",       value: inr(totalValue),       icon: <IconMoney size={22} color={T.green} />,  color: T.green  },
        { label: "Total Receivable",  value: inr(totalReceivable),  icon: <IconBank size={22} color={T.amber} />,   color: T.amber  },
        { label: "Invoices (Month)",  value: String(monthCount),    icon: <IconFile size={22} color={T.purple} />,  color: T.purple },
      ].map(k => (
        <div key={k.label} style={cardStyle({ padding: "18px 20px", flex: 1 })}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>{k.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["sales-orders", status],
    queryFn: () => api.get("/sales/orders", {
      params: { ...(status ? { status } : {}), limit: 100 }
    }).then(r => r.data).catch(() => ({ items: [] })),
  });
  const orders = data?.items || [];

  const filterBtn = (s: string, label: string) => (
    <button key={s} onClick={() => setStatus(s)} style={{
      padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${status === s ? T.primary : T.border}`,
      background: status === s ? T.primary : "#fff",
      color: status === s ? "#fff" : T.text3,
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {filterBtn("", "All")}
        {filterBtn("draft", "Draft")}
        {filterBtn("confirmed", "Confirmed")}
        {filterBtn("dispatched", "Dispatched")}
        {filterBtn("delivered", "Delivered")}
        {filterBtn("cancelled", "Cancelled")}
      </div>
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}><IconBox size={40} color={T.border} /></div>
            No sales orders found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Order No.", "Customer", "Date", "Delivery Date", "PO Number", "Amount", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{o.order_number}</td>
                  <td style={{ ...tdStyle, color: T.text1 }}>{o.customer_name || "—"}</td>
                  <td style={tdStyle}>{o.order_date?.slice(0, 10) || "—"}</td>
                  <td style={tdStyle}>{o.delivery_date?.slice(0, 10) || "—"}</td>
                  <td style={{ ...tdStyle, color: T.text3 }}>{o.po_number || "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.text1 }}>{inr(o.total_amount)}</td>
                  <td style={tdStyle}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────────────
function InvoicesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-invoices"],
    queryFn: () => api.get("/accounting/vouchers", { params: { voucher_type: "sales", limit: 100 } }).then(r => r.data),
  });
  const invoices = data?.items || [];

  return (
    <div style={cardStyle({ overflow: "hidden" })}>
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          No sales invoices found
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Invoice No.", "Party", "Date", "Amount", "Tally"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {invoices.map((v: any) => (
              <tr key={v.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                <td style={{ ...tdStyle, color: T.text1 }}>{v.party_name || "—"}</td>
                <td style={tdStyle}>{v.voucher_date}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{inr(v.total)}</td>
                <td style={tdStyle}>
                  <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                    {v.tally_synced ? "✓ Synced" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Outstanding Tab ───────────────────────────────────────────────────────────
function OutstandingTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["outstanding-customers"],
    queryFn: () => api.get("/accounting/outstanding", { params: { party_type: "customer", limit: 100 } }).then(r => r.data),
  });
  const items = data?.items || [];
  const total = items.reduce((s: number, p: any) => s + Number(p.receivable || 0), 0);

  return (
    <div>
      {total > 0 && (
        <div style={{ ...cardStyle({ padding: "16px 20px", marginBottom: 18 }), display: "flex", alignItems: "center", gap: 16 }}>
          <IconUpload size={24} color={T.green} />
          <div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: "uppercase" }}>Total Receivable</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.green }}>{inr(total)}</div>
          </div>
        </div>
      )}
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3 }}>No outstanding receivables</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Customer", "Invoices", "Receivable", "Aging", "Days Overdue"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((p: any, i: number) => (
                <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: T.text1 }}>{p.party_name}</td>
                  <td style={tdStyle}>{p.invoice_count}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{inr(p.receivable)}</td>
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

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = "orders" | "invoices" | "outstanding";

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>Sales</h1>
      </div>

      <SalesKpis />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 22 }}>
        {(["orders", "invoices", "outstanding"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 20px", border: "none", background: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            color: tab === t ? T.primary : T.text3,
            borderBottom: tab === t ? `2px solid ${T.primary}` : "2px solid transparent",
            textTransform: "capitalize", transition: "all 0.15s",
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "orders"      && <OrdersTab />}
      {tab === "invoices"    && <InvoicesTab />}
      {tab === "outstanding" && <OutstandingTab />}
    </div>
  );
}
