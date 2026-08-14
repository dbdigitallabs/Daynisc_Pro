// src/pages/PurchasePage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconCart, IconMoney, IconFile, IconClock } from "../components/Icons";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:   { color: T.amber,  bg: T.amberBg  },
  approved:  { color: T.primary, bg: "#eff6ff" },
  received:  { color: T.green,  bg: T.greenBg  },
  cancelled: { color: T.red,    bg: T.redBg    },
};

export default function PurchasePage() {
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", status],
    queryFn: () => api.get("/purchase/orders", {
      params: { ...(status ? { status } : {}), limit: 100 }
    }).then(r => r.data).catch(() => ({ items: [], kpis: {} })),
  });

  const { data: vouData } = useQuery({
    queryKey: ["purchase-invoices"],
    queryFn: () => api.get("/accounting/vouchers", { params: { voucher_type: "purchase", limit: 500 } }).then(r => r.data),
  });

  const orders   = data?.items || [];
  const vouchers = vouData?.items || [];
  const totalPO  = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const totalInv = vouchers.reduce((s: number, v: any) => s + Number(v.total || 0), 0);
  const pending  = orders.filter((o: any) => o.status === "pending").length;

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Premium Breadcrumbs & Actions Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: T.text3, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span>Dashboard</span>
            <span>&gt;</span>
            <span>Purchase</span>
            <span>&gt;</span>
            <span style={{ fontWeight: 600, color: T.primary }}>{status ? `Filtered: ${status}` : "All Orders"}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>Purchase Operations</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "7px 14px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span>+ Create PO</span>
          </button>
          <button style={{ padding: "7px 12px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.text2, cursor: "pointer" }}>
            Import
          </button>
          <button style={{ padding: "7px 12px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.text2, cursor: "pointer" }}>
            Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Total Orders",   value: String(orders.length), icon: <IconCart size={16} color={T.primary} />,  color: T.primary },
          { label: "Total PO Value", value: inr(totalPO),          icon: <IconMoney size={16} color={T.amber} />,   color: T.amber  },
          { label: "Invoiced Value", value: inr(totalInv),         icon: <IconFile size={16} color={T.green} />,    color: T.green  },
          { label: "Pending GRN",    value: String(pending),       icon: <IconClock size={16} color={T.red} />,     color: T.red    },
        ].map(k => (
          <div key={k.label} style={cardStyle({ padding: "10px 14px", flex: 1, minWidth: 140 })}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span>{k.icon}</span>
              <span style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, letterSpacing: "-0.5px" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["received", "Received"], ["cancelled", "Cancelled"]].map(([s, l]) => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${status === s ? T.primary : T.border}`,
            background: status === s ? T.primary : "#fff",
            color: status === s ? "#fff" : T.text3, transition: "all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading purchase orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}><IconCart size={40} color={T.border} /></div>
            No purchase orders found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["PO Number", "Supplier", "Date", "Expected", "Amount", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const sc = STATUS_COLORS[o.status] || { color: T.text3, bg: "#f8fafc" };
                return (
                  <tr key={o.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{o.po_number || o.order_number}</td>
                    <td style={{ ...tdStyle, color: T.text1 }}>{o.supplier_name || o.party_name || "—"}</td>
                    <td style={tdStyle}>{o.order_date?.slice(0, 10) || "—"}</td>
                    <td style={tdStyle}>{o.expected_date?.slice(0, 10) || "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.text1 }}>{inr(o.total_amount)}</td>
                    <td style={tdStyle}><span style={badge(sc.color, sc.bg)}>{o.status?.toUpperCase()}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Purchase Invoices */}
      {vouchers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Purchase Invoices (AI Extracted)</h2>
          <div style={cardStyle({ overflow: "hidden" })}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Invoice No.", "Party", "Date", "Amount", "Tally"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vouchers.map((v: any) => (
                  <tr key={v.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                    <td style={{ ...tdStyle, color: T.text1 }}>{v.party_name || "—"}</td>
                    <td style={tdStyle}>{v.voucher_date}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.amber }}>{inr(v.total)}</td>
                    <td style={tdStyle}>
                      <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                        {v.tally_synced ? "✓ Synced" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
